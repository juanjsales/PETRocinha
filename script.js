// Definições de recompensas (caso não venham da API)
const recompensa1 = `
    <div class="reward-container gold">
        <div class="reward-title">🥇 Selo de Ouro - Arrasadora Elite</div>
        <ul class="reward-list">
            <li>Acesso a Masterclass de Negócios</li>
            <li>Mentoria 1-1 com Especialista</li>
        </ul>
    </div>
`;
const recompensa2 = `
    <div class="reward-container silver">
        <div class="reward-title">🥈 Selo de Prata - Parceira Sênior</div>
        <ul class="reward-list">
            <li>Desconto em materiais de trabalho</li>
            <li>Kit Exclusivo Profissão Pet</li>
        </ul>
    </div>
`;
const recompensa3 = `
    <div class="reward-container bronze">
        <div class="reward-title">🥉 Selo de Bronze - Iniciante Promissora</div>
        <ul class="reward-list">
            <li>Acesso ao grupo de suporte VIP</li>
            <li>Certificado de Conclusão de Módulo</li>
        </ul>
    </div>
`;

const DADOS_QUIZ_LOCAL = [
    { pergunta: "Qual é o principal objetivo da jornada de uma Embaixadora?", opcoes: ["Ficar famosa", "Gerar renda própria", "Apenas passear com pets"], respostaCorreta: "Gerar renda própria" },
    { pergunta: "Qual é a importância da Comunidade Profissão Pet?", opcoes: ["Para fofocar", "Para aprender e trocar experiências", "Para ver fotos de pets"], respostaCorreta: "Para aprender e trocar experiências" }
];

const DICAS_IA_LOCAL = {
  "Aprendiz Curiosa": "Dica: Revise os conceitos básicos de comportamento animal para otimizar os atendimentos.",
  "Mulher de Propósito": "Dica: Mapeie seus diferenciais competitivos e estruture sua oferta de serviços.",
  "Fera da Técnica": "Dica: Aumente a eficiência dos procedimentos técnicos para reduzir o tempo de execução.",
  "Profissional que Arrasa": "Dica: Organize sua agenda e mantenha controle rigoroso de entradas e saídas financeiras.",
  "Embaixadora Pet Rocinha": "Dica: Utilize métricas de desempenho para gerenciar o crescimento da sua rede de atendimentos."
};

let quizData = null;
let currentData = null;
let chartInstance = null;

// ATENÇÃO: COLOQUE AQUI O SEU LINK DO APPS SCRIPT
const urlApp = "https://script.google.com/macros/s/AKfycbyCtBQ_wVDEpyKybzHgo9eFswc6tczQuFs53VLzg3t9HuoFbLOVVY_zrVScPxIwG2b0/exec";

const configMapa = [
    { id: "Aprendiz Curiosa 🐾", nome: "1. Aprendiz Curiosa 🐾", stage: "acreditar", icon: "🐾", img: "https://github.com/juanjsales/PETRocinha/blob/main/Aprendiz.webp?raw=true", desc: "Primeiros passos no curso." },
    { id: "Mulher de Propósito ✨", nome: "2. Mulher de Propósito ✨", stage: "acreditar", icon: "✨", img: "https://github.com/juanjsales/PETRocinha/blob/main/Mulher.webp?raw=true", desc: "Conexão com seu 'porquê'." },
    { id: "Fera da Técnica 🎓", nome: "3. Fera da Técnica 🎓", stage: "aprender", icon: "🎓", img: "https://github.com/juanjsales/PETRocinha/blob/main/Fera.webp?raw=true", desc: "Domínio do manejo pet." },
    { id: "Profissional que Arrasa 💼", nome: "4. Profissional que Arrasa 💼", stage: "agir", icon: "💼", img: "https://github.com/juanjsales/PETRocinha/blob/main/Prof.webp?raw=true", desc: "Atendimento e renda." },
    { id: "Embaixadora Pet Rocinha 👑", nome: "5. Embaixadora Pet Rocinha 👑", stage: "agir", icon: "👑", img: "https://github.com/juanjsales/PETRocinha/blob/main/Embaixadora.webp?raw=true", desc: "Referência na comunidade." }
];

function parseNestedCSV(str) {
    if (!str) return [];
    let result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
        let char = str[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function tratarCPFFrontEnd(cpf) {
    return cpf.replace(/\D/g, "");
}

function aplicarMascaraCPF(input) {
    let value = input.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 9) value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    else if (value.length > 6) value = value.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
    else if (value.length > 3) value = value.replace(/(\d{3})(\d{3})/, "$1.$2");
    
    input.value = value;
}

document.getElementById('cpf-input').addEventListener('input', (e) => {
    aplicarMascaraCPF(e.target);
    localStorage.setItem('ultimoCPF', e.target.value);
});

window.addEventListener('load', () => {
    const savedCPF = localStorage.getItem('ultimoCPF');
    if (savedCPF) {
        document.getElementById('cpf-input').value = savedCPF;
    }
});

async function verificarCPF() {
    const btnEntrar = document.getElementById('btn-entrar');
    const inputVal = document.getElementById('cpf-input').value;
    const currentCPF = tratarCPFFrontEnd(inputVal);
    
    if (currentCPF.length !== 11) {
        alert("Por favor, digite seu CPF completo (11 números).");
        return;
    }

    btnEntrar.disabled = true;
    btnEntrar.innerText = "Processando...";
    
    const loader = document.getElementById('loader');
    loader.style.display = 'flex';
    
    try {
        const response = await fetch(`${urlApp}?cpf=${currentCPF}`);
        if (!response.ok) throw new Error('Servidor indisponível.');
        
        const rawData = await response.json();
        // console.log("Dados brutos do Apps Script:", rawData);

        const parseNestedCSV = (csvStr) => {
            if (!csvStr || typeof csvStr !== 'string') return [];
            return csvStr.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/"/g, "").trim());
        };

        if (rawData.encontrado) {
            currentData = {
                encontrado: true,
                nome: rawData.nome || "Aluna",
                foto: rawData.foto || "",
                arrasas: rawData.arrasas || 0,
                xp_total: rawData.xp_total || 0,
                badge: rawData.badge || "Aprendiz Curiosa",
                proximoEvento: rawData.proximoEvento || "Consulte a Circle",

                ranking: (rawData.ranking || []).map(r => ({
                    nome: r.nome || "Aluna", 
                    badge: r.badge || " ",
                    xp: r.xp || 0
                })),
                jaRespondeuQuiz: rawData.jaRespondeuQuiz || false,
                historico: (rawData.historico || []).map(h => ({
                    data: h.data || "--/--", 
                    acao: h.acao || "Atividade", 
                    pontos: h.pontos || 0 
                })),
                cpf: currentCPF,
                email: (new URLSearchParams(window.location.search).get('email') || "") !== '${user.email}' ? (new URLSearchParams(window.location.search).get('email') || "") : ""
            };

            renderDashboard();
        } else {
            alert("Aluna não cadastrada no sistema.");
        }
    } catch (error) {
        console.error("Erro no processamento:", error);
        alert("Erro ao carregar seus dados. Verifique sua conexão.");
    } finally {
        loader.style.display = 'none';
        btnEntrar.disabled = false;
        btnEntrar.innerText = "Entrar e Arrasar";
    }
}
        
function renderDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dash-content').style.display = 'block';
    
    const nomeCurto = currentData.nome.split(' ')[0];
    const userNomeElem = document.getElementById('user-nome');
    if (userNomeElem) userNomeElem.innerText = currentData.nome;
    const userImgElem = document.getElementById('user-img');
    if (userImgElem) userImgElem.src = currentData.foto || "https://via.placeholder.com/100?text=PET";
    const userArrasasElem = document.getElementById('user-arrasas');
    if (userArrasasElem) userArrasasElem.innerText = currentData.arrasas;
    
    const badgeDisplay = document.getElementById('user-badge-display');
    const badgeImg = document.querySelector('.badge-img');
    const badgeData = configMapa.find(c => c.id === currentData.badge) || configMapa[0];

    // Render Dica IA - AGORA USA DICAS_IA_LOCAL
    const dicaTexto = document.getElementById('dica-ia-texto');
    const dicaContainer = document.getElementById('dica-ia-container');
    const dicaIA = DICAS_IA_LOCAL[currentData.badge] || "Dica: Mantenha a constância e o foco técnico.";
    
    if (dicaTexto) dicaTexto.innerText = dicaIA;
    if (dicaContainer) dicaContainer.style.display = 'block';

    if (badgeDisplay) {
        const bText = badgeDisplay.querySelector('.badge-text');
        if (bText) bText.innerText = badgeData.id;
    }
    if (badgeImg) {
        badgeImg.src = badgeData.img;
        badgeImg.alt = badgeData.id;
    }
    
    const pEvento = document.getElementById('proximo-evento-txt');
    if (pEvento) pEvento.innerText = currentData.proximoEvento;
    

    // Progresso
    const percent = Math.min(100, currentData.arrasas);
    const metaTxt = document.getElementById('meta-txt');
    if (metaTxt) metaTxt.innerText = percent;
    
    const progBar = document.querySelector('.progress-bar');
    if (progBar) progBar.setAttribute('aria-valuenow', percent);
    
    const barFill = document.getElementById('bar-fill');
    if (barFill) setTimeout(() => barFill.style.width = percent + '%', 100);
    

    const btnResgate = document.getElementById('btn-resgate');
    if (currentData.arrasas >= 100 && btnResgate) btnResgate.style.display = 'flex';

    // Jornada 3A
    window.currentLevelIndex = configMapa.findIndex(l => l.id === currentData.badge);
    if (window.currentLevelIndex < 0) window.currentLevelIndex = 0;
    
    const currentStage = configMapa[window.currentLevelIndex].stage;
    document.querySelectorAll('.stage-card').forEach(c => c.classList.remove('active'));
    const stageCardElem = document.getElementById('card-' + currentStage);
    if (stageCardElem) stageCardElem.classList.add('active');

    const jornadaLista = document.getElementById('jornada-lista');
    if (jornadaLista) {
        jornadaLista.innerHTML = configMapa.map((step, i) => `
            <div class="step-item ${i <= window.currentLevelIndex ? 'unlocked' : ''}">
                <div class="step-circle">${i <= window.currentLevelIndex ? step.icon : '🔒'}</div>
                <div class="step-label"><b>${step.nome}</b><br><span style="font-size:9px">${step.desc}</span></div>
            </div>
        `).join('');
    }

    // Ranking
    const rankingList = document.getElementById('ranking-list');
    if (currentData.ranking && currentData.ranking.length > 0 && rankingList) {
        rankingList.innerHTML = currentData.ranking.map((r, i) => `
            <li class="list-item" style="justify-content:space-between; padding: 16px;">
                <div style="display:flex; width: 100%; align-items:center;">
                    <div style="width:30px; font-weight:800; color:var(--pet-purple); font-size:16px;">${i+1}º</div>
                    <div style="flex:1; margin-left:10px;"><b>${r.nome}</b><br><small>${r.badge || 'Aluna'}</small></div>
                    <div style="font-weight:800; color:var(--pet-indigo); margin-right: 15px;">${r.xp} XP</div>
                </div>
            </li>
        `).join('');
    }

    // Extrato
    const eLista = document.getElementById('extrato-lista');
    if (currentData.historico && currentData.historico.length > 0 && eLista) {
        eLista.innerHTML = currentData.historico.map(h => `
            <li class="list-item" style="justify-content:space-between; padding:12px; cursor: default;">
                <div><small style="color:var(--pet-purple); font-weight:700;">${h.data}</small><br><b style="font-size:13px;">${h.acao}</b></div>
                <div style="font-weight:800; color:${h.pontos >= 0 ? 'var(--pet-green)' : '#ef4444'};">${h.pontos >= 0 ? '+' : ''}${h.pontos}</div>
            </li>
        `).join('');
    }

    if (!localStorage.getItem("watchedProPet_2026")) showVideoGate();
}

function animarJornada() {
    const line = document.getElementById('horiz-line-active');
    const total = configMapa.length - 1;
    const progress = (window.currentLevelIndex / total) * 100;
    line.style.width = `calc(${progress}% - 50px)`;
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

function showVideoGate() {
    document.getElementById('video-gate').style.display = 'flex';
    document.getElementById('video-iframe').src = "https://drive.google.com/file/d/1r3sF2U6-KzkQEHOJy6c5u3FaZ_t5IH2s/preview?autoplay=1";
}

function closeVideoGate() {
    localStorage.setItem("watchedProPet_2026", "true");
    document.getElementById('video-gate').style.display = 'none';
    document.getElementById('video-iframe').src = "";
}

function solicitarResgate() {
    if (confirm("Deseja solicitar o resgate do seu auxílio de R$ 100,00? Você será redirecionada para o WhatsApp de suporte.")) {
        window.open("https://wa.me/5521982013090?text=Quero%20resgatar%20meu%20auxilio%20Profissao%20Pet", "_blank");
    }
}

// Wrapper robusto para confetti
function dispararConfetti(config) {
    if (typeof confetti === 'function') {
        confetti(config);
    } else {
        console.warn("Biblioteca 'confetti' ainda não carregada. Tentando novamente em 500ms...");
        setTimeout(() => {
            if (typeof confetti === 'function') confetti(config);
        }, 500);
    }
}

function abrirModalRecompensas() {
    const modalBody = document.getElementById('modal-recompensas-conteudo');
    modalBody.innerHTML = `
        ${recompensa1}
        ${recompensa2}
        ${recompensa3}
    `;
    document.getElementById('modal-recompensas').style.display = 'flex';
    
    // Dispara animação de comemoração com segurança
    dispararConfetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
    });
}

function fecharModalRecompensas() {
    document.getElementById('modal-recompensas').style.display = 'none';
}

async function toggleNotificacoes() {
    const btn = document.getElementById('btn-toggle-notif');
    const loader = document.getElementById('loader'); 
    const isAtivo = btn.innerText === 'ATIVADAS';
    
    // Removido o parseamento incorreto de CPF via nome, agora utiliza currentData.cpf já carregado
    const userCpf = currentData.cpf; 

    let novoStatus = isAtivo ? 'Não' : 'Sim';
    
    if (isAtivo) {
        if (!confirm("Deseja realmente desativar as notificações por WhatsApp? Você pode perder avisos importantes sobre seu saldo e eventos.")) {
            return;
        }
    }

    loader.style.display = 'flex';

    try {
        const response = await fetch(`${urlApp}?action=updateNotif&cpf=${userCpf}&status=${novoStatus}`);
        
        if (novoStatus === 'Não') {
            btn.innerText = 'DESATIVADAS';
            btn.style.background = '#94a3b8';
            alert("Notificações desativadas.");
        } else {
            btn.innerText = 'ATIVADAS';
            btn.style.background = 'var(--pet-green)';
            alert("Notificações reativadas!");
        }

    } catch (error) {
        console.error("Erro ao atualizar notificações:", error);
        alert("Erro ao conectar ao servidor.");
    } finally {
        loader.style.display = 'none';
    }
}

function switchTab(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
        content.setAttribute('aria-hidden', 'true');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
        btn.removeAttribute('tabindex'); 
    });

    const selectedTabContent = document.getElementById(tabId);
    if (selectedTabContent) {
        selectedTabContent.style.display = 'block';
        selectedTabContent.setAttribute('aria-hidden', 'false');
    }

    if (el) {
        el.classList.add('active');
        el.setAttribute('aria-selected', 'true');
        el.setAttribute('tabindex', '0'); 
    }

    if (tabId === 'tab-jornada') {
        animarJornada();
    } else if (tabId === 'tab-extrato') {
        if (currentData && currentData.historico) {
            renderChart();
        }
    } else if (tabId === 'tab-quiz') {
        renderQuiz();
    }
}


document.getElementById('cpf-input').addEventListener('keypress', (e) => { 
    if(e.key === 'Enter') verificarCPF(); 
});

async function verificarPorEmail(email) {
    const btnEntrar = document.getElementById('btn-entrar');
    const loader = document.getElementById('loader');
    
    btnEntrar.disabled = true;
    btnEntrar.innerText = "Processando...";
    loader.style.display = 'flex';
    
    try {
        const response = await fetch(`${urlApp}?email=${encodeURIComponent(email)}`);
        if (!response.ok) throw new Error('Servidor indisponível.');
        
        const rawData = await response.json();
        
        const parseNestedCSV = (csvStr) => {
            if (!csvStr || typeof csvStr !== 'string') return [];
            return csvStr.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/"/g, "").trim());
        };

        if (rawData.encontrado) {
            currentData = {
                encontrado: true,
                nome: rawData.nome || "Aluna",
                foto: rawData.foto || "",
                arrasas: rawData.arrasas || 0,
                xp_total: rawData.xp_total || 0,
                badge: rawData.badge || "Aprendiz Curiosa",
                proximoEvento: rawData.proximoEvento || "Consulte a Circle",

                ranking: (rawData.ranking || []).map(r => ({
                    nome: r.nome || "Aluna", 
                    badge: r.badge || " ",
                    xp: r.xp || 0
                })),
                historico: (rawData.historico || []).map(h => ({
                    data: h.data || "--/--", 
                    acao: h.acao || "Atividade", 
                    pontos: h.pontos || 0 
                })),
                cpf: rawData.cpf,
                email: email
            };

            renderDashboard();
        } else {
            alert("Aluna não cadastrada no sistema via e-mail.");
        }
    } catch (error) {
        console.error("Erro no processamento:", error);
        alert("Erro ao carregar seus dados pelo e-mail.");
    } finally {
        loader.style.display = 'none';
        btnEntrar.disabled = false;
        btnEntrar.innerText = "Entrar e Arrasar";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const cpf = params.get('cpf');

    if (email) {
        // console.log("Email encontrado na URL:", email);
        verificarPorEmail(email);
    } else if (cpf) {
        // console.log("CPF encontrado na URL:", cpf);
        document.getElementById('cpf-input').value = cpf;
        verificarCPF();
    } else {
        // console.log("Nenhum parâmetro de identificação encontrado na URL.");
    }

    // Ouvir mensagens da Circle
    window.addEventListener('message', (event) => {
        // Verifica origem segura (ajuste o domínio conforme necessário)
        const DOMINIO_PERMITIDO = 'https://comunidade.profissaopet.com.br'; 
        if (event.origin !== DOMINIO_PERMITIDO && event.origin !== window.location.origin) {
            return;
        }

        if (event.data && event.data.email) {
            verificarPorEmail(event.data.email);
        }
    });
});

function renderQuiz() {
    const quizContent = document.getElementById('quiz-content');

    quizContent.innerHTML = `
        <h4 style="color: var(--pet-purple);">🧠 Quiz Diário da Embaixadora</h4>
        <div id="quiz-question-area">
            <p id="pergunta-txt" style="font-size: 16px; font-weight: 700; margin-bottom: 15px;"></p>
            <div id="opcoes-quiz" style="display: flex; flex-direction: column; gap: 10px;"></div>
        </div>
        <div id="quiz-result" style="margin-top: 20px; font-weight: 700; text-align: center; display: none;"></div>
    `;

    const currentPerguntaTxt = document.getElementById('pergunta-txt');
    const currentOpcoesQuiz = document.getElementById('opcoes-quiz');
    const quizResult = document.getElementById('quiz-result');

    if (currentData.jaRespondeuQuiz) {
        quizResult.style.color = 'var(--pet-text-sub)';
        quizResult.innerHTML = `⏳ Você já respondeu o quiz hoje. Volte amanhã!`;
        quizResult.style.display = 'block';
        currentPerguntaTxt.style.display = 'none';
        currentOpcoesQuiz.style.display = 'none';
        return;
    }

    if (DADOS_QUIZ_LOCAL.length === 0) {
        currentPerguntaTxt.innerText = "Nenhuma pergunta de quiz disponível no momento.";
        return;
    }

    const randomIndex = Math.floor(Math.random() * DADOS_QUIZ_LOCAL.length);
    quizData = DADOS_QUIZ_LOCAL[randomIndex];

    currentPerguntaTxt.innerText = quizData.pergunta;
    currentOpcoesQuiz.innerHTML = '';
    quizData.opcoes.forEach(opcao => {
        const button = document.createElement('button');
        button.className = 'btn-glow quiz-option-btn';
        button.style.background = '#f1f5f9';
        button.style.color = 'var(--pet-text-main)';
        button.style.boxShadow = 'none';
        button.style.borderColor = '#e2e8f0';
        button.style.border = '1px solid';
        button.innerText = opcao;
        button.onclick = () => checkQuizAnswer(opcao, currentOpcoesQuiz, quizResult);
        currentOpcoesQuiz.appendChild(button);
    });
}

async function checkQuizAnswer(selectedOption, opcoesQuizElement, quizResultElement) {
    const loaderQuiz = document.getElementById('loader-quiz');
    Array.from(opcoesQuizElement.children).forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.7';
    });

    loaderQuiz.style.display = 'flex';

    if (selectedOption === quizData.respostaCorreta) {
        await sendQuizLogToBackend(true);
    } else {
        await sendQuizLogToBackend(false);
    }

    loaderQuiz.style.display = 'none';

    Array.from(opcoesQuizElement.children).forEach(btn => {
        if (btn.innerText === quizData.respostaCorreta) {
            btn.style.background = 'var(--pet-green)';
            btn.style.color = 'white';
        } else if (btn.innerText === selectedOption) {
            btn.style.background = '#ef4444';
            btn.style.color = 'white';
        }
    });
}

async function sendQuizLogToBackend(isCorrect) {
    if (!currentData || (!currentData.cpf && !localStorage.getItem('ultimoCPF'))) {
        console.warn("Dados do usuário não disponíveis. Tentando recuperar via localStorage...");
        const savedCPF = localStorage.getItem('ultimoCPF');
        if (savedCPF) {
            document.getElementById('cpf-input').value = savedCPF;
            verificarCPF();
            return;
        }
        
        console.error("Dados do usuário não disponíveis e CPF não encontrado no localStorage.");
        alert("Sessão expirada ou dados não carregados. Por favor, recarregue a página e entre novamente.");
        document.getElementById('auth-section').style.display = 'flex';
        document.getElementById('dash-content').style.display = 'none';
        return;
    }

    const nome = currentData.nome ? currentData.nome.split(' ')[0] : "Aluna";
    const cpf = currentData.cpf;
    const acao = isCorrect ? "acerto" : "erro";
    const pontos = isCorrect ? 1 : 0;
    const email = currentData.email || new URLSearchParams(window.location.search).get('email') || "";
    
    // O backend agora resolve o CPF a partir do email se o CPF não for fornecido
    try {
        const url = `${urlApp}?action=logAcertoQuiz&nome=${encodeURIComponent(nome)}&cpf=${cpf}&email=${encodeURIComponent(email)}&status=${acao}&pontos=${pontos}`;
        console.log("Enviando log para:", url);
        const response = await fetch(url);
        const result = await response.json();
        console.log("RESPOSTA DO BACKEND DO QUIZ:", result);
        
        // Adicionando logs de diagnóstico para verificar o estado do DOM
        const quizResEl = document.getElementById('quiz-result');
        console.log("Elemento quiz-result encontrado:", quizResEl);
        
        if (result.erro) {
            quizResEl.innerHTML = `⏳ ${result.erro}`;
            quizResEl.style.display = 'block';
            quizResEl.style.color = '#ef4444';
            quizResEl.style.fontSize = '18px';
            quizResEl.style.padding = '15px';
            quizResEl.style.background = '#fee2e2';
            quizResEl.style.borderRadius = '12px';
            document.getElementById('opcoes-quiz').style.display = 'none';
            return;
        }

        if (result.sucesso || result.mensagem === "Já preenchido hoje") {
            if (isCorrect) {
                quizResEl.style.color = 'var(--pet-green)';
                quizResEl.innerHTML = result.mensagem === "Já preenchido hoje" 
                    ? "ℹ️ Você já respondeu ao quiz hoje." 
                    : "🎉 Resposta Correta! Você ganhou 1 Arrasa!";
                quizResEl.style.display = 'block';
                console.log("Mensagem de acerto exibida:", quizResEl.innerHTML);
                
                if (currentData) {
                    if (result.mensagem !== "Já preenchido hoje") {
                        currentData.arrasas = (currentData.arrasas || 0) + 1;
                    }
                    document.getElementById('user-arrasas').innerText = currentData.arrasas;
                    
                    const percent = Math.min(100, currentData.arrasas);
                    document.getElementById('meta-txt').innerText = percent;
                    document.querySelector('.progress-bar').setAttribute('aria-valuenow', percent);
                    document.getElementById('bar-fill').style.width = percent + '%';
                    if (currentData.arrasas >= 100) document.getElementById('btn-resgate').style.display = 'flex';
                }
            } else {
                quizResEl.style.color = '#ef4444';
                quizResEl.innerHTML = result.mensagem === "Já preenchido hoje"
                    ? "ℹ️ Você já respondeu ao quiz hoje."
                    : `❌ Resposta Incorreta. A resposta certa era: "${quizData.respostaCorreta}"`;
                quizResEl.style.display = 'block';
                console.log("Mensagem de erro exibida:", quizResEl.innerHTML);
            }

            const updatedResponse = await fetch(`${urlApp}?cpf=${cpf}`);
            const updatedRawData = await updatedResponse.json();
            
            // Log para debug
            console.log("DADOS ATUALIZADOS APÓS QUIZ:", updatedRawData);

            if (updatedRawData.encontrado) {
                // Manter parsing antigo se necessário, ou usar direto se a API mudou
                const parseNestedCSV = (csvStr) => {
                    if (!csvStr || typeof csvStr !== 'string') return [];
                    return csvStr.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/"/g, "").trim());
                };
                
                const linhaParts = parseNestedCSV(updatedRawData.nome);
                
                currentData = {
                    encontrado: true,
                    nome: linhaParts[1] || updatedRawData.nome || "Aluna",
                    foto: linhaParts[3] || updatedRawData.foto || "",
                    arrasas: parseInt(linhaParts[10]) || updatedRawData.arrasas || 0,
                    xp_total: parseInt(linhaParts[13]) || updatedRawData.xp_total || 0,
                    badge: linhaParts[11] || updatedRawData.badge || "Aprendiz Curiosa",
                    proximoEvento: updatedRawData.proximoEvento || "Consulte a Circle",
                    ranking: (updatedRawData.ranking || []).map(r => {
                        const rParts = parseNestedCSV(r.linhaRaw);
                        return {
                            nome: rParts[0] || "Aluna",
                            badge: rParts[1] || " ",
                            xp: parseInt(rParts[2]) || 0,
                            recompensa: rParts[3] || ""
                        };
                    }),
                    historico: (updatedRawData.historico || []).map(h => {
                        const hParts = parseNestedCSV(h.acao);
                        return {
                            data: h.data || "--/--",
                            acao: hParts[9] || hParts[3] || "Atividade",
                            pontos: parseInt(hParts[8]) || 0
                        };
                    }),
                    cpf: cpf
                };
                renderDashboard();
            }
        }
    } catch (error) {
        console.error("Erro na comunicação com o backend para registrar log do quiz:", error);
    }
}
