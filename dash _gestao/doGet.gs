/**
 * ══════════════════════════════════════════════════════════════════
 *  SISTEMA PROFISSÃO PET 2026 — v2.0 (PAINEL GERENCIAL) - Estrutura Clássica
 *  Instituto Impacto Criativo
 *  Endpoints: membros, socioeconomico, config
 *  Deploy como: Web App > Acesso: Qualquer pessoa
 * ══════════════════════════════════════════════════════════════════
 */

const CONFIG = {
  SS_ID: "1e2MfXxnGHnkifeh-uJiRrSYuI8rxbp-GCdWvNpj-lgI",

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
  
  CONFIG: {
    ABA: "Config",
    CODIGO: 0,
    VALOR: 1,
    DESCRICAO: 2,
    FASE: 3,
    HORAS: 4,
    TIPO: 5
  }
  ,
  LOG: {
    ABA: "Log"
    // As colunas serão lidas dinamicamente pelos cabeçalhos
  }
};

// ══════════════════════════════════════════════════════════════════
//  ROTEADOR PRINCIPAL (PONTO DE ENTRADA)
// ══════════════════════════════════════════════════════════════════
function doGet(e) {
  try {
    const callback = e.parameter.callback || "";
    const endpoint = (e.parameter.endpoint || "membros").toLowerCase();

    if (endpoint === "socioeconomico") {
      return responder_(getDadosSocio_(), callback);
    } else if (endpoint === "config") {
      return responder_(getDadosConfig_(), callback);
    } else if (endpoint === "log") {
      return responder_(getDadosLog_(), callback);
    } else {
      return responder_(getDadosMembros_(), callback);
    }

  } catch (err) {
    return responder_({ error: err.toString() }, e.parameter.callback || "");
  }
}

// ══════════════════════════════════════════════════════════════════
//  BUSCA DE DADOS: MEMBROS
// ══════════════════════════════════════════════════════════════════
function getDadosMembros_() {
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
      cpf:           limparCpf_(linha[CONFIG.MEMBROS.CPF]),
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
//  BUSCA DE DADOS: SOCIOECONÔMICO
// ══════════════════════════════════════════════════════════════════
function getDadosSocio_() {
  const ss = SpreadsheetApp.openById(CONFIG.SS_ID);
  const sheet = ss.getSheetByName(CONFIG.SOCIO.ABA);
  if (!sheet) return { erro: "Aba '" + CONFIG.SOCIO.ABA + "' não encontrada." };

  const data  = sheet.getDataRange().getValues();
  const lista = [];

  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (!r[CONFIG.SOCIO.CPF]) continue;

    lista.push({
      cpf:            limparCpf_(r[CONFIG.SOCIO.CPF]),
      nis:            normalizar_(r[CONFIG.SOCIO.NIS]),
      genero:         normalizar_(r[CONFIG.SOCIO.GENERO]),
      raca:           normalizar_(r[CONFIG.SOCIO.RACA]),
      orientacao:     normalizar_(r[CONFIG.SOCIO.ORIENTACAO]),
      estadoCivil:    normalizar_(r[CONFIG.SOCIO.ESTADO_CIVIL]),
      filhos:         normalizar_(r[CONFIG.SOCIO.FILHOS]),
      quantosFilhos:  Number(r[CONFIG.SOCIO.QUANTOS]) || 0,
      escolaridade:   normalizar_(r[CONFIG.SOCIO.ESCOLARIDADE]),
      ocupacao:       normalizar_(r[CONFIG.SOCIO.OCUPACAO]),
      trabalhando:    temValor_(r[CONFIG.SOCIO.TRABALHANDO]),
      ganhos:         normalizar_(r[CONFIG.SOCIO.GANHOS]),
      pessoasDomicilio: Number(r[CONFIG.SOCIO.PESSOAS_DOM]) || null,
      orgFinanceira:  normalizar_(r[CONFIG.SOCIO.ORG_FIN]),
      rendaExtra:     normalizar_(r[CONFIG.SOCIO.RENDA_EXTRA]),
      rendaExtraOque: normalizar_(r[CONFIG.SOCIO.RENDA_EXTRA_OQ]),
      maioresGastos:  normalizar_(r[CONFIG.SOCIO.GASTOS]),
      interesse:      normalizar_(r[CONFIG.SOCIO.INTERESSE]),
      horario:        normalizar_(r[CONFIG.SOCIO.HORARIO]),
      indicacao:      normalizar_(r[CONFIG.SOCIO.INDICACAO]),
      motivacao:      normalizar_(r[CONFIG.SOCIO.MOTIVACAO]),
      situacaoProf:   normalizar_(r[CONFIG.SOCIO.SITUACAO_PROF]),
    });
  }

  return lista;
}

// ══════════════════════════════════════════════════════════════════
//  BUSCA DE DADOS: CONFIG
// ══════════════════════════════════════════════════════════════════
function getDadosConfig_() {
  const ss = SpreadsheetApp.openById(CONFIG.SS_ID);
  const sheet = ss.getSheetByName(CONFIG.CONFIG.ABA);
  if (!sheet) return { erro: "Aba '" + CONFIG.CONFIG.ABA + "' não encontrada." };

  const data = sheet.getDataRange().getValues();
  const lista = [];

  // Começa em i = 1 para pular a linha do cabeçalho
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (!r[CONFIG.CONFIG.CODIGO]) continue; // Pula linhas sem código

    lista.push({
      'Codigo': r[CONFIG.CONFIG.CODIGO],
      'Valor': r[CONFIG.CONFIG.VALOR],
      'Descrição': r[CONFIG.CONFIG.DESCRICAO],
      'Fase pedagogica': r[CONFIG.CONFIG.FASE],
      'Horas': r[CONFIG.CONFIG.HORAS],
      'Tipo': r[CONFIG.CONFIG.TIPO]
    });
  }
  return lista;
}

// ══════════════════════════════════════════════════════════════════
//  BUSCA DE DADOS: LOG
// ══════════════════════════════════════════════════════════════════
function getDadosLog_() {
  const ss = SpreadsheetApp.openById(CONFIG.SS_ID);
  const sheet = ss.getSheetByName(CONFIG.LOG.ABA);
  if (!sheet) return { erro: "Aba '" + CONFIG.LOG.ABA + "' não encontrada." };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const lista = [];

  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    let rowObject = {};
    for (let j = 0; j < headers.length; j++) {
      rowObject[headers[j]] = r[j];
    }
    lista.push(rowObject);
  }
  return lista;
}

// ══════════════════════════════════════════════════════════════════
//  FUNÇÕES AUXILIARES (HELPERS)
// ══════════════════════════════════════════════════════════════════
function responder_(data, cb) {
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

function limparCpf_(val) {
  return String(val || "").replace(/\D/g, "").trim();
}

function normalizar_(val) {
  const s = String(val || "").trim();
  return s || null;
}

function temValor_(val) {
  const s = String(val || "").toLowerCase().trim();
  return s === "sim" || s === "yes" || s === "true" || s === "1" || (s.length > 0 && s !== "não" && s !== "nao" && s !== "no" && s !== "false");
}

// ══════════════════════════════════════════════════════════════════
//  PONTO DE ENTRADA PARA ESCRITA DE DADOS (requisições POST)
// ══════════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const endpoint = payload.endpoint;
    const data = payload.data;

    if (endpoint === 'config') {
      updateConfigSheet_(data);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("Endpoint de POST inválido.");

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateConfigSheet_(data) {
  const sheet = SpreadsheetApp.openById(CONFIG.SS_ID).getSheetByName(CONFIG.CONFIG.ABA);
  if (!sheet) throw new Error("Aba 'Config' não encontrada.");

  // Prepara os dados para serem escritos na planilha (formato: array de arrays)
  const headers = ['Codigo', 'Valor', 'Descrição', 'Fase pedagogica', 'Horas', 'Tipo'];
  const dataArray = data.map(row => headers.map(header => row[header]));

  // Limpa a planilha (exceto a linha do cabeçalho) e escreve os novos dados
  sheet.getRange(2, 1, sheet.getMaxRows() - 1, sheet.getMaxColumns()).clearContent();
  if (dataArray.length > 0) {
    sheet.getRange(2, 1, dataArray.length, headers.length).setValues(dataArray);
  }
}