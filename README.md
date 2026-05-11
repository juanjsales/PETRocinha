# Projeto PET Rocinha

Este projeto é uma aplicação baseada em Google Apps Script, estruturada para separar claramente as preocupações entre Frontend e Backend.

## Estrutura do Projeto

```text
/
├── assets/             # Recursos do Frontend
│   ├── css/            # Folhas de estilo (main.css)
│   └── js/             # Scripts do Frontend (app.js, api.js, ui.js)
├── media/              # Imagens e arquivos de mídia
├── plans/              # Documentação de planejamento
├── *.gs                # Arquivos Backend (Google Apps Script)
└── index.html          # Página principal
```

## Responsabilidades

### Frontend (`/assets` e `index.html`)
Responsável pela interface do usuário e interações no navegador.
- `assets/js/`: Contém a lógica de cliente, dividida por responsabilidades (UI, API, App).
- `assets/css/`: Estilização global da aplicação.

### Backend (`*.gs`)
Responsável pela lógica de servidor, interação com banco de dados e rotas.
- `doGet.gs`: Ponto de entrada da aplicação.
- `Routes.gs`: Gerenciamento de rotas.
- `AlunaService.gs`: Lógica de negócio específica de alunas.
- `Database.gs`: Camada de acesso a dados.
- `Utils.gs` / `Config.gs`: Auxiliares e configurações globais.

## Como contribuir

### Adicionar nova funcionalidade ao Frontend
1. Crie ou edite um arquivo em `assets/js/`.
2. Se for uma nova interação visual, adicione lógica em `assets/js/ui.js`.
3. Se for uma nova chamada de API, adicione a função em `assets/js/api.js`.
4. Inclua o script no `index.html` se necessário.

### Adicionar nova funcionalidade ao Backend
1. Identifique o domínio da nova funcionalidade.
2. Se for uma nova rota, adicione em `Routes.gs`.
3. Se envolver banco de dados, crie ou edite a lógica em `Database.gs` ou em um `Service` correspondente (ex: `AlunaService.gs`).
4. Garanta que a função esteja acessível via `doGet` ou `google.script.run`.
