window.parent.postMessage('REQUEST_EMAIL', '*');
window.addEventListener('message', (event) => {
    if (event.data.email) {
        verificarPorEmail(event.data.email);
    }
});

function getEmailFromCircle() {
    console.log("Debug: Tentando obter e-mail da Circle...");
    try {
        if (window.circleUser && window.circleUser.email) {
            return window.circleUser.email.toLowerCase().trim();
        }
        
        let liquidEmail = "${user.email}"; 
        console.log("Debug: Tentativa via template:", liquidEmail);
        
        if (liquidEmail && !liquidEmail.includes('${')) {
            return liquidEmail.toLowerCase().trim();
        }
    } catch (e) {
        console.error("Debug: Erro ao tentar obter e-mail da Circle:", e);
    }
    return null;
}
function switchTab(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    if (el) el.classList.add('active');
    if (tabId === 'tab-quiz') renderQuiz();
    if (tabId === 'tab-extrato' && currentData) renderChart();
}
function renderJornada() {
    const jornadaLista = document.getElementById('jornada-lista');
    if (!jornadaLista) return;
    
    jornadaLista.innerHTML = configMapa.map((passo, index) => {
        const ehAtual = (currentData && currentData.badge === passo.id);
        const ehAnterior = false; // Lógica simplificada de progresso
        return `
            <div class="step-item ${ehAtual ? 'unlocked' : ''}" style="margin: 0 10px;">
                <div class="step-circle">${passo.icon}</div>
                <div class="step-label">${passo.nome}</div>
            </div>`;
    }).join('');
}

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

const urlApp = "https://script.google.com/macros/s/AKfycbyCtBQ_wVDEpyKybzHgo9eFswc6tczQuFs53VLzg3t9HuoFbLOVVY_zrVScPxIwG2b0/exec";

const configMapa = [
    { id: "Aprendiz Curiosa 🐾", nome: "1. Aprendiz Curiosa 🐾", stage: "acreditar", icon: "🐾", img: "media/Aprendiz.webp", desc: "Primeiros passos no curso." },
    { id: "Mulher de Propósito ✨", nome: "2. Mulher de Propósito ✨", stage: "acreditar", icon: "✨", img: "media/Mulher.webp", desc: "Conexão com seu 'porquê'." },
    { id: "Fera da Técnica 🎓", nome: "3. Fera da Técnica 🎓", stage: "aprender", icon: "🎓", img: "media/Fera.webp", desc: "Domínio do manejo pet." },
    { id: "Profissional que Arrasa 💼", nome: "4. Profissional que Arrasa 💼", stage: "agir", icon: "💼", img: "media/Prof.webp", desc: "Atendimento e renda." },
    { id: "Embaixadora Pet Rocinha 👑", nome: "5. Embaixadora Pet Rocinha 👑", stage: "agir", icon: "👑", img: "media/Embaixadora.webp", desc: "Referência na comunidade." }
];

function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.innerText = message;
    notif.style.position = 'fixed';
    notif.style.bottom = '20px';
    notif.style.right = '20px';
    notif.style.padding = '15px';
    notif.style.background = type === 'error' ? '#ef4444' : '#10b981';
    notif.style.color = 'white';
    notif.style.borderRadius = '8px';
    notif.style.zIndex = '9999';
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
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
    if (savedCPF) document.getElementById('cpf-input').value = savedCPF;
});

async function verificarCPF() {
    const btnEntrar = document.getElementById('btn-entrar');
    const inputVal = document.getElementById('cpf-input').value;
    const currentCPF = tratarCPFFrontEnd(inputVal);
    
    if (currentCPF.length !== 11) {
        showNotification("Por favor, digite seu CPF completo (11 números).", "error");
        return;
    }

    btnEntrar.disabled = true;
    btnEntrar.innerText = "Processando...";
    document.getElementById('loader').style.display = 'flex';
    
    try {
        const response = await fetch(`${urlApp}?cpf=${currentCPF}`);
        const rawData = await response.json();

        if (rawData.encontrado) {
            currentData = {
                encontrado: true,
                nome: rawData.nome || "Aluna",
                foto: rawData.foto || "",
                arrasas: rawData.arrasas || 0,
                xp_total: rawData.xp_total || 0,
                badge: rawData.badge || "Aprendiz Curiosa",
                proximoEvento: rawData.proximoEvento || "Consulte a Circle",
                ranking: rawData.ranking || [],
                jaRespondeuQuiz: rawData.jaRespondeuQuiz || false,
                historico: rawData.historico || [],
                recompensas: rawData.recompensas || [],
                cpf: currentCPF,
                email: ""
            };
            renderDashboard();
        } else {
            showNotification("Aluna não cadastrada no sistema.", "error");
        }
    } catch (error) {
        showNotification("Erro ao carregar dados.", "error");
    } finally {
        document.getElementById('loader').style.display = 'none';
        btnEntrar.disabled = false;
        btnEntrar.innerText = "Entrar e Arrasar";
    }
}

async function verificarPorEmail(email) {
    console.log("🔍 Iniciando busca para o e-mail:", email);
    const btnEntrar = document.getElementById('btn-entrar');
    const loader = document.getElementById('loader');
    
    btnEntrar.disabled = true;
    btnEntrar.innerText = "Buscando...";
    loader.style.display = 'flex';
    
    try {
        const fetchUrl = `${urlApp}?email=${encodeURIComponent(email.trim())}`;
        console.log("📡 Chamando URL:", fetchUrl);

        const response = await fetch(fetchUrl);
        const rawData = await response.json();
        
        console.log("📥 Resposta recebida do Backend:", rawData);

        if (rawData.encontrado) {
            currentData = {
                encontrado: true,
                nome: rawData.nome || "Aluna",
                foto: rawData.foto || "",
                arrasas: rawData.arrasas || 0,
                xp_total: rawData.xp_total || 0,
                badge: rawData.badge || "Aprendiz Curiosa",
                proximoEvento: rawData.proximoEvento || "Consulte a Circle",
                ranking: rawData.ranking || [],
                historico: rawData.historico || [],
                recompensas: rawData.recompensas || [],
                cpf: rawData.cpf,
                email: email
            };
            renderDashboard();
            showNotification(`Bem-vinda, ${currentData.nome}!`);
        } else {
            console.warn("❌ Backend retornou: não encontrado.", rawData);
            showNotification(rawData.erro || "E-mail não cadastrado na Profissão Pet.", "error");
            // Se não achou, deixa o CPF visível para login manual
            document.getElementById('auth-section').style.display = 'flex';
        }
    } catch (error) {
        console.error("🚨 Erro crítico na requisição:", error);
        showNotification("Erro de conexão com a base de dados.", "error");
    } finally {
        loader.style.display = 'none';
        btnEntrar.disabled = false;
        btnEntrar.innerText = "Entrar e Arrasar";
    }
}

function renderDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dash-content').style.display = 'block';
    
    document.getElementById('user-nome').innerText = currentData.nome;
    document.getElementById('user-img').src = currentData.foto || "";
    document.getElementById('user-arrasas').innerText = currentData.arrasas;
    
    const badgeData = configMapa.find(c => c.id === currentData.badge) || configMapa;
    document.querySelector('.badge-text').innerText = badgeData.id;
    document.querySelector('.badge-img').src = badgeData.img;

    const dicaIA = DICAS_IA_LOCAL[currentData.badge] || "Dica: Mantenha a constância e o foco técnico.";
    document.getElementById('dica-ia-texto').innerText = dicaIA;

    const percent = Math.min(100, currentData.arrasas);
    document.getElementById('meta-txt').innerText = percent;
    document.getElementById('bar-fill').style.width = percent + '%';
    
    if (currentData.arrasas >= 100) document.getElementById('btn-resgate').style.display = 'flex';

    // Ranking e Histórico
    const rankingList = document.getElementById('ranking-list');
    if (rankingList) {
        rankingList.innerHTML = currentData.ranking.map((r, i) => `
            <li class="list-item" style="justify-content:space-between; padding: 16px;">
                <div style="display:flex; width: 100%; align-items:center;">
                    <div style="width:30px; font-weight:800; color:var(--pet-purple);">${i+1}º</div>
                    <div style="flex:1; margin-left:10px;"><b>${r.nome}</b><br><small>${r.badge}</small></div>
                    <div style="font-weight:800; color:var(--pet-indigo);">${r.xp} XP</div>
                </div>
            </li>`).join('');
    }

    const eLista = document.getElementById('extrato-lista');
    if (eLista) {
        eLista.innerHTML = currentData.historico.map(h => `
            <li class="list-item" style="justify-content:space-between; padding:12px;">
                <div><small style="color:var(--pet-purple); font-weight:700;">${h.data}</small><br><b>${h.descricao}</b></div>
                <div style="font-weight:800; color:${h.pontos >= 0 ? 'var(--pet-green)' : '#ef4444'};">${h.pontos >= 0 ? '+' : ''}${h.pontos}</div>
            </li>`).join('');
    }
}

async function sendQuizLogToBackend(isCorrect) {
    const loaderQuiz = document.getElementById('loader-quiz');
    const quizResEl = document.getElementById('quiz-result');
    const nome = currentData.nome ? currentData.nome.split(' ') : "Aluna";
    const email = currentData.email || "";

    loaderQuiz.style.display = 'flex';

    try {
        const url = `${urlApp}?action=logAcertoQuiz&nome=${encodeURIComponent(nome)}&cpf=${currentData.cpf}&email=${encodeURIComponent(email)}&status=${isCorrect ? 'acerto' : 'erro'}&pontos=${isCorrect ? 1 : 0}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.erro) {
            quizResEl.innerHTML = `⏳ ${result.erro}`;
            quizResEl.style.display = 'block';
            document.getElementById('opcoes-quiz').style.display = 'none';
        } else {
            quizResEl.style.display = 'block';
            quizResEl.innerHTML = isCorrect ? "🎉 Resposta Correta! Você ganhou 1 Arrasa!" : `❌ Incorreta. Resposta: "${quizData.respostaCorreta}"`;
            
            // Recarrega os dados para atualizar saldo e ranking
            const updated = await fetch(`${urlApp}?cpf=${currentData.cpf}`);
            const updatedData = await updated.json();
            if (updatedData.encontrado) {
                currentData.arrasas = updatedData.arrasas;
                currentData.historico = updatedData.historico;
                currentData.ranking = updatedData.ranking;
                renderDashboard();
            }
        }
    } catch (e) {
        console.error("Erro no quiz:", e);
    } finally {
        loaderQuiz.style.display = 'none';
    }
}

    // Atualiza a lógica de renderização da jornada
    const jornadaLista = document.getElementById('jornada-lista');
    const fluxoHeader = document.querySelectorAll('.fluxo-step');
    
    if (jornadaLista && currentData && currentData.badge) {
        const currentIndex = configMapa.findIndex(l => l.id === currentData.badge);
        const activeIndex = currentIndex >= 0 ? currentIndex : 0;
        
        // Header 3A
        fluxoHeader.forEach(el => el.classList.remove('active'));
        const currentStage = configMapa[activeIndex].stage;
        const targetHeader = document.getElementById(`step-${currentStage}`);
        if(targetHeader) targetHeader.classList.add('active');

        // Linha do tempo
        jornadaLista.innerHTML = configMapa.map((passo, index) => {
            const isUnlocked = index <= activeIndex;
            return `
            <div class="timeline-step ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="step-icon">${isUnlocked ? passo.icon : '🔒'}</div>
                <div class="step-label">${passo.nome.replace(/^\d+\.\s*/, '')}</div>
            </div>`;
        }).join('');
    } else if (jornadaLista) {
        jornadaLista.innerHTML = `<p>Dados da jornada não disponíveis.</p>`;
    }

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const emailDaUrl = params.get('email');
    
    if (emailDaUrl && !emailDaUrl.includes('${')) {
        verificarPorEmail(emailDaUrl);
    }

    window.addEventListener('message', (event) => {
        if (event.data.email) verificarPorEmail(event.data.email);
    });
});


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

// Remove as variáveis fixas de recompensa que não são mais usadas


function abrirModalRecompensas() {
    const modalBody = document.getElementById('modal-recompensas-conteudo');
    modalBody.innerHTML = currentData.recompensas.map(r => `
        <div class="info-box"><h4>${r.titulo}</h4><p>${r.desc}</p></div>
    `).join('');
    document.getElementById('modal-recompensas').style.display = 'flex';
}

function fecharModalRecompensas() {
    document.getElementById('modal-recompensas').style.display = 'none';
}

async function toggleNotificacoes() {
    const btn = document.getElementById('btn-toggle-notif');
    const loader = document.getElementById('loader'); 
    const isAtivo = btn.innerText === 'ATIVADAS';
    
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
            showNotification("Notificações desativadas.");
        } else {
            btn.innerText = 'ATIVADAS';
            btn.style.background = 'var(--pet-green)';
            showNotification("Notificações reativadas!");
        }

    } catch (error) {
        console.error("Erro ao atualizar notificações:", error);
        showNotification("Erro ao conectar ao servidor.", "error");
    } finally {
        loader.style.display = 'none';
    }
}


function renderQuiz() {
    const quizContent = document.getElementById('quiz-content');
    quizContent.innerHTML = `<h4>🧠 Quiz Diário</h4><div id="quiz-question-area"><p id="pergunta-txt"></p><div id="opcoes-quiz"></div></div><div id="quiz-result" style="display:none"></div>`;
    
    if (currentData.jaRespondeuQuiz) {
        document.getElementById('quiz-result').innerText = "⏳ Já respondido hoje!";
        document.getElementById('quiz-result').style.display = 'block';
        return;
    }

    quizData = DADOS_QUIZ_LOCAL[Math.floor(Math.random() * DADOS_QUIZ_LOCAL.length)];
    document.getElementById('pergunta-txt').innerText = quizData.pergunta;
    quizData.opcoes.forEach(opt => {
        const btn = document.createElement('button');
        btn.innerText = opt;
        btn.className = 'btn-glow tab-btn';
        btn.style.margin = '5px 0';
        btn.onclick = () => {
            Array.from(btn.parentElement.children).forEach(b => b.disabled = true);
            sendQuizLogToBackend(opt === quizData.respostaCorreta);
        };
        document.getElementById('opcoes-quiz').appendChild(btn);
    });
}