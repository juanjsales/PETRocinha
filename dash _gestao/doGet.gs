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
    ID:      0,   // A
    NOME:    1,   // B
    EMAIL:   2,   // C
    IMG_URL: 3,   // D
    CRIADO_EM: 4, // E
    ULTIMA_VISITA: 5, // F
    TAGS:    6,   // G
    CPF:     7,   // H — ajuste se diferente
    WPP:     8,   // I
    NASC:    9,   // J — Data de Nascimento
    ARRASAS: 10,  // K
    BADGE:   11,  // L
    ALERTAS: 12,  // M
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
    ORG_FIN:       14,  // O
    RENDA_EXTRA:   15,  // P
    RENDA_EXTRA_OQ:16,  // Q
    GASTOS:        17,  // R
    INTERESSE:     18,  // S
    HORARIO:       19,  // T
    INDICACAO:     20,  // U
    MOTIVACAO:     21,  // V
    SITUACAO_PROF: 25,  // Z
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
 
  const dataMembros = sheetMembros.getDataRange().getValues();
  const lista = [];
 
  for (let i = 1; i < dataMembros.length; i++) {
    const linha = dataMembros[i];
    const nome  = String(linha[CONFIG.MEMBROS.NOME] || "").trim();
    if (!nome) continue;
 
    lista.push({
      id:            String(linha[CONFIG.MEMBROS.ID] || "").trim(),
      nome:          nome,
      email:         String(linha[CONFIG.MEMBROS.EMAIL] || "").toLowerCase().trim(),
      imgUrl:        String(linha[CONFIG.MEMBROS.IMG_URL] || "").trim(),
      criadoEm:      linha[CONFIG.MEMBROS.CRIADO_EM] instanceof Date ? linha[CONFIG.MEMBROS.CRIADO_EM].toISOString() : null,
      ultimaVisita:  linha[CONFIG.MEMBROS.ULTIMA_VISITA] instanceof Date ? linha[CONFIG.MEMBROS.ULTIMA_VISITA].toISOString() : null,
      tags:          String(linha[CONFIG.MEMBROS.TAGS] || "").trim(),
      cpf:           limparCpf(linha[CONFIG.MEMBROS.CPF]),
      wpp:           String(linha[CONFIG.MEMBROS.WPP] || "").trim(),
      nascimento:    linha[CONFIG.MEMBROS.NASC] instanceof Date ? linha[CONFIG.MEMBROS.NASC].toISOString() : null,
      arrasas:       Number(linha[CONFIG.MEMBROS.ARRASAS]) || 0,
      badge:         String(linha[CONFIG.MEMBROS.BADGE]  || " ").trim(),
      alertas:       String(linha[CONFIG.MEMBROS.ALERTAS] || "").trim(),
      xp:            Number(linha[CONFIG.MEMBROS.XP])     || 0,
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
      nis:            normalizar(r[CONFIG.SOCIO.NIS]),
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
      pessoasDomicilio: Number(r[CONFIG.SOCIO.PESSOAS_DOM]) || null,
      orgFinanceira:  normalizar(r[CONFIG.SOCIO.ORG_FIN]),
      rendaExtra:     normalizar(r[CONFIG.SOCIO.RENDA_EXTRA]),
      rendaExtraOque: normalizar(r[CONFIG.SOCIO.RENDA_EXTRA_OQ]),
      maioresGastos:  normalizar(r[CONFIG.SOCIO.GASTOS]),
      interesse:      normalizar(r[CONFIG.SOCIO.INTERESSE]),
      horario:        normalizar(r[CONFIG.SOCIO.HORARIO]),
      indicacao:      normalizar(r[CONFIG.SOCIO.INDICACAO]),
      motivacao:      normalizar(r[CONFIG.SOCIO.MOTIVACAO]),
      situacaoProf:   normalizar(r[CONFIG.SOCIO.SITUACAO_PROF]),
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