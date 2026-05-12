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
      alunaRel = service.buscarPorEmail(params.email);
    } else if (params.cpf) {
      alunaRel = service.buscarPorCPF(params.cpf);
    }

    if (!alunaRel) {
      return Utils.responderCustom({ encontrado: false, erro: "Não encontrada.", debug: debugLog }, callback);
    }

    const perfil = alunaRel.dados;
    const indice = alunaRel.indice;

    // Processamento de Ações (Quiz/Notif)
    if (action === "logAcertoQuiz") {
      if (!service.verificarQuizHoje(perfil.cpf)) {
        // CORREÇÃO: Corrigido o índice das colunas do log
        db.appendLog([new Date(), "", perfil.nome, "quiz_diario", "Quiz Diário", "", perfil.cpf, perfil.email, params.pontos || 0, "Acertou quiz"]);
        perfil.arrasas += Number(params.pontos || 0);
      }
    }

    // Compilação Final
    const dashboardData = {
      ...perfil,
      historico: db.getHistorico(perfil.cpf, perfil.email),
      ranking: db.getRanking(),
      recompensas: db.getConfigs("RECOMPENSA"),
      proximoEvento: db.getSingleConfig("PROXIMO_EVENTO"),
      debug: { ...debugLog, tempo: (new Date().getTime() - startTime) + "ms" }
    };

    return Utils.responderCustom(dashboardData, callback);

  } catch (error) {
    return Utils.responderCustom({ encontrado: false, erro: error.toString(), debug: debugLog }, e.parameter.callback);
  }
}

// 3. CLASSES DE SUPORTE (DATABASE E SERVIÇO)
class Database {
  constructor() {
    this.ss = SpreadsheetApp.openById(CONFIG.SS_ID);
  }

  getSheetData(nomeAba) {
    return this.ss.getSheetByName(nomeAba).getDataRange().getValues();
  }

  appendLog(dados) {
    this.ss.getSheetByName("Log").appendRow(dados);
  }

  getHistorico(cpf, email) {
    const logs = this.getSheetData("Log");
    // CORREÇÃO: Índices das colunas de log conforme CONFIG
    return logs.filter(r => (r && String(r[CONFIG.COLUNAS_LOG.CPF]).replace(/\D/g,"") === cpf) || (r && String(r[CONFIG.COLUNAS_LOG.EMAIL]).toLowerCase() === email.toLowerCase()))
               .reverse().slice(0, 15)
               .map(r => ({ data: Utils.formatarData(r[CONFIG.COLUNAS_LOG.DATA]), tipo: r[CONFIG.COLUNAS_LOG.TIPO], pontos: r[CONFIG.COLUNAS_LOG.PONTOS], descricao: r[CONFIG.COLUNAS_LOG.DESCRICAO] }));
  }

  getRanking() {
    const r = this.getSheetData("Ranking");
    // CORREÇÃO: Índices das colunas de ranking
    return r.slice(1).sort((a,b) => b[CONFIG.COLUNAS_RANKING.XP] - a[CONFIG.COLUNAS_RANKING.XP]).slice(0,10).map(x => ({ nome: x[CONFIG.COLUNAS_RANKING.NOME], badge: x[CONFIG.COLUNAS_RANKING.BADGE], xp: x[CONFIG.COLUNAS_RANKING.XP] }));
  }

  getConfigs(tipo) {
    const d = this.getSheetData("Config");
    return d.filter(r => r[CONFIG.COLUNAS_CONFIG.TIPO] === tipo).map(r => ({ titulo: r[CONFIG.COLUNAS_CONFIG.VALOR1], desc: r[CONFIG.COLUNAS_CONFIG.VALOR2] }));
  }

  getSingleConfig(tipo) {
    const row = this.getSheetData("Config").find(r => r[CONFIG.COLUNAS_CONFIG.TIPO] === tipo);
    return row ? row[CONFIG.COLUNAS_CONFIG.VALOR1] : "";
  }
}

class AlunaService {
  constructor(db) { this.db = db; }
  buscarPorEmail(email) {
    const d = this.db.getSheetData("community_members");
    for (let i=1; i<d.length; i++) {
      // CORREÇÃO: Índice correto EMAIL
      if (String(d[i][CONFIG.COLUNAS_MEMBROS.EMAIL]).toLowerCase().trim() === email.toLowerCase().trim()) return this.format(d[i], i+1);
    }
    return null;
  }
  buscarPorCPF(cpf) {
    const d = this.db.getSheetData("community_members");
    const c = cpf.replace(/\D/g,"");
    for (let i=1; i<d.length; i++) {
      // CORREÇÃO: Índice correto CPF
      if (String(d[i][CONFIG.COLUNAS_MEMBROS.CPF]).replace(/\D/g,"") === c) return this.format(d[i], i+1);
    }
    return null;
  }
  format(r, i) {
    // CORREÇÃO: Índices corretos para mapeamento da linha
    return { indice: i, dados: { encontrado: true, nome: r[CONFIG.COLUNAS_MEMBROS.NOME], email: r[CONFIG.COLUNAS_MEMBROS.EMAIL], foto: r[CONFIG.COLUNAS_MEMBROS.FOTO], cpf: String(r[CONFIG.COLUNAS_MEMBROS.CPF]).replace(/\D/g,""), arrasas: r[CONFIG.COLUNAS_MEMBROS.ARRASAS], badge: r[CONFIG.COLUNAS_MEMBROS.BADGE], xp: r[CONFIG.COLUNAS_MEMBROS.XP] } };
  }
  verificarQuizHoje(cpf) {
    const logs = this.db.getSheetData("Log");
    const hoje = new Date().toLocaleDateString();
    // CORREÇÃO: Índices de colunas de log
    return logs.some(r => r && String(r[CONFIG.COLUNAS_LOG.CPF]).replace(/\D/g,"") === cpf && r[CONFIG.COLUNAS_LOG.TIPO] === "quiz_diario" && new Date(r[CONFIG.COLUNAS_LOG.DATA]).toLocaleDateString() === hoje);
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