/**
 * SISTEMA PROFISSÃO PET 2026 - v6.0
 * Backend Unificado com ID de Planilha e Classes de Serviço
 */

// 1. CONFIGURAÇÕES GLOBAIS (O ID DA SUA PLANILHA ESTÁ AQUI)
const CONFIG = {
  SS_ID: "1e2MfXxnGHnkifeh-uJiRrSYuI8rxbp-GCdWvNpj-lgI", // <-- O ID que você me passou
  SECURITY_TOKEN: "PET_ROCINHA_2026_SECRET",
  COLUNAS_MEMBROS: {
    NOME: 1,      // B
    EMAIL: 2,     // C
    FOTO: 3,      // D
    CPF: 7,       // H
    ARRASAS: 10,  // K
    BADGE: 11,    // L
    NOTIF: 12,    // M
    XP: 13        // N
  },
  COLUNAS_LOG: {
    DATA: 0, TIPO: 3, CPF: 6, EMAIL: 7, PONTOS: 8, DESCRICAO: 9
  },
  COLUNAS_CONFIG: {
    TIPO: 0, VALOR1: 1, VALOR2: 2, VALOR3: 3, VALOR4: 4, VALOR5: 5
  },
  COLUNAS_RANKING: {
    NOME: 0, BADGE: 1, XP: 2
  }
};

// 2. FUNÇÃO PRINCIPAL (O DOGET)
function doGet(e) {
  const startTime = new Date().getTime();
  const db = new Database();
  const service = new AlunaService(db);
  
  let debugLog = { etapa: "Iniciando", params: e.parameter };
  
  try {
    const params = e.parameter;
    const callback = params.callback; 
    const action = params.action || params.acao;
    
    let alunaRel = null;

    // Busca por Email ou CPF
    if (params.email) {
      const email = decodeURIComponent(params.email).toLowerCase().trim();
      debugLog.emailParam = email;
      Logger.log("doGet: Email processado: [" + email + "]");
      alunaRel = service.buscarPorEmail(email);
      if (alunaRel) {
        Logger.log("doGet: Aluna encontrada por e-mail: [" + email + "]");
      } else {
        Logger.log("doGet: Aluna NÃO encontrada por e-mail: [" + email + "]");
      }
    } else if (params.cpf) {
      debugLog.cpfParam = params.cpf;
      Logger.log("doGet: CPF recebido: " + params.cpf); 
      alunaRel = service.buscarPorCPF(params.cpf);
    }

    if (!alunaRel) {
      debugLog.encontrado = false;
      Logger.log("doGet: Aluna não encontrada para os parâmetros: " + JSON.stringify(params)); 
      return Utils.responderCustom({ encontrado: false, erro: "Não encontrada.", debug: debugLog }, callback);
    }

    const perfil = alunaRel.dados;
    const indice = alunaRel.indice;
    debugLog.alunaEncontrada = perfil.email || perfil.cpf;

    // Processamento de Ações (Quiz/Notif)
    if (action) {
      let dadosAlterados = false;
      
      if (action === "logAcertoQuiz") {
        if (!service.verificarQuizHoje(perfil.cpf)) {
          const descLog = params.status === "acerto" ? "Acertou quiz: " + (params.pergunta || "") : "Errou quiz: " + (params.pergunta || "");
          db.appendLog([new Date(), "", perfil.nome, "quiz_diario", "Quiz Diário", "", perfil.cpf, perfil.email, params.pontos || 0, descLog]);
          perfil.arrasas += Number(params.pontos || 0);
          dadosAlterados = true;
        }
      } else if (action === "updateNotif") {
        const sheet = db.ss.getSheetByName("community_members");
        if (sheet && alunaRel.indice) {
          sheet.getRange(alunaRel.indice, CONFIG.COLUNAS_MEMBROS.NOTIF + 1).setValue(params.status);
          dadosAlterados = true;
        }
      }
      
      if (dadosAlterados) {
        service.limparCache(perfil.email); // Invalida o cache para os dados se atualizarem no refresh silencioso
      }
    }

    // 🚀 MODO WIDGET: Resposta leve e rápida, sem ler abas adicionais
    if (action === "widget") {
      const ultimoSaldo = parseInt(params.ultimoSaldo || 0);
      return Utils.responderCustom({
        encontrado: true,
        arrasas: perfil.arrasas,
        badge: perfil.badge || " ",
        socioeconomico: service.verificarSocioeconomico(perfil.cpf, perfil.email),
        festejar: (perfil.arrasas > ultimoSaldo)
      }, callback);
    }

    // Compilação Final
    const tLog = new Date().getTime();
    const historico = db.getHistorico(perfil.cpf, perfil.email);
    const tRank = new Date().getTime();
    const ranking = db.getRanking();
    const tFim = new Date().getTime();
    
    const quizDiario = IAService.obterQuizDiario();

    const dashboardData = {
      ...perfil,
      jaRespondeuQuiz: service.verificarQuizHoje(perfil.cpf),
      socioeconomico: service.verificarSocioeconomico(perfil.cpf, perfil.email),
      quizDiario: quizDiario,
      historico: historico,
      ranking: ranking,
      recompensas: db.getConfigs("RECOMPENSA"),
      proximoEvento: db.getSingleConfig("PROXIMO_EVENTO"),
      debug: { 
        ...debugLog, 
        tempoTotal: (tFim - startTime) + "ms",
        tempoHistorico: (tRank - tLog) + "ms",
        tempoRanking: (tFim - tRank) + "ms"
      }
    };

    return Utils.responderCustom(dashboardData, callback);

  } catch (error) {
    debugLog.erroCatch = error.toString();
    return Utils.responderCustom({ encontrado: false, erro: error.toString(), debug: debugLog }, e.parameter.callback);
  }
}

// 3. CLASSES DE SUPORTE (DATABASE E SERVIÇO)
class Database {
  constructor() {
    this.ss = SpreadsheetApp.openById(CONFIG.SS_ID);
  }

  getSheetData(nomeAba) {
    const sheet = this.ss.getSheetByName(nomeAba);
    if (!sheet) {
        Logger.log("Database: Aba '" + nomeAba + "' não encontrada.");
        return [];
    }
    return sheet.getDataRange().getValues();
  }

  appendLog(dados) {
    const sheet = this.ss.getSheetByName("Log");
    if (sheet) sheet.appendRow(dados);
  }

  getHistorico(cpf, email) {
    const logs = this.getSheetData("Log");
    if (!logs || logs.length === 0) return [];
    
    const historico = [];
    const targetCpf = cpf ? String(cpf).replace(/\D/g, "") : "";
    const targetEmail = email ? String(email).toLowerCase() : "";

    // Itera de trás para frente para pegar os 15 mais recentes com máxima performance
    for (let i = logs.length - 1; i >= 0; i--) {
      const r = logs[i];
      if (!r) continue;
      
      const rowCpf = String(r[CONFIG.COLUNAS_LOG.CPF] || "").replace(/\D/g, "");
      const rowEmail = String(r[CONFIG.COLUNAS_LOG.EMAIL] || "").toLowerCase();

      if ((targetCpf && rowCpf === targetCpf) || (targetEmail && rowEmail === targetEmail)) {
        historico.push({ data: Utils.formatarData(r[CONFIG.COLUNAS_LOG.DATA]), tipo: r[CONFIG.COLUNAS_LOG.TIPO], pontos: r[CONFIG.COLUNAS_LOG.PONTOS], descricao: r[CONFIG.COLUNAS_LOG.DESCRICAO] });
        if (historico.length >= 15) break;
      }
    }
    return historico;
  }

  getRanking() {
    const r = this.getSheetData("Ranking");
    if (!r || r.length <= 1) return [];
    // CORREÇÃO: Índices das colunas de ranking
    return r.slice(1).sort((a,b) => b[CONFIG.COLUNAS_RANKING.XP] - a[CONFIG.COLUNAS_RANKING.XP]).slice(0,10).map(x => ({ nome: x[CONFIG.COLUNAS_RANKING.NOME], badge: x[CONFIG.COLUNAS_RANKING.BADGE], xp: x[CONFIG.COLUNAS_RANKING.XP] }));
  }

  getConfigs(tipo) {
    const d = this.getSheetData("Config");
    if (!d || d.length === 0) return [];
    return d.filter(r => r[CONFIG.COLUNAS_CONFIG.TIPO] === tipo).map(r => ({ titulo: r[CONFIG.COLUNAS_CONFIG.VALOR1], desc: r[CONFIG.COLUNAS_CONFIG.VALOR2] }));
  }

  getSingleConfig(tipo) {
    const data = this.getSheetData("Config");
    if (!data) return "";
    const row = data.find(r => r[CONFIG.COLUNAS_CONFIG.TIPO] === tipo);
    return row ? row[CONFIG.COLUNAS_CONFIG.VALOR1] : "";
  }
}

class AlunaService {
  constructor(db) { this.db = db; }
  buscarPorEmail(email) {
    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail) return null;

    // Mudamos o nome da chave para limpar o cache corrompido antigo do Google
    const cacheKey = "aluna_email_v2_" + normalizedEmail.replace(/[^a-zA-Z0-9]/g, "_");
    const cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) {
      Logger.log("AlunaService: Dados de e-mail recuperados do cache para: " + normalizedEmail);
      return JSON.parse(cached);
    }

    const data = this.db.getSheetData("community_members");

    for (let i = 1; i < data.length; i++) {
      const linha = data[i];
      const currentEmail = String(linha[CONFIG.COLUNAS_MEMBROS.EMAIL] || "").toLowerCase().trim();
      
      // Log para debug de comparação
      if (i < 5) { // Log apenas para as primeiras linhas para não inundar o log
        Logger.log("AlunaService: Comparando [" + normalizedEmail + "] com [" + currentEmail + "] na linha " + (i + 1));
      }

      if (currentEmail === normalizedEmail) {
        const result = this.format(linha, i + 1);
        CacheService.getScriptCache().put(cacheKey, JSON.stringify(result), 300);
        Logger.log("AlunaService: E-mail encontrado e cacheado: " + normalizedEmail);
        return result;
      }
    }

    Logger.log("AlunaService: E-mail não encontrado: [" + normalizedEmail + "]");
    return null;
  }

  limparCache(email) {
    if (!email) return;
    const normalizedEmail = String(email).toLowerCase().trim();
    const cacheKey = "aluna_email_v2_" + normalizedEmail.replace(/[^a-zA-Z0-9]/g, "_");
    CacheService.getScriptCache().remove(cacheKey);
  }

  buscarPorCPF(cpf) {
    if (!cpf) return null;
    const d = this.db.getSheetData("community_members");
    const targetCpf = String(cpf).replace(/\D/g,"");
    Logger.log("AlunaService: Buscando por CPF: " + targetCpf);
    
    for (let i=1; i<d.length; i++) {
      const currentCpf = String(d[i][CONFIG.COLUNAS_MEMBROS.CPF]).replace(/\D/g,"");
      if (currentCpf === targetCpf) {
        Logger.log("AlunaService: CPF encontrado na linha " + (i+1));
        return this.format(d[i], i+1);
      }
    }
    Logger.log("AlunaService: CPF não encontrado.");
    return null;
  }
  format(r, i) {
    // CORREÇÃO: Índices corretos para mapeamento da linha
    return { 
      indice: i, 
      dados: { 
        encontrado: true, 
        nome: r[CONFIG.COLUNAS_MEMBROS.NOME], 
        email: r[CONFIG.COLUNAS_MEMBROS.EMAIL], 
        foto: r[CONFIG.COLUNAS_MEMBROS.FOTO], 
        cpf: String(r[CONFIG.COLUNAS_MEMBROS.CPF]).replace(/\D/g,""), 
        arrasas: r[CONFIG.COLUNAS_MEMBROS.ARRASAS], 
        badge: r[CONFIG.COLUNAS_MEMBROS.BADGE], 
        xp: r[CONFIG.COLUNAS_MEMBROS.XP] 
      } 
    };
  }
  verificarQuizHoje(cpf) {
    const logs = this.db.getSheetData("Log");
    if (!logs) return false;
    const hoje = Utilities.formatDate(new Date(), "GMT-3", "dd/MM/yyyy");
    return logs.some(r => {
      if (!r || !r[CONFIG.COLUNAS_LOG.DATA]) return false;
      try {
        const dataLog = Utilities.formatDate(new Date(r[CONFIG.COLUNAS_LOG.DATA]), "GMT-3", "dd/MM/yyyy");
        const cpfLinha = String(r[CONFIG.COLUNAS_LOG.CPF]).replace(/\D/g,"");
        return cpfLinha === cpf && r[CONFIG.COLUNAS_LOG.TIPO] === "quiz_diario" && dataLog === hoje;
      } catch(e) { return false; }
    });
  }

  verificarSocioeconomico(cpf, email) {
    const logs = this.db.getSheetData("Log");
    if (!logs) return false;
    
    const targetCpf = cpf ? String(cpf).replace(/\D/g,"") : "";
    const targetEmail = email ? String(email).toLowerCase().trim() : "";

    return logs.some(r => {
      if (!r) return false;
      const tipo = String(r[CONFIG.COLUNAS_LOG.TIPO] || "").toLowerCase().trim();
      if (tipo !== "socioeconomico") return false;
      
      const cpfLinha = String(r[CONFIG.COLUNAS_LOG.CPF] || "").replace(/\D/g,"");
      const emailLinha = String(r[CONFIG.COLUNAS_LOG.EMAIL] || "").toLowerCase().trim();
      
      return (targetCpf && cpfLinha === targetCpf) || (targetEmail && emailLinha === targetEmail);
    });
  }
}

class IAService {
  static obterQuizDiario() {
    const cache = CacheService.getScriptCache();
    const hoje = Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd");
    const cacheKey = "quiz_ia_diario_" + hoje;

    // Se a IA já gerou o quiz de hoje nas últimas 6 horas, devolve instantâneo
    const quizCache = cache.get(cacheKey);
    if (quizCache) return JSON.parse(quizCache);

    // Pega a chave da API salva nas configurações do Apps Script
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

    const fallbackQuiz = {
       pergunta: "Qual a melhor estratégia para reter clientes no seu banho e tosa?",
       opcoes: ["Oferecer laços e brindes como cortesia", "Dar banho rápido com água fria", "Não responder aos feedbacks"],
       respostaCorreta: "Oferecer laços e brindes como cortesia"
    };

    if (!apiKey) return fallbackQuiz; // Se não configurou a chave, usa o manual

    try {
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
      const prompt = "Gere uma pergunta criativa de múltipla escolha sobre empreendedorismo feminino no mercado pet (banho e tosa, atendimento, precificação). Retorne APENAS um objeto JSON válido neste formato exato, sem crases ou markdown: {\"pergunta\": \"Texto\", \"opcoes\": [\"Opcao 1\", \"Opcao 2\", \"Opcao 3\"], \"respostaCorreta\": \"Texto da certa\"}";
      
      const options = { method: "post", contentType: "application/json", muteHttpExceptions: true, payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) };
      const response = UrlFetchApp.fetch(url, options);
      const json = JSON.parse(response.getContentText());

      if (json.candidates && json.candidates[0].content.parts[0].text) {
         let textoIA = json.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim();
         const quizIA = JSON.parse(textoIA);
         cache.put(cacheKey, JSON.stringify(quizIA), 21600); // Salva no cache por 6h
         return quizIA;
      }
    } catch (e) {
      Logger.log("Erro na IA: " + e);
    }
    return fallbackQuiz;
  }
}

var Utils = {
  limparCPF: (v) => String(v).replace(/\D/g,""),
  formatarData: (d) => d instanceof Date ? Utilities.formatDate(d, "GMT-3", "dd/MM/yyyy") : "--/--",
  responderCustom: (data, cb) => {
    const s = JSON.stringify(data);
    if (cb) return ContentService.createTextOutput(`${cb}(${s})`).setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON).addHeader('Access-Control-Allow-Origin', '*');
  }
};