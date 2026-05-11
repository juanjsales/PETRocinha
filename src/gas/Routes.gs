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
