/**
 * ══════════════════════════════════════════════════════════════════
 *  SISTEMA PROFISSÃO PET 2026 — v2.0 (PAINEL GERENCIAL)
 * ══════════════════════════════════════════════════════════════════
 */

const CONFIG = {
  SS_ID: "1e2MfXxnGHnkifeh-uJiRrSYuI8rxbp-GCdWvNpj-lgI",

  MEMBROS: {
    ABA:     "community_members",
    ID:      0,   NOME:    1,   EMAIL:   2,   IMG_URL: 3,
    CRIADO_EM: 4, ULTIMA_VISITA: 5, TAGS:    6,   CPF:     7,
    WPP:     8,   NASC:    9,   ARRASAS: 10,  BADGE:   11,
    ALERTAS: 12,  XP:      13,  CEP:     14,
  },

  SOCIO: {
    ABA:           "Socioeconomico",
    DATA:          0,   CPF:           1,   NIS:           2,
    GENERO:        3,   RACA:          4,   ORIENTACAO:    5,
    ESTADO_CIVIL:  6,   FILHOS:        7,   QUANTOS:       8,
    ESCOLARIDADE:  9,   OCUPACAO:      10,  TRABALHANDO:   11,
    GANHOS:        12,  PESSOAS_DOM:   13,  ORG_FIN:       14,
    RENDA_EXTRA:   15,  RENDA_EXTRA_OQ:16,  GASTOS:        17,
    INTERESSE:     18,  HORARIO:       19,  INDICACAO:     20,
    MOTIVACAO:     21,  SITUACAO_PROF: 25,
  },
  
  CONFIG: {
    ABA: "Config",
    CODIGO: 0, VALOR: 1, DESCRICAO: 2, FASE: 3, HORAS: 4, TIPO: 5
  },
  
  LOG: { ABA: "Log" },
  PRESENCAS: { ABA: "Lista de Presença" }
};

function doGet(e) {
  try {
    const callback = e.parameter.callback || "";
    const email = e.parameter.email || "";
    const pin = e.parameter.pin || "";

    // Validação de segurança admin
    if (!isAuthorized_(email, pin)) {
      return responder_({ erro: "Acesso negado. Apenas administradores autorizados." }, callback);
    }

    const endpoint = (e.parameter.endpoint || "membros").toLowerCase();

    if (endpoint === "all") {
      return responder_({
        membros: getDadosMembros_(),
        socio:   getDadosSocio_(),
        config:  getDadosConfig_(),
        log:     getDadosLog_(),
        presencas: getDadosPresencas_()
      }, callback);
    } else if (endpoint === "socioeconomico") {
      return responder_(getDadosSocio_(), callback);
    } else if (endpoint === "config") {
      return responder_(getDadosConfig_(), callback);
    } else if (endpoint === "log") {
      return responder_(getDadosLog_(), callback);
    } else if (endpoint === "presencas") {
      return responder_(getDadosPresencas_(), callback);
    } else {
      return responder_(getDadosMembros_(), callback);
    }
  } catch (err) {
    return responder_({ erro: err.toString() }, e.parameter.callback || "");
  }
}

function getDadosMembros_() {
  const ss = SpreadsheetApp.openById(CONFIG.SS_ID);
  const sheet = ss.getSheetByName(CONFIG.MEMBROS.ABA);
  if (!sheet) return { erro: "Aba '" + CONFIG.MEMBROS.ABA + "' não encontrada." };
 
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Trava de segurança para aba vazia

  const lista = [];
  for (let i = 1; i < data.length; i++) {
    const linha = data[i];
    const nome  = String(linha[CONFIG.MEMBROS.NOME] || "").trim();
    if (!nome || nome === "undefined") continue;

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
      cep:           String(linha[CONFIG.MEMBROS.CEP] || "").trim(),
    });
  }
  return lista;
}

function getDadosSocio_() {
  const ss = SpreadsheetApp.openById(CONFIG.SS_ID);
  const sheet = ss.getSheetByName(CONFIG.SOCIO.ABA);
  if (!sheet) return { erro: "Aba '" + CONFIG.SOCIO.ABA + "' não encontrada." };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

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

function getDadosConfig_() {
  const ss = SpreadsheetApp.openById(CONFIG.SS_ID);
  const sheet = ss.getSheetByName(CONFIG.CONFIG.ABA);
  if (!sheet) return { erro: "Aba '" + CONFIG.CONFIG.ABA + "' não encontrada." };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const lista = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (!r[CONFIG.CONFIG.CODIGO]) continue; 

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

function getDadosLog_() {
  const ss = SpreadsheetApp.openById(CONFIG.SS_ID);
  const sheet = ss.getSheetByName(CONFIG.LOG.ABA);
  if (!sheet) return { erro: "Aba '" + CONFIG.LOG.ABA + "' não encontrada." };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Evita erro se não houver cabeçalhos

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

function getDadosPresencas_() {
  const ss = SpreadsheetApp.openById(CONFIG.SS_ID);
  const sheet = ss.getSheetByName(CONFIG.PRESENCAS.ABA);
  if (!sheet) return { erro: "Aba '" + CONFIG.PRESENCAS.ABA + "' não encontrada." };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

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

function responder_(data, cb) {
  const json = JSON.stringify(data);
  if (cb) {
    return ContentService
      .createTextOutput(cb + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function limparCpf_(val) {
  if (val == null) return "";
  return String(val).replace(/\D/g, "").trim();
}

function normalizar_(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s || null;
}

function temValor_(val) {
  if (val == null) return false;
  const s = String(val).toLowerCase().trim();
  return s === "sim" || s === "yes" || s === "true" || s === "1" || (s.length > 0 && s !== "não" && s !== "nao" && s !== "no" && s !== "false");
}

function isAuthorized_(email, pin) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SS_ID);
    const sheet = ss.getSheetByName(CONFIG.CONFIG.ABA);
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    
    let adminEmails = ["profissaopet@j3lab.com.br"]; // Fallback padrão
    let adminPin = "123456"; // Fallback padrão
    
    for (let i = 1; i < data.length; i++) {
      const cod = String(data[i][CONFIG.CONFIG.CODIGO]).trim();
      const val = String(data[i][CONFIG.CONFIG.VALOR]).trim();
      if (cod === "ADMIN_EMAILS" && val) {
        adminEmails = val.toLowerCase().split(",").map(e => e.trim());
      } else if (cod === "ADMIN_PIN" && val) {
        adminPin = val;
      }
    }

    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      if (adminEmails.indexOf(cleanEmail) !== -1) {
        return true;
      }
    }

    if (pin) {
      if (String(pin).trim() === adminPin) {
        return true;
      }
    }
  } catch (err) {
    // Em caso de erro ao abrir planilha na verificação, falha por segurança
    console.error("Erro na validação isAuthorized_: " + err.toString());
  }
  return false;
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const endpoint = payload.endpoint;
    const data = payload.data;
    const email = payload.email || "";
    const pin = payload.pin || "";

    if (!isAuthorized_(email, pin)) {
      throw new Error("Acesso negado. Ação não autorizada.");
    }

    if (endpoint === 'config') {
      updateConfigSheet_(data);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
    if (endpoint === 'presencas') {
      appendPresencas_(data);
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

  const headers = ['Codigo', 'Valor', 'Descrição', 'Fase pedagogica', 'Horas', 'Tipo'];
  const dataArray = data.map(row => headers.map(header => row[header]));

  const maxRows = sheet.getMaxRows();
  if (maxRows > 1) {
    sheet.getRange(2, 1, maxRows - 1, sheet.getMaxColumns()).clearContent();
  }
  
  if (dataArray.length > 0) {
    sheet.getRange(2, 1, dataArray.length, headers.length).setValues(dataArray);
  }
}

function appendPresencas_(data) {
  const sheet = SpreadsheetApp.openById(CONFIG.SS_ID).getSheetByName(CONFIG.PRESENCAS.ABA);
  if (!sheet) throw new Error("Aba '" + CONFIG.PRESENCAS.ABA + "' não encontrada.");

  const headers = ['Data do registro', 'Evento', 'Nome', 'Email', 'CPF', 'Celular', 'Localidade', 'Perfil', 'Classificação', 'Comentario Geral', 'Conteudo', 'Comentario conteudo', 'Estrutura', 'Comentario estrutura'];
  
  const rows = data.map(row => headers.map(header => row[header] || ""));
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  }
}
