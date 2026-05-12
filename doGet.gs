function doGet(e) {
  const startTime = new Date().getTime();
  const db = new Database();
  const service = new AlunaService(db);
  
  // Objeto de Debug para rastreio
  let debugLog = {
    etapa: "Iniciando",
    params: e.parameter,
    performance: {}
  };
  
  try {
    const params = e.parameter;
    const callback = params.callback; // Captura callback para JSONP (Widget)
    const action = params.action || params.acao;
    
    let alunaRel = null;

    // 1. Identificação da Aluna (E-mail Circle ou CPF Dashboard)
    debugLog.etapa = "Identificando Aluna";
    if (params.email) {
      alunaRel = service.buscarPorEmail(params.email);
    } else if (params.cpf) {
      alunaRel = service.buscarPorCPF(params.cpf);
    }

    if (!alunaRel) {
      return Utils.responderCustom(
        { encontrado: false, erro: "Usuária não localizada.", debug: debugLog }, 
        callback
      );
    }

    const perfil = alunaRel.dados;
    const indiceNaPlanilha = alunaRel.indice;
    debugLog.aluna_encontrada = perfil.nome;

    // Incluindo dados adicionais
    perfil.email = perfil.email || params.email || "";
    perfil.has_company_email = perfil.has_company_email || false;
    perfil.admin_of_any_paid_community = perfil.admin_of_any_paid_community || false;

    // 2. Processamento de Ações (Quiz / Notificações)
    if (action === "logAcertoQuiz") {
      debugLog.etapa = "Processando Quiz";
      if (service.verificarQuizHoje(perfil.cpf)) {
        return Utils.responderCustom({ sucesso: false, erro: "Quiz já realizado hoje." }, callback);
      }
      db.appendLog([
        new Date(), "", params.nome || perfil.nome, "quiz_diario", 
        "Quiz Diário", "", perfil.cpf, params.email || perfil.email || "", 
        params.pontos || 0, "Acertou quiz"
      ]);
      // Após o log, atualizamos o saldo no objeto de retorno para o Dashboard refletir na hora
      perfil.arrasas += Number(params.pontos || 0);
    }

    if (action === "updateNotif") {
      db.updateMemberField(indiceNaPlanilha, CONFIG.COLUNAS_MEMBROS.NOTIF, params.status);
      perfil.notificacoes = params.status;
    }

    // 3. Compilação de Dados (O "Pacote Completo")
    debugLog.etapa = "Compilando Dashboard Data";
    const dashboardData = {
      ...perfil,
      jaRespondeuQuiz: service.verificarQuizHoje(perfil.cpf),
      historico: [],
      ranking: [],
      recompensas: [],
      proximoEvento: "Carregando..."
    };

    // --- CARREGAR LOG (EXTRATO) ---
    try {
      const logData = db.getSheetData("Log");
      const colsL = CONFIG.COLUNAS_LOG;
      dashboardData.historico = logData
        .filter(row => row[colsL.CPF] && Utils.limparCPF(row[colsL.CPF]) === perfil.cpf)
        .reverse()
        .slice(0, 15)
        .map(row => ({
          data: Utils.formatarData(row[colsL.DATA]),
          tipo: row[colsL.TIPO],
          pontos: Number(row[colsL.PONTOS]) || 0,
          descricao: row[colsL.DESCRICAO] || "Ação"
        }));
    } catch (err) { console.error("Erro Log:", err); }

    // --- CARREGAR CONFIGS (EVENTO/RECOMPENSAS) ---
    try {
      const configData = db.getSheetData("Config");
      const colsC = CONFIG.COLUNAS_CONFIG;
      
      // Próximo Evento
      const ev = configData.find(r => r[colsC.TIPO] === "PROXIMO_EVENTO");
      if (ev) dashboardData.proximoEvento = ev[colsC.VALOR1];

      // Recompensas
      dashboardData.recompensas = configData
        .filter(r => r[colsC.TIPO] === "RECOMPENSA")
        .map(r => ({ titulo: r[colsC.VALOR1], desc: r[colsC.VALOR2] }));
    } catch (err) { console.error("Erro Config:", err); }

    // --- CARREGAR RANKING ---
    try {
      const rankData = db.getSheetData("Ranking");
      const colsR = CONFIG.COLUNAS_RANKING;
      dashboardData.ranking = rankData.slice(1)
        .filter(r => r[colsR.NOME] !== "")
        .sort((a, b) => Number(b[colsR.XP]) - Number(a[colsR.XP]))
        .slice(0, 10)
        .map(r => ({ nome: r[colsR.NOME], badge: r[colsR.BADGE], xp: Number(r[colsR.XP]) }));
    } catch (err) { console.error("Erro Ranking:", err); }

    debugLog.tempo_total = (new Date().getTime() - startTime) + "ms";
    dashboardData.debug = debugLog;

    return Utils.responderCustom(dashboardData, callback);

  } catch (error) {
    return Utils.responderCustom({ 
      encontrado: false, 
      erro: error.toString(),
      debug: debugLog 
    }, e.parameter.callback);
  }
}

// Adicione a função Utils.responderCustom se ela não existir
if (typeof Utils === 'undefined') {
  var Utils = {};
}

Utils.responderCustom = function(data, callback) {
  const jsonString = JSON.stringify(data);
  if (callback) {
    return ContentService.createTextOutput(`${callback}(${jsonString})`).setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    return ContentService.createTextOutput(jsonString).setMimeType(ContentService.MimeType.JSON);
  }
};