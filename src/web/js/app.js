import { fetchUserData, fetchUserDataByEmail, sendQuizLog } from './api.js';
import { showNotification, renderDashboard } from './ui.js';

let currentData = null;
let chartInstance = null;
let quizData = null;

const configMapa = [
    { id: "Aprendiz Curiosa 🐾", nome: "1. Aprendiz Curiosa 🐾", stage: "acreditar", icon: "🐾", img: "https://github.com/juanjsales/PETRocinha/blob/main/Aprendiz.webp?raw=true", desc: "Primeiros passos no curso." },
    { id: "Mulher de Propósito ✨", nome: "2. Mulher de Propósito ✨", stage: "acreditar", icon: "✨", img: "https://github.com/juanjsales/PETRocinha/blob/main/Mulher.webp?raw=true", desc: "Conexão com seu 'porquê'." },
    { id: "Fera da Técnica 🎓", nome: "3. Fera da Técnica 🎓", stage: "aprender", icon: "🎓", img: "https://github.com/juanjsales/PETRocinha/blob/main/Fera.webp?raw=true", desc: "Domínio do manejo pet." },
    { id: "Profissional que Arrasa 💼", nome: "4. Profissional que Arrasa 💼", stage: "agir", icon: "💼", img: "https://github.com/juanjsales/PETRocinha/blob/main/Prof.webp?raw=true", desc: "Atendimento e renda." },
    { id: "Embaixadora Pet Rocinha 👑", nome: "5. Embaixadora Pet Rocinha 👑", stage: "agir", icon: "👑", img: "https://github.com/juanjsales/PETRocinha/blob/main/Embaixadora.webp?raw=true", desc: "Referência na comunidade." }
];

const DICAS_IA_LOCAL = {
  "Aprendiz Curiosa": "Dica: Revise os conceitos básicos de comportamento animal para otimizar os atendimentos.",
  "Mulher de Propósito": "Dica: Mapeie seus diferenciais competitivos e estruture sua oferta de serviços.",
  "Fera da Técnica": "Dica: Aumente a eficiência dos procedimentos técnicos para reduzir o tempo de execução.",
  "Profissional que Arrasa": "Dica: Organize sua agenda e mantenha controle rigoroso de entradas e saídas financeiras.",
  "Embaixadora Pet Rocinha": "Dica: Utilize métricas de desempenho para gerenciar o crescimento da sua rede de atendimentos."
};

const DADOS_QUIZ_LOCAL = [
    { pergunta: "Qual é o principal objetivo da jornada de uma Embaixadora?", opcoes: ["Ficar famosa", "Gerar renda própria", "Apenas passear com pets"], respostaCorreta: "Gerar renda própria" },
    { pergunta: "Qual é a importância da Comunidade Profissão Pet?", opcoes: ["Para fofocar", "Para aprender e trocar experiências", "Para ver fotos de pets"], respostaCorreta: "Para aprender e trocar experiências" }
];

async function handleLogin(data, email = "") {
    currentData = { ...data, email };
    renderDashboard(currentData, configMapa, DICAS_IA_LOCAL, renderChart);
    if (email) showNotification(`Bem-vinda, ${currentData.nome}!`);
}

function renderChart() {
    const ctx = document.getElementById('arrasasChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    
    let sum = 0;
    const points = currentData.historico.map(h => { 
        sum += h.pontos; 
        return Math.max(0, sum); 
    });
    const labels = currentData.historico.map(h => h.data);

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: points,
                borderColor: '#6366f1',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                pointBackgroundColor: '#fff',
                pointBorderColor: '#6366f1',
                pointRadius: 4
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { 
                y: { 
                    beginAtZero: true, 
                    grid: { color: '#f1f5f9' },
                    title: { display: true, text: 'Saldo (A$)' }
                }, 
                x: { grid: { display: false } } 
            }
        }
    });
}

// Re-exporting functions for global scope (temp bridge)
window.verificarCPF = async () => {
    const cpf = document.getElementById('cpf-input').value.replace(/\D/g, "");
    const data = await fetchUserData(cpf);
    if (data.encontrado) handleLogin(data);
    else showNotification("Aluna não cadastrada", "error");
};

window.verificarPorEmail = async (email) => {
    const data = await fetchUserDataByEmail(email);
    if (data.encontrado) handleLogin(data, email);
    else showNotification("E-mail não cadastrado", "error");
};

window.renderQuiz = () => { /* ... implementation ... */ };
window.renderChart = renderChart;
window.switchTab = (tabId, el) => { /* ... implementation ... */ };
// ... add other necessary event handlers ...
