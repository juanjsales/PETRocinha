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
    ARRASAS: 10,  // K
    BADGE: 11,    // L
    XP: 13,       // N
    NOTIF: 12,    // M
    CPF: 7        // H (Sua coluna atualizada)
  },
  COLUNAS_LOG: {
    DATA: 0,
    TIPO: 3,
    CPF: 6,
    EMAIL: 7,
    PONTOS: 8,
    DESCRICAO: 9
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
       return Utils.responderJSON({ encontrado: false, erro: "Acesso não autorizado." });
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
      missoes: []
    };

    // Carregar Pergunta do Dia
    try {
      const configData = db.getSheetData("Config");
      const perguntaRow = configData.find(r => r[0] === "PERGUNTA_DO_DIA");
      if (perguntaRow) {
        dashboardData.perguntaDoDia = {
          pergunta: perguntaRow[1],
          opcoes: [perguntaRow[2], perguntaRow[3], perguntaRow[4]],
          respostaCorreta: perguntaRow[5]
        };
      }
    } catch (err) { console.error("Erro Pergunta Dia:", err); }

    // Carregar Próximo Evento
    try {
      const configData = db.getSheetData("Config");
      const eventoRow = configData.find(r => r[0] === "PROXIMO_EVENTO");
      if (eventoRow) dashboardData.proximoEvento = eventoRow[1];
      
      // Carregar Missões Disponíveis
      dashboardData.missoes = configData.slice(1)
        .filter(r => r[0] !== "PROXIMO_EVENTO" && r[0] !== "")
        .map(r => ({ titulo: r[0], desc: r[1], valor: r[2] }));
    } catch (err) { console.error("Erro Config:", err); }

    // Carregar Histórico (Log)
    try {
      const logData = db.getSheetData("Log");
      dashboardData.historico = logData
        .filter(row => row[CONFIG.COLUNAS_LOG.CPF] && Utils.limparCPF(row[CONFIG.COLUNAS_LOG.CPF]) === perfil.cpf)
        .reverse()
        .slice(0, 15)
        .map(row => ({
          data: Utils.formatarData(row[CONFIG.COLUNAS_LOG.DATA]),
          tipo: row[CONFIG.COLUNAS_LOG.TIPO],
          email: row[CONFIG.COLUNAS_LOG.EMAIL],
          pontos: Number(row[CONFIG.COLUNAS_LOG.PONTOS]) || 0,
          descricao: row[CONFIG.COLUNAS_LOG.DESCRICAO] || "Ação"
        }));
    } catch (err) { console.error("Erro Histórico:", err); }

    // Carregar Ranking
    try {
      const rankData = db.getSheetData("Ranking");
      if (rankData.length > 1) {
        dashboardData.ranking = rankData.slice(1)
          .filter(r => r[0] !== "")
          .sort((a, b) => Number(b[2]) - Number(a[2]))
          .slice(0, 10)
          .map(r => ({ nome: r[0], badge: r[1], xp: Number(r[2]) }));
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