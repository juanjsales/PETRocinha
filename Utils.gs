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
