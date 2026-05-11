function doGet(e) {
  try {
    const SS_ID = "1e2MfXxnGHnkifeh-uJiRrSYuI8rxbp-GCdWvNpj-lgI";
    const ss = SpreadsheetApp.openById(SS_ID);

    function limparCPF(valor) {
      if (!valor) return "";
      let numeros = String(valor).replace(/\D/g, "").trim();
      while (numeros.length > 0 && numeros.length < 11) { numeros = "0" + numeros; }
      return numeros;
    }

    const action = e.parameter.action || e.parameter.acao; 
    const cpfParam = e.parameter.cpf || "";
    const emailParam = e.parameter.email || "";
    const cpfBuscado = limparCPF(cpfParam);

    // Se email foi passado e não CPF, tentamos encontrar o CPF pelo email na base
    if (emailParam && !cpfBuscado) {
      const sheetMembers = ss.getSheetByName("community_members");
      const dataMembers = sheetMembers.getDataRange().getValues();
      for (let i = 1; i < dataMembers.length; i++) {
        if (String(dataMembers[i][7]).toLowerCase() === emailParam.toLowerCase()) {
          cpfBuscado = limparCPF(dataMembers[i][6]);
          break;
        }
      }
    }

    // ==========================================
    // AÇÃO: LOG ACERTO QUIZ
    // ==========================================
    if (action === "logAcertoQuiz") {
      const nome = e.parameter.nome || "";
      const status = e.parameter.status || "desconhecido"; 
      const pontos = parseInt(e.parameter.pontos) || 0; 
      const email = e.parameter.email || ""; // Corrigido para pegar do parametro

      const sheetLog = ss.getSheetByName("Log");
      const dataLog = sheetLog.getDataRange().getValues();
      const agora = new Date();
      const ultimaResposta = dataLog.find(row => 
        limparCPF(String(row[6])) === cpfBuscado && 
        row[3] === 'quiz_diario' && 
        (agora - new Date(row[0])) < 24 * 60 * 60 * 1000
      );

      if (ultimaResposta) {
        return ContentService.createTextOutput(JSON.stringify({ sucesso: false, erro: "Você já respondeu o quiz hoje, volte amanhã!" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Ordem exigida: Data | ID Usuario | Nome | codigo_evento | Curso/Evento | Aula | CPF | Email | Pontos | Descrição
      sheetLog.appendRow([new Date(), "", nome, "quiz_diario", `Quiz Diário`, "", cpfBuscado, email, pontos, `Acertou quiz diário`]);

      return ContentService.createTextOutput(JSON.stringify({ sucesso: true, status: status, pontos: pontos }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // AÇÃO: ATUALIZAR NOTIFICAÇÕES
    // ==========================================
    if (action === "updateNotif" || action === "updateAlert") {
      const status = e.parameter.status || "Não";
      const sheetMembers = ss.getSheetByName("community_members");
      const dataMembers = sheetMembers.getDataRange().getValues();
      
      for (let i = 1; i < dataMembers.length; i++) {
        let linha = dataMembers[i];
        let achouNestaLinha = false;
        for (let j = 0; j < linha.length; j++) {
          if (limparCPF(linha[j]) === cpfBuscado) { achouNestaLinha = true; break; }
        }
        if (achouNestaLinha) {
          sheetMembers.getRange(i + 1, 13).setValue(status);
          return ContentService.createTextOutput(JSON.stringify({ sucesso: true, status: status }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // Antes de carregar os dados completos, verificamos se ela já respondeu o quiz hoje
    let jaRespondeuHoje = false;
    const sheetLog = ss.getSheetByName("Log");
    const dataLog = sheetLog.getDataRange().getValues();
    const agora = new Date();
    
    // Procura no Log, coluna 0 (Data), 3 (codigo_evento), 6 (CPF)
    const ultimaResposta = dataLog.find(row => 
        limparCPF(String(row[6])) === cpfBuscado && 
        String(row[3]) === 'quiz_diario' && 
        (agora - new Date(row[0])) < 24 * 60 * 60 * 1000
    );
    
    if (ultimaResposta) {
      jaRespondeuHoje = true;
    }

    // ==========================================
    // 1. DADOS DA ALUNA (community_members)
    // ==========================================
    const sheetMembers = ss.getSheetByName("community_members");
    const dataMembers = sheetMembers.getDataRange().getValues();
    let aluna = { encontrado: false };

    for (let i = 1; i < dataMembers.length; i++) {
      let linha = dataMembers[i];
      let achouNestaLinha = false;
      
      for (let j = 0; j < linha.length; j++) {
        if (limparCPF(linha[j]) === cpfBuscado) { achouNestaLinha = true; break; }
      }

      if (achouNestaLinha) {
        aluna = {
          encontrado: true,
          cpf: cpfBuscado,
          nome: String(linha), 
          foto: String(linha[3] || ""),
          arrasas: Number(linha[10]) || 0,
          badge: String(linha[11] || "Aprendiz Curiosa"),
          xp_total: Number(linha[13]) || 0,
          jaRespondeuQuiz: jaRespondeuHoje,
          proximoEvento: "Consulte a Circle",
          missoesDisponiveis: [],
          historico: [],
          ranking: []
        };
        break; 
      }
    }

    if (!aluna.encontrado) {
       return ContentService.createTextOutput(JSON.stringify({ encontrado: false })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // 2. CONFIGURAÇÕES E MISSÕES (Aba Config)
    // ==========================================
    try {
      const sheetConfig = ss.getSheetByName("Config");
      const dataConfig = sheetConfig.getDataRange().getValues();
      for (let k = 1; k < dataConfig.length; k++) {
        let linhaCfg = dataConfig[k];
        let chave = String(linhaCfg[0]).trim();
        
        if (chave === "PROXIMO_EVENTO") {
          aluna.proximoEvento = String(linhaCfg[1]);
        }
        
        if (linhaCfg[2] && linhaCfg[1] && chave !== "PROXIMO_EVENTO") {
          aluna.missoesDisponiveis.push(String(linhaCfg));
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
        let achouNoLog = false;
        
        for (let c = 0; c < linhaLog.length; c++) {
          if (limparCPF(linhaLog[c]) === cpfBuscado) { achouNoLog = true; break; }
        }

        if (achouNoLog) {
          let dataBruta = linhaLog[0];
          let dataFmt = "--/--";
          if (dataBruta instanceof Date) {
            dataFmt = Utilities.formatDate(dataBruta, "GMT-3", "dd/MM");
          } else if (dataBruta) {
            let partes = String(dataBruta).substring(0,10).split("-");
            if (partes.length === 3) dataFmt = partes[2] + "/" + partes[1];
          }

          aluna.historico.push({
            data: dataFmt,
            acao: String(linhaLog), 
            pontos: Number(linhaLog[8]) || 0
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
      const cabecalho = dataRank.shift();
      dataRank.sort((a, b) => (Number(b[2]) || 0) - (Number(a[2]) || 0));

      for (let r = 0; r < dataRank.length && aluna.ranking.length < 10; r++) {
        if (dataRank[r] && String(dataRank[r][0]).trim() !== "") {
          aluna.ranking.push({
            linhaRaw: String(dataRank[r]), 
            badge: String(dataRank[r][1] || "Talento"),
            xp: Number(dataRank[r][2]) || 0
          });
        }
      }
    } catch(e) {}

    // ==========================================
    // 5. QUIZ DIÁRIO
    // ==========================================
    
    // Garante que o quiz exista sempre, mesmo que sorteie um null ou garanta um padrão.
    // Usaremos Math.floor para selecionar.
    aluna.quiz = null;
    
    aluna.dicaIA = null;

    return ContentService.createTextOutput(JSON.stringify(aluna)).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ encontrado: false, erro_interno: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
