/**
 * SISTEMA DE GERENCIAMENTO PROFISSÃO PET 2026
 * Versão: 3.0.0
 * Descrição: Backend para Dashboard de Alunas com integração Circle.so
 */

// Configurações Globais
const CONFIG = {
  SS_ID: "1e2MfXxnGHnkifeh-uJiRrSYuI8rxbp-GCdWvNpj-lgI",
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
  COLUNAS_CONFIG: {
    TIPO: 0,
    VALOR1: 1,
    VALOR2: 2,
    VALOR3: 3,
    VALOR4: 4,
    VALOR5: 5
  },
  COLUNAS_LOG: {
    DATA: 0,
    TIPO: 3,
    CPF: 6,
    EMAIL: 7,
    PONTOS: 8,
    DESCRICAO: 9
  },
  COLUNAS_RANKING: {
    NOME: 0,
    BADGE: 1,
    XP: 2
  }
};

/**
 * Módulo de Utilidades
 */
class Utils {
  static limparCPF(valor) {
    if (!valor) return "";
    let numeros = String(valor).replace(/\D/g, "").trim();
    while (numeros.length > 0 && numeros.length < 11) {
      numeros = "0" + numeros;
    }
    return numeros;
  }

  static formatarData(dataBruta) {
    if (dataBruta instanceof Date) {
      return Utilities.formatDate(dataBruta, "GMT-3", "dd/MM/yyyy HH:mm");
    }
    return "--/--";
  }

  static responderJSON(objeto) {
    return ContentService.createTextOutput(JSON.stringify(objeto))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Gerenciador de Banco de Dados (Google Sheets)
 */
class Database {
  constructor() {
    this.ss = SpreadsheetApp.openById(CONFIG.SS_ID);
  }

  getSheetData(nomeAba) {
    const cache = CacheService.getScriptCache();
    const cachedData = cache.get(nomeAba);
    if (cachedData) return JSON.parse(cachedData);

    const sheet = this.ss.getSheetByName(nomeAba);
    if (!sheet) throw new Error(`Aba ${nomeAba} não encontrada.`);
    const data = sheet.getDataRange().getValues();
    
    cache.put(nomeAba, JSON.stringify(data), 300); // Cache por 5 minutos
    return data;
  }

  // Novo método para invalidar cache após escrita
  invalidateCache(nomeAba) {
    CacheService.getScriptCache().remove(nomeAba);
  }

  appendLog(dados) {
    const sheet = this.ss.getSheetByName("Log");
    if (sheet) {
      sheet.appendRow(dados);
      this.invalidateCache("Log");
    }
  }

  updateMemberField(linhaIndice, colunaIndice, valor) {
    const sheet = this.ss.getSheetByName("community_members");
    sheet.getRange(linhaIndice, colunaIndice + 1).setValue(valor);
    this.invalidateCache("community_members");
  }
}

/**
 * Classe Aluna - Gerencia as informações e lógica da usuária
 */
class AlunaService {
  constructor(db) {
    this.db = db;
  }

  buscarPorEmail(email) {
    const data = this.db.getSheetData("community_members");
    const emailLimpo = String(email).toLowerCase().trim();
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][CONFIG.COLUNAS_MEMBROS.EMAIL]).toLowerCase().trim() === emailLimpo) {
        return this.montarPerfil(data[i], i + 1);
      }
    }
    return null;
  }

  buscarPorCPF(cpf) {
    const data = this.db.getSheetData("community_members");
    const cpfLimpo = Utils.limparCPF(cpf);
    
    for (let i = 1; i < data.length; i++) {
      if (Utils.limparCPF(data[i][CONFIG.COLUNAS_MEMBROS.CPF]) === cpfLimpo) {
        return this.montarPerfil(data[i], i + 1);
      }
    }
    return null;
  }

  montarPerfil(linha, indice) {
    const cols = CONFIG.COLUNAS_MEMBROS;
    return {
      indice: indice,
      dados: {
        encontrado: true,
        cpf: Utils.limparCPF(linha[cols.CPF]),
        nome: linha[cols.NOME] || "Aluna",
        foto: linha[cols.FOTO] || "",
        arrasas: Number(linha[cols.ARRASAS]) || 0,
        badge: String(linha[cols.BADGE] || "Aprendiz Curiosa"),
        xp_total: Number(linha[cols.XP]) || 0,
        notificacoes: linha[cols.NOTIF] || "Não"
      }
    };
  }

  verificarQuizHoje(cpf) {
    const dataLog = this.db.getSheetData("Log");
    const agora = new Date();
    const cpfLimpo = Utils.limparCPF(cpf);

    return dataLog.some(row => {
      const dataLog = new Date(row[CONFIG.COLUNAS_LOG.DATA]);
      return Utils.limparCPF(row[CONFIG.COLUNAS_LOG.CPF]) === cpfLimpo &&
             row[CONFIG.COLUNAS_LOG.TIPO] === "quiz_diario" &&
             (agora - dataLog) < 24 * 60 * 60 * 1000;
    });
  }
}

/**
 * Função Principal doGet
 */
function doGet(e) {
  const db = new Database();
  const service = new AlunaService(db);
  
  try {
    const params = e.parameter;
    
    // Verificação de Token
    if (params.token !== CONFIG.SECURITY_TOKEN) {
       // Removida restrição estrita para permitir funcionamento via Circle sem token explicitamente passado na URL
       // return Utils.responderJSON({ encontrado: false, erro: "Acesso não autorizado." });
    }

    const action = params.action || params.acao;
    let alunaRel = null;

    // 1. Identificação da Aluna (E-mail tem prioridade)
    if (params.email) {
      alunaRel = service.buscarPorEmail(params.email);
    } else if (params.cpf) {
      let cpfBuscado = params.cpf;
      alunaRel = service.buscarPorCPF(cpfBuscado);
    }

    if (!alunaRel) {
      return Utils.responderJSON({ encontrado: false, erro: "Usuária não localizada." });
    }

    const perfil = alunaRel.dados;
    const indiceNaPlanilha = alunaRel.indice;

    // 2. Processamento de Ações Específicas
    if (action === "logAcertoQuiz") {
      if (service.verificarQuizHoje(perfil.cpf)) {
        return Utils.responderJSON({ sucesso: false, erro: "Quiz já realizado hoje." });
      }
      
      db.appendLog([
        new Date(), "", params.nome || perfil.nome, "quiz_diario", 
        "Quiz Diário", "", perfil.cpf, params.email || "", 
        params.pontos || 0, "Acertou quiz"
      ]);
      return Utils.responderJSON({ sucesso: true, pontos: params.pontos });
    }

    if (action === "updateNotif") {
      db.updateMemberField(indiceNaPlanilha, CONFIG.COLUNAS_MEMBROS.NOTIF, params.status);
      return Utils.responderJSON({ sucesso: true, status: params.status });
    }

    // 3. Compilação de Dados para o Dashboard
    const dashboardData = {
      ...perfil,
      jaRespondeuQuiz: service.verificarQuizHoje(perfil.cpf),
      proximoEvento: "Carregando...",
      historico: [],
      ranking: [],
      missoes: [],
      recompensas: []
    };

    // Carregar Recompensas
    try {
      const configData = db.getSheetData("Config");
      const cols = CONFIG.COLUNAS_CONFIG;
      const recompensaRows = configData.filter(r => r[cols.TIPO] === "RECOMPENSA");
      dashboardData.recompensas = recompensaRows.map(r => ({
        titulo: r[cols.VALOR1],
        desc: r[cols.VALOR2]
      }));
    } catch (err) { console.error("Erro Recompensas:", err); }

    // Carregar Pergunta do Dia
    try {
      const configData = db.getSheetData("Config");
      const cols = CONFIG.COLUNAS_CONFIG;
      const perguntaRow = configData.find(r => r[cols.TIPO] === "PERGUNTA_DO_DIA");
      if (perguntaRow) {
        dashboardData.perguntaDoDia = {
          pergunta: perguntaRow[cols.VALOR1],
          opcoes: [perguntaRow[cols.VALOR2], perguntaRow[cols.VALOR3], perguntaRow[cols.VALOR4]],
          respostaCorreta: perguntaRow[cols.VALOR5]
        };
      }
    } catch (err) { console.error("Erro Pergunta Dia:", err); }

    // Carregar Próximo Evento
    try {
      const configData = db.getSheetData("Config");
      const cols = CONFIG.COLUNAS_CONFIG;
      const eventoRow = configData.find(r => r[cols.TIPO] === "PROXIMO_EVENTO");
      if (eventoRow) dashboardData.proximoEvento = eventoRow[cols.VALOR1];
      
      // Carregar Missões Disponíveis
      dashboardData.missoes = configData.slice(1)
        .filter(r => r[cols.TIPO] !== "PROXIMO_EVENTO" && r[cols.TIPO] !== "")
        .map(r => ({ titulo: r[cols.TIPO], desc: r[cols.VALOR1], valor: r[cols.VALOR2] }));
    } catch (err) { console.error("Erro Config:", err); }

    // Carregar Histórico (Log)
    try {
      const logData = db.getSheetData("Log");
      const cols = CONFIG.COLUNAS_LOG;
      dashboardData.historico = logData
        .filter(row => row[cols.CPF] && Utils.limparCPF(row[cols.CPF]) === perfil.cpf)
        .reverse()
        .slice(0, 15)
        .map(row => ({
          data: Utils.formatarData(row[cols.DATA]),
          tipo: row[cols.TIPO],
          email: row[cols.EMAIL],
          pontos: Number(row[cols.PONTOS]) || 0,
          descricao: row[cols.DESCRICAO] || "Ação"
        }));
    } catch (err) { console.error("Erro Histórico:", err); }

    // Carregar Ranking
    try {
      const rankData = db.getSheetData("Ranking");
      const cols = CONFIG.COLUNAS_RANKING;
      if (rankData.length > 1) {
        dashboardData.ranking = rankData.slice(1)
          .filter(r => r[cols.NOME] !== "")
          .sort((a, b) => Number(b[cols.XP]) - Number(a[cols.XP]))
          .slice(0, 10)
          .map(r => ({ nome: r[cols.NOME], badge: r[cols.BADGE], xp: Number(r[cols.XP]) }));
      }
    } catch (err) { console.error("Erro Ranking:", err); }

    return Utils.responderJSON(dashboardData);

  } catch (error) {
    console.error("Erro Crítico:", error);
    return Utils.responderJSON({ 
      encontrado: false, 
      erro_interno: error.toString(),
      stack: error.stack 
    });
  }
}

/**
 * Função de Manutenção (Opcional)
 * Limpa caches ou logs antigos se necessário
 */
function realizarManutencao() {
  console.log("Iniciando rotina de manutenção...");
  // Espaço para futuras automações de limpeza
}