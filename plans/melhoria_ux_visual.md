# Plano de Melhoria UX/Visual - Profissão Pet Rocinha

## Objetivo
Melhorar a experiência do usuário (UX) e o visual do painel, tornando-o mais intuitivo, fluido e profissional.

## Tarefas de Implementação

1. **UX/Feedback:**
   - [ ] Implementar uma função `showToast(message)` para substituir `alert()`.
   - [ ] Adicionar transições de *fade-in* (`opacity` e `transform`) ao trocar de aba no painel.

2. **Visual/Estilo:**
   - [ ] Ajustar o estilo dos botões (`.btn-glow`) para estados de *hover* e *focus* mais distintos.
   - [ ] Refinar as animações de carregamento (`loader`) para um design mais elegante e alinhado com a identidade visual do projeto.
   - [ ] Melhorar a responsividade dos elementos em dispositivos móveis (tamanho de fonte, espaçamento entre cards).

3. **Interatividade:**
   - [ ] Adicionar um efeito de entrada suave para o `.main-card` ao carregar o dashboard pela primeira vez.

## Estrutura de Código
- As funções de utilidade (como `showToast`) serão adicionadas ao final de `script.js`.
- O CSS será atualizado em `style.css` para incluir novas classes de animação e ajustes de responsividade.
