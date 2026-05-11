# Estrutura do Front-end (PETRocinha)

A estrutura do projeto foi reestruturada para melhorar a manutenibilidade e modularização:

- `assets/css/main.css`: Contém todos os estilos anteriormente em `style.css`.
- `assets/js/api.js`: Responsável pelas comunicações com o servidor (Google Apps Script).
- `assets/js/ui.js`: Responsável pelas funções de renderização da interface e manipulação do DOM.
- `assets/js/app.js`: Ponto de entrada da aplicação, orquestrando a lógica principal.

## Como compilar/executar
O projeto utiliza módulos ES (`type="module"` no `index.html`), garantindo um escopo isolado para cada arquivo JS. Certifique-se de que o navegador suporte módulos ES ao abrir o `index.html`.
