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
