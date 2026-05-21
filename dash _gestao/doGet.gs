/**
 * ══════════════════════════════════════════════════════════════════
 *  SISTEMA PROFISSÃO PET 2026 — v2.0 (GERENCIAL BI)
 *  Instituto Impacto Criativo
 *  Endpoint duplo: membros + socioeconômico
 *  Deploy como: Web App > Acesso: Qualquer pessoa
 * ══════════════════════════════════════════════════════════════════
 */

const CONFIG = {
  SS_ID: "1e2MfXxnGHnkifeh-uJiRrSYuI8rxbp-GCdWvNpj-lgI",

  // Aba community_members — índices baseados em 0 (coluna A = 0)
  MEMBROS: {
    ABA:     "community_members",
    NOME:    1,   // B
    EMAIL:   2,   // C
    CPF:     7,   // H — ajuste se diferente
    ARRASAS: 10,  // K
    BADGE:   11,  // L
    XP:      13,  // N
  },

  // Aba Socioeconomico — índices baseados em 0 (coluna A = 0)
  SOCIO: {
    ABA:           "Socioeconomico",
    DATA:          0,   // A
    CPF:           1,   // B
    NIS:           2,   // C
    GENERO:        3,   // D
    RACA:          4,   // E
    ORIENTACAO:    5,   // F
    ESTADO_CIVIL:  6,   // G
    FILHOS:        7,   // H
    QUANTOS:       8,   // I
    ESCOLARIDADE:  9,   // J
    OCUPACAO:      10,  // K
    TRABALHANDO:   11,  // L
    GANHOS:        12,  // M
    PESSOAS_DOM:   13,  // N  — "Pessoas que moram na mesma casa"
  },

  // Aba Log — para checar quem fez o socioeconômico via log
  LOG: {
    ABA:   "Log",
    TIPO:  3,  // D
    CPF:   6,  // G
    EMAIL: 7,  // H
  }
};

// ══════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ══════════════════════════════════════════════════════════════════
function doGet(e) {
  try {
    const callback = e.parameter.callback || "";
    const endpoint = (e.parameter.endpoint || "membros").toLowerCase();

    if (endpoint === "socioeconomico") {
      return responder(getDadosSocio(), callback);
    } else {
      return responder(getDadosMembros(), callback);
    }

  } catch (err) {
    return responder({ erro: err.toString() }, e.parameter.callback || "");
  }
}

// ══════════════════════════════════════════════════════════════════
//  ENDPOINT 1: MEMBROS (community_members + verificação socio via Log)
// ══════════════════════════════════════════════════════════════════
function getDadosMembros() {
  const ss = SpreadsheetApp.openById(CONFIG.SS_ID);
  const sheetMembros = ss.getSheetByName(CONFIG.MEMBROS.ABA);
  if (!sheetMembros) return { erro: "Aba '" + CONFIG.MEMBROS.ABA + "' não encontrada." };

  const sheetLog = ss.getSheetByName(CONFIG.LOG.ABA);
  const dataLog  = sheetLog ? sheetLog.getDataRange().getValues() : [];

  // Pré-processa o Log em um Set para busca O(1)
  const socioSet = new Set();
  dataLog.forEach(r => {
    const tipo = String(r[CONFIG.LOG.TIPO] || "").toLowerCase().trim();
    if (tipo !== "socioeconomico") return;
    const cpf   = limparCpf(r[CONFIG.LOG.CPF]);
    const email = String(r[CONFIG.LOG.EMAIL] || "").toLowerCase().trim();
    if (cpf)   socioSet.add("cpf:" + cpf);
    if (email) socioSet.add("email:" + email);
  });

  const dataMembros = sheetMembros.getDataRange().getValues();
  const lista = [];

  for (let i = 1; i < dataMembros.length; i++) {
    const linha = dataMembros[i];
    const nome  = String(linha[CONFIG.MEMBROS.NOME] || "").trim();
    if (!nome) continue;

    const cpf   = limparCpf(linha[CONFIG.MEMBROS.CPF]);
    const email = String(linha[CONFIG.MEMBROS.EMAIL] || "").toLowerCase().trim();
    const possuiSocio =
      (cpf   && socioSet.has("cpf:" + cpf)) ||
      (email && socioSet.has("email:" + email));

    lista.push({
      nome:          nome,
      email:         email,
      arrasas:       Number(linha[CONFIG.MEMBROS.ARRASAS]) || 0,
      badge:         String(linha[CONFIG.MEMBROS.BADGE]  || " ").trim(),
      xp:            Number(linha[CONFIG.MEMBROS.XP])     || 0,
      socioeconomico: possuiSocio
    });
  }

  return lista;
}

// ══════════════════════════════════════════════════════════════════
//  ENDPOINT 2: SOCIOECONÔMICO (aba Socioeconomico)
// ══════════════════════════════════════════════════════════════════
function getDadosSocio() {
  const ss = SpreadsheetApp.openById(CONFIG.SS_ID);
  const sheet = ss.getSheetByName(CONFIG.SOCIO.ABA);
  if (!sheet) return { erro: "Aba '" + CONFIG.SOCIO.ABA + "' não encontrada." };

  const data  = sheet.getDataRange().getValues();
  const lista = [];

  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    // Pula linhas sem CPF
    if (!r[CONFIG.SOCIO.CPF]) continue;

    lista.push({
      cpf:            limparCpf(r[CONFIG.SOCIO.CPF]),
      genero:         normalizar(r[CONFIG.SOCIO.GENERO]),
      raca:           normalizar(r[CONFIG.SOCIO.RACA]),
      orientacao:     normalizar(r[CONFIG.SOCIO.ORIENTACAO]),
      estadoCivil:    normalizar(r[CONFIG.SOCIO.ESTADO_CIVIL]),
      filhos:         normalizar(r[CONFIG.SOCIO.FILHOS]),
      quantosFilhos:  Number(r[CONFIG.SOCIO.QUANTOS]) || 0,
      escolaridade:   normalizar(r[CONFIG.SOCIO.ESCOLARIDADE]),
      ocupacao:       normalizar(r[CONFIG.SOCIO.OCUPACAO]),
      trabalhando:    temValor(r[CONFIG.SOCIO.TRABALHANDO]),
      ganhos:         normalizar(r[CONFIG.SOCIO.GANHOS]),
      pessoasDomicilio: Number(r[CONFIG.SOCIO.PESSOAS_DOM]) || null
    });
  }

  return lista;
}

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════
function responder(data, cb) {
  const json = JSON.stringify(data);
  if (cb) {
    return ContentService
      .createTextOutput(cb + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON)
    .addHeader("Access-Control-Allow-Origin", "*");
}

function limparCpf(val) {
  return String(val || "").replace(/\D/g, "").trim();
}

function normalizar(val) {
  const s = String(val || "").trim();
  return s || null;
}

function temValor(val) {
  const s = String(val || "").toLowerCase().trim();
  return s === "sim" || s === "yes" || s === "true" || s === "1" || (s.length > 0 && s !== "não" && s !== "nao" && s !== "no" && s !== "false");
}