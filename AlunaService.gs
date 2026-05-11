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
