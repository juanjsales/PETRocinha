function doGet(e) {
  try {
    console.log("DEBUG INÍCIO: Recebido evento - e.parameter:", JSON.stringify(e.parameter));

    const SS_ID = "1e2MfXxnGHnkifeh-uJiRrSYuI8rxbp-GCdWvNpj-lgI";
    const ss = SpreadsheetApp.openById(SS_ID);
    console.log("DEBUG: SS aberta com sucesso:", ss.getName());

    // Funções utilitárias isoladas
    const Utils = {
      limparCPF: function(valor) {
        if (!valor || valor === "") return ""; // Adicionado check para vazio
        let numeros = String(valor).replace(/\D/g, "").trim();
        while (numeros.length > 0 && numeros.length < 11) { numeros = "0" + numeros; }
        return numeros;
      },
      formatarData: function(dataBruta) {
        if (dataBruta instanceof Date) {
          return Utilities.formatDate(dataBruta, "GMT-3", "dd/MM");
        } else if (dataBruta) {
          let partes = String(dataBruta).substring(0,10).split("-");
          if (partes.length === 3) return partes + "/" + partes;
        }
        return "--/--";
      },
      buscarLinhaPorCPF: function(sheet, cpfBuscado) {
        if (!cpfBuscado || cpfBuscado === "") return null; // Proteção: Não busca se o CPF for vazio
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (this.limparCPF(data[i]) === cpfBuscado) {
            return { linha: data[i], indice: i + 1 };
          }
        }
        return null;
      }
    };

    const action = e.parameter.action || e.parameter.acao; 
    const cpfParam = e.parameter.cpf || "";
    const emailParam = e.parameter.email || "";
    
    console.log(`DEBUG: Parâmetros recebidos - Ação: ${action || 'N/A'}, CPF: ${cpfParam || 'N/A'}, Email: ${emailParam || 'N/A'}`);
    
    let cpfBuscado = Utils.limparCPF(cpfParam);
    console.log("DEBUG: CPF buscado após limpeza (inicial):", cpfBuscado);
    
    // Se email foi passado e não CPF, tentamos encontrar o CPF pelo email na base
    if (emailParam && !cpfBuscado) {
      console.log("DEBUG: Tentando localizar CPF pelo email:", emailParam);
      const sheetMembers = ss.getSheetByName("community_members");
      if (!sheetMembers) {
        console.error("ERRO: Planilha 'community_members' não encontrada.");
        return ContentService.createTextOutput(JSON.stringify({ encontrado: false, erro_interno: "Planilha 'community_members' não encontrada." })).setMimeType(ContentService.MimeType.JSON);
      }
      const dataMembers = sheetMembers.getDataRange().getValues();
      for (let i = 1; i < dataMembers.length; i++) {
        if (String(dataMembers[i]).toLowerCase().trim() === emailParam.toLowerCase().trim()) {
          cpfBuscado = Utils.limparCPF(dataMembers[i]);
          console.log("DEBUG: CPF encontrado para o email:", cpfBuscado);
          break;
        }
      }
      
      // CORREÇÃO: Se tentou buscar por email e não achou o CPF, interrompe aqui.
      if (!cpfBuscado) {
        console.log("DEBUG: Nenhum CPF vinculado ao email:", emailParam);
        return ContentService.createTextOutput(JSON.stringify({ encontrado: false, erro: "E-mail não localizado na base." })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Se após todas as tentativas o cpfBuscado continuar vazio, interrompe.
    if (!cpfBuscado || cpfBuscado === "") {
       return ContentService.createTextOutput(JSON.stringify({ encontrado: false, erro: "Identificação (CPF ou Email) não fornecida ou não encontrada." })).setMimeType(ContentService.MimeType.JSON);
    }

    console.log("DEBUG: CPF buscado (final) antes das ações:", cpfBuscado);

    // ==========================================
    // AÇÃO: LOG ACERTO QUIZ
    // ==========================================
    if (action === "logAcertoQuiz") {
      console.log("DEBUG: Iniciando ação logAcertoQuiz.");
      const nome = e.parameter.nome || "";
      const status = e.parameter.status || "desconhecido"; 
      const pontos = parseInt(e.parameter.pontos) || 0; 
      const email = e.parameter.email || "";

      const sheetLog = ss.getSheetByName("Log");
      if (!sheetLog) {
        console.error("ERRO: Planilha 'Log' não encontrada para logAcertoQuiz.");
        return ContentService.createTextOutput(JSON.stringify({ sucesso: false, erro: "Planilha 'Log' não encontrada." })).setMimeType(ContentService.MimeType.JSON);
      }
      const dataLog = sheetLog.getDataRange().getValues();
      const agora = new Date();
      const ultimaResposta = dataLog.find(row => 
        Utils.limparCPF(String(row)) === cpfBuscado && 
        row === 'quiz_diario' && 
        (agora - new Date(row)) < 24 * 60 * 60 * 1000
      );

      if (ultimaResposta) {
        console.log("DEBUG: Quiz já respondido hoje por", cpfBuscado);
        return ContentService.createTextOutput(JSON.stringify({ sucesso: false, erro: "Você já respondeu o quiz hoje, volte amanhã!" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      sheetLog.appendRow([new Date(), "", nome, "quiz_diario", `Quiz Diário`, "", cpfBuscado, email, pontos, `Acertou quiz diário`]);
      console.log("DEBUG: Log de acerto de quiz registrado para CPF:", cpfBuscado);

      return ContentService.createTextOutput(JSON.stringify({ sucesso: true, status: status, pontos: pontos }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // AÇÃO: ATUALIZAR NOTIFICAÇÕES
    // ==========================================
    if (action === "updateNotif" || action === "updateAlert") {
      console.log("DEBUG: Iniciando ação updateNotif/updateAlert.");
      const status = e.parameter.status || "Não";
      const sheetMembers = ss.getSheetByName("community_members");
      if (!sheetMembers) {
        console.error("ERRO: Planilha 'community_members' não encontrada para updateNotif.");
        return ContentService.createTextOutput(JSON.stringify({ sucesso: false, erro: "Planilha 'community_members' não encontrada." })).setMimeType(ContentService.MimeType.JSON);
      }
      const res = Utils.buscarLinhaPorCPF(sheetMembers, cpfBuscado);
      
      if (res) {
        sheetMembers.getRange(res.indice, 13).setValue(status);
        console.log(`DEBUG: Notificação atualizada para CPF ${cpfBuscado}: ${status}`);
        return ContentService.createTextOutput(JSON.stringify({ sucesso: true, status: status }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        console.log("DEBUG: CPF não encontrado para atualização de notificação:", cpfBuscado);
        return ContentService.createTextOutput(JSON.stringify({ sucesso: false, erro: "CPF não encontrado para atualizar notificação." })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Verificação de quiz diário
    let jaRespondeuHoje = false;
    const sheetLog = ss.getSheetByName("Log");
    if (sheetLog) {
      const dataLog = sheetLog.getDataRange().getValues();
      const agora = new Date();
      const ultimaResposta = dataLog.find(row => 
          Utils.limparCPF(String(row)) === cpfBuscado && 
          String(row) === 'quiz_diario' && 
          (agora - new Date(row)) < 24 * 60 * 60 * 1000
      );
      if (ultimaResposta) jaRespondeuHoje = true;
    }

    // ==========================================
    // 1. DADOS DA ALUNA (community_members)
    // ==========================================
    const sheetMembers = ss.getSheetByName("community_members");
    const resAluna = Utils.buscarLinhaPorCPF(sheetMembers, cpfBuscado);
    
    if (!resAluna) {
       return ContentService.createTextOutput(JSON.stringify({ encontrado: false })).setMimeType(ContentService.MimeType.JSON);
    }
    
    let linha = resAluna.linha;
    let aluna = {
      encontrado: true,
      cpf: cpfBuscado,
      nome: linha || "Aluna", 
      foto: linha || "",
      arrasas: Number(linha) || 0,
      badge: String(linha || "Aprendiz Curiosa"),
      xp_total: Number(linha) || 0,
      jaRespondeuQuiz: jaRespondeuHoje,
      proximoEvento: "Consulte a Circle",
      missoesDisponiveis: [],
      historico: [],
      ranking: []
    };

    // ==========================================
    // 2. CONFIGURAÇÕES E MISSÕES (Aba Config)
    // ==========================================
    try {
      const sheetConfig = ss.getSheetByName("Config");
      const dataConfig = sheetConfig.getDataRange().getValues();
      for (let k = 1; k < dataConfig.length; k++) {
        let linhaCfg = dataConfig[k];
        let chave = String(linhaCfg).trim();
        if (chave === "PROXIMO_EVENTO") {
          aluna.proximoEvento = String(linhaCfg);
        }
        if (linhaCfg && linhaCfg && chave !== "PROXIMO_EVENTO") {
          aluna.missoesDisponiveis.push({
            titulo: linhaCfg,
            descricao: linhaCfg,
            recompensa: linhaCfg
          });
        }
      }
    } catch(e) {}

    // ==========================================
    // 3. EXTRATO DE PONTOS (Aba Log)
    // ==========================================
    try {
      const sheetLog = ss.getSheetByName("Log");
      const dataLog = sheetLog.getDataRange().getValues();
      for (let j = 1; j < dataLog.length; j++) {
        let linhaLog = dataLog[j];
        if (Utils.limparCPF(linhaLog) === cpfBuscado) {
          aluna.historico.push({
            data: Utils.formatarData(linhaLog),
            acao: linhaLog || linhaLog || "Atividade", 
            pontos: Number(linhaLog) || 0
          });
        }
      }
    } catch(e) {}

    // ==========================================
    // 4. RANKING (Aba Ranking)
    // ==========================================
    try {
      const sheetRank = ss.getSheetByName("Ranking");
      const dataRank = sheetRank.getDataRange().getValues();
      dataRank.shift();
      dataRank.sort((a, b) => (Number(b) || 0) - (Number(a) || 0));

      for (let r = 0; r < dataRank.length && aluna.ranking.length < 10; r++) {
        if (dataRank[r] && String(dataRank[r]).trim() !== "") {
          aluna.ranking.push({
            nome: dataRank[r] || "Aluna",
            badge: dataRank[r] || "Talento",
            xp: Number(dataRank[r]) || 0
          });
        }
      }
    } catch(e) {}

    aluna.quiz = null;
    aluna.dicaIA = null;

    return ContentService.createTextOutput(JSON.stringify(aluna)).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ encontrado: false, erro_interno: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}