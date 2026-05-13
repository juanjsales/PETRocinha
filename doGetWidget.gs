function doGet(e) {
  // Log inicial com timestamp automático do console
  console.log("--- Início da Requisição ---");
  console.log("Parâmetros brutos: " + JSON.stringify(e.parameter));
  
  const emailBuscado = (e.parameter.email || "").toLowerCase().trim();
  const ultimoSaldo = parseInt(e.parameter.ultimoSaldo || 0);
  const cacheKey = "user_data_" + emailBuscado;
  const cache = CacheService.getScriptCache();
  
  let resultado;
  
  // 1. Tenta recuperar do cache
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log("Cache Hit: Dados recuperados do Cache para " + emailBuscado);
    resultado = JSON.parse(cachedData);
    // Atualiza a flag de festejar mesmo no cache se o parâmetro mudar
    resultado.festejar = (resultado.arrasas > ultimoSaldo);
  } else {
    console.log("Cache Miss: Buscando dados na planilha para " + emailBuscado);
    resultado = { encontrado: false, debug: "" };

    try {
      // 2. Validação da Propriedade SS_ID
      const SS_ID = PropertiesService.getScriptProperties().getProperty("SS_ID");
      if (!SS_ID) {
        console.error("ERRO: SS_ID não encontrado nas Propriedades do Script.");
        throw new Error("Configuração ausente: SS_ID");
      }

      const ss = SpreadsheetApp.openById(SS_ID);
      const sheet = ss.getSheetByName("community_members");
      if (!sheet) {
        console.error("ERRO: Aba 'community_members' não existe na planilha.");
        throw new Error("Aba não encontrada");
      }

      const data = sheet.getDataRange().getValues();
      console.log("Planilha lida com sucesso. Total de linhas: " + data.length);

      const COL_NOME = 1;     // B
      const COL_EMAIL = 2;    // C
      const COL_ARRASAS = 10; // K
      const COL_BADGE = 11;   // L

      // 3. Loop de busca
      var encontradoNaPlanilha = false;
      for (var i = 1; i < data.length; i++) {
        var linha = data[i];
        var emailLinha = String(linha[COL_EMAIL] || "").toLowerCase().trim();
        
        if (emailLinha === emailBuscado) {
          var saldoNaPlanilha = parseInt(linha[COL_ARRASAS]) || 0;
          console.log("Membro encontrado na linha " + (i + 1));
          console.log("Saldo Planilha: " + saldoNaPlanilha + " | Último Saldo Widget: " + ultimoSaldo);

          resultado = {
            encontrado: true,
            nome: linha[COL_NOME],
            arrasas: saldoNaPlanilha,
            badge: linha[COL_BADGE] || "Aprendiz Curiosa 🐾",
            festejar: (saldoNaPlanilha > ultimoSaldo)
          };
          
          // Guarda no cache por apenas 15 segundos para atualizações quase instantâneas
          cache.put(cacheKey, JSON.stringify(resultado), 15);
          encontradoNaPlanilha = true;
          break;
        }
      }

      if (!encontradoNaPlanilha) {
        console.warn("Aviso: E-mail " + emailBuscado + " não localizado na planilha.");
      }

    } catch (err) {
      console.error("ERRO CRÍTICO no processamento: " + err.message);
      resultado = { encontrado: false, erro: err.toString() };
    }
  }

  // 4. Retorno final
  console.log("Resultado final enviado: " + JSON.stringify(resultado));
  console.log("--- Fim da Requisição ---");

  var callback = e.parameter.callback || "callback";
  var json = JSON.stringify(resultado);
  return ContentService.createTextOutput(callback + '(' + json + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}