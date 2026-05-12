window.verificarCPF = verificarCPF;
window.solicitarResgate = solicitarResgate;
window.abrirModalRecompensas = abrirModalRecompensas;
window.fecharModalRecompensas = fecharModalRecompensas;
window.toggleNotificacoes = toggleNotificacoes;
window.switchTab = switchTab;
window.closeVideoGate = closeVideoGate;

let currentData = {};
let chartInstance = null;
let quizData = null;

const DADOS_QUIZ_LOCAL = [
    {
        pergunta: "Qual a importância do manejo correto do pet?",
        opcoes: ["Segurança e bem-estar", "Apenas estética", "Nenhuma importância"],
        respostaCorreta: "Segurança e bem-estar"
    }
];

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailDaUrl = urlParams.get('email');
    const cacheVercel = localStorage.getItem('pet_perfil_ativo');

    // 1. Recebeu a "carona" da Circle?
    if (emailDaUrl && emailDaUrl !== "{{user.email}}") {
        console.log("📩 E-mail recebido da Circle via URL:", emailDaUrl);
        // Limpa a URL para ficar bonito
        window.history.replaceState({}, document.title, window.location.pathname);
        // Busca no Google e SALVA NA GAVETA DA VERCEL
        await buscarESalvarLocal(emailDaUrl);
        return;
    }

    // 2. Se já tem o dado na gaveta da Vercel, usa ele
    if (cacheVercel) {
        const data = JSON.parse(cacheVercel);
        if (data.encontrado) {
            currentData = data;
            renderDashboard();
            return;
        }
    }

    // 3. Se não tem nada, mostra o login manual
    document.getElementById('auth-section').style.display = 'block';
});

async function buscarESalvarLocal(email) {
    document.getElementById('loader').style.display = 'flex';
    try {
        const res = await fetch(`${urlApp}?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.encontrado) {
            currentData = data;
            localStorage.setItem('pet_perfil_ativo', JSON.stringify(data)); // SALVA NO DOMÍNIO VERCEL
            renderDashboard();
        }
    } catch (e) {
        console.error("Erro na colheita:", e);
    } finally {
        document.getElementById('loader').style.display = 'none';
    }
}





async function refreshDadosSilencioso(id) {
    try {
        const result = await new Promise((resolve, reject) => {
            const callbackName = "jsonp_callback_" + Math.round(100000 * Math.random());
            const timeout = setTimeout(() => {
                // Em vez de deletar, transformamos em função vazia para evitar ReferenceError
                window[callbackName] = () => { delete window[callbackName]; };
                const s = document.getElementById(callbackName);
                if (s) document.body.removeChild(s);
                reject(new Error("Tempo limite da requisição excedido."));
            }, 25000); // Aumentado para 25s

            window[callbackName] = (data) => {
                clearTimeout(timeout);
                delete window[callbackName];
                const s = document.getElementById(callbackName);
                if (s) document.body.removeChild(s);
                resolve(data);
            };

            const script = document.createElement("script");
            script.id = callbackName;
            
            // Lógica de e-mail prioritário: localStorage da Circle ou o e-mail passado como parâmetro
const emailParaBackend = localStorage.getItem("pet_user_email") || id;
            
            script.src = `${urlApp}?email=${encodeURIComponent(emailParaBackend)}&callback=${callbackName}`;
            script.onerror = () => {
                clearTimeout(timeout);
                delete window[callbackName];
                const s = document.getElementById(callbackName);
                if (s) document.body.removeChild(s);
                reject(new Error("Error"));
            };
            document.body.appendChild(script);
        });

        if (result.encontrado) {
            localStorage.setItem("pet_perfil_ativo", JSON.stringify(result));
            currentData = result;
            renderDashboard(); 
        }
    } catch(e) { console.warn("Falha no refresh em segundo plano."); }
}

async function jsonpRequest(params) {
    return new Promise((resolve, reject) => {
        const callbackName = "jsonp_callback_" + Math.round(100000 * Math.random());
        const timeout = setTimeout(() => {
            window[callbackName] = () => { delete window[callbackName]; };
            const s = document.getElementById(callbackName);
            if (s) document.body.removeChild(s);
            reject(new Error("Tempo limite da requisição excedido."));
        }, 25000);

        window[callbackName] = (data) => {
            clearTimeout(timeout);
            delete window[callbackName];
            const s = document.getElementById(callbackName);
            if (s) document.body.removeChild(s);
            resolve(data);
        };

        const script = document.createElement("script");
        script.id = callbackName;
        const queryString = Object.keys(params).map(key => `${key}=${encodeURIComponent(params[key])}`).join("&");
        script.src = `${urlApp}?${queryString}&callback=${callbackName}`;
        script.onerror = () => {
            clearTimeout(timeout);
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
            reject(new Error("Erro ao carregar script (CORS ou rede)."));
        };
        document.body.appendChild(script);
    });
}

// ATENÇÃO: COLOQUE AQUI O SEU LINK DO APPS SCRIPT
const urlApp = "https://script.google.com/macros/s/AKfycbyCtBQ_wVDEpyKybzHgo9eFswc6tczQuFs53VLzg3t9HuoFbLOVVY_zrVScPxIwG2b0/exec";

const configMapa = [
    { id: "Aprendiz Curiosa 🐾", nome: "1. Aprendiz Curiosa 🐾", stage: "acreditar", icon: "🐾", img: "https://github.com/juanjsales/PETRocinha/blob/main/Aprendiz.webp?raw=true", desc: "Primeiros passos no curso." },
    { id: "Mulher de Propósito ✨", nome: "2. Mulher de Propósito ✨", stage: "acreditar", icon: "✨", img: "https://github.com/juanjsales/PETRocinha/blob/main/Mulher.webp?raw=true", desc: "Conexão com seu \'porquê\'." },
    { id: "Fera da Técnica 🎓", nome: "3. Fera da Técnica 🎓", stage: "aprender", icon: "🎓", img: "https://github.com/juanjsales/PETRocinha/blob/main/Fera.webp?raw=true", desc: "Domínio do manejo pet." },
    { id: "Profissional que Arrasa 💼", nome: "4. Profissional que Arrasa 💼", stage: "agir", icon: "💼", img: "https://github.com/juanjsales/PETRocinha/blob/main/Prof.webp?raw=true", desc: "Atendimento e renda." },
    { id: "Embaixadora Pet Rocinha 👑", nome: "5. Embaixadora Pet Rocinha 👑", stage: "agir", icon: "👑", img: "https://github.com/juanjsales/PETRocinha/blob/main/Embaixadora.webp?raw=true", desc: "Referência na comunidade." }
];

function parseNestedCSV(str) {
    if (!str) return [];
    let result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
        let char = str[i];
        if (char === "\"") {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
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

document.getElementById("cpf-input").addEventListener("input", (e) => {
    aplicarMascaraCPF(e.target);
    localStorage.setItem("ultimoCPF", e.target.value);
});

window.addEventListener("load", () => {
    const savedCPF = localStorage.getItem("ultimoCPF");
    if (savedCPF) {
        document.getElementById("cpf-input").value = savedCPF;
    }
});

async function verificarCPF() {
    const btnEntrar = document.getElementById("btn-entrar");
    const inputVal = document.getElementById("cpf-input").value;
    const currentCPF = tratarCPFFrontEnd(inputVal);
    
    if (currentCPF.length !== 11) {
        alert("Por favor, digite seu CPF completo (11 números).");
        return;
    }

    btnEntrar.disabled = true;
    btnEntrar.innerText = "Processando...";
    
    const loader = document.getElementById("loader");
    loader.style.display = "flex";
    
    try {
        const result = await new Promise((resolve, reject) => {
            const callbackName = "jsonp_callback_" + Math.round(100000 * Math.random());
            const timeout = setTimeout(() => {
                window[callbackName] = () => { delete window[callbackName]; };
                const s = document.getElementById(callbackName);
                if (s) document.body.removeChild(s);
                reject(new Error("Tempo limite da requisição excedido."));
            }, 25000);

            window[callbackName] = (data) => {
                clearTimeout(timeout);
                delete window[callbackName];
                const s = document.getElementById(callbackName);
                if (s) document.body.removeChild(s);
                resolve(data);
            };

            const script = document.createElement("script");
            script.id = callbackName;
            script.src = `${urlApp}?cpf=${encodeURIComponent(currentCPF)}&callback=${callbackName}`;
            script.onerror = () => {
                clearTimeout(timeout);
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error("Erro ao carregar script (CORS ou rede)."));
            };
            document.body.appendChild(script);
        });
        
        console.log("Dados brutos do Apps Script:", result);
        const rawData = result;
      
        if (rawData.encontrado) {
            currentData = {
                encontrado: true,
                nome: rawData.nome || "Aluna",
                email: rawData.email || "",
                foto: rawData.foto || "https://via.placeholder.com/100?text=PET",
                arrasas: parseInt(rawData.arrasas) || 0,
                xp_total: parseInt(rawData.xp_total) || 0,
                badge: rawData.badge || "Aprendiz Curiosa",
                proximoEvento: rawData.proximoEvento || "Consulte a Circle",

                ranking: (rawData.ranking || []).map(r => {
                    return {
                        nome: r.nome || "Aluna", 
                        badge: r.badge || " ",
                        xp: parseInt(r.xp) || 0,
                        recompensa: r.recompensa || ""
                    };
                }),
                jaRespondeuQuiz: rawData.jaRespondeuQuiz || false,
                historico: (rawData.historico || []).map(h => {
                    return {
                        data: h.data || "--/--", 
                        acao: h.acao || "Atividade", 
                        pontos: parseInt(h.pontos) || 0 
                    };
                }),
                cpf: currentCPF
            };

            console.log("Dados finais processados:", currentData);
            renderDashboard();
        } else {
            alert("Aluna não cadastrada no sistema.");
        }
    } catch (error) {
        console.error("Erro no processamento:", error);
        alert("Erro ao carregar seus dados. Verifique sua conexão ou se o sistema está online.");
    } finally {
        loader.style.display = "none";
        btnEntrar.disabled = false;
        btnEntrar.innerText = "Entrar e Arrasar";
    }
}
        
function renderDashboard() {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("dash-content").style.display = "block";
    
    const userNomeElem = document.getElementById("user-nome");
    if (userNomeElem) userNomeElem.innerText = currentData.nome;
    const userImgElem = document.getElementById("user-img");
    if (userImgElem) userImgElem.src = currentData.foto || "https://via.placeholder.com/100?text=PET";
    const userArrasasElem = document.getElementById("user-arrasas");
    if (userArrasasElem) userArrasasElem.innerText = currentData.arrasas;
    
    const badgeDisplay = document.getElementById("user-badge-display");
    const badgeImg = document.querySelector(".badge-img");
    const badgeData = configMapa.find(c => c.id === currentData.badge) || configMapa[0];

    // Render Dica IA - AGORA USA DICAS_IA_LOCAL
    const dicaTexto = document.getElementById("dica-ia-texto");
    const dicaContainer = document.getElementById("dica-ia-container");
    const DICAS_IA_LOCAL = {
        "Aprendiz Curiosa 🐾": "Dica: Explore todas as aulas e não hesite em perguntar!",
        "Mulher de Propósito ✨": "Dica: Conecte-se com seu propósito e compartilhe suas paixões.",
        "Fera da Técnica 🎓": "Dica: Pratique as técnicas de manejo e cuidado com os pets.",
        "Profissional que Arrasa 💼": "Dica: Busque feedbacks e aprimore seu atendimento para aumentar sua renda.",
        "Embaixadora Pet Rocinha 👑": "Dica: Incentive e apoie outras alunas na comunidade!"
    };
    const dicaIA = DICAS_IA_LOCAL[currentData.badge] || "Dica: Mantenha a constância e o foco técnico.";
    
    // Novo: Exibir informações extras se existirem
    let infoExtra = "";
    if (currentData.email) infoExtra += `<div style="font-size: 12px; color: var(--pet-text-sub);">E-mail: ${currentData.email}</div>`;
    if (currentData.has_company_email) infoExtra += `<span style="background: var(--pet-green); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">E-mail Corporativo</span>`;
    if (currentData.admin_of_any_paid_community) infoExtra += `<span style="background: var(--pet-purple); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Admin Comunidade</span>`;
    
    if (infoExtra) {
        let extraContainer = document.getElementById("user-extra-info");
        if (!extraContainer) {
            extraContainer = document.createElement("div");
            extraContainer.id = "user-extra-info";
            document.getElementById("user-nome").parentNode.appendChild(extraContainer);
        }
        extraContainer.innerHTML = infoExtra;
    }

    if (dicaTexto) dicaTexto.innerText = dicaIA;
    if (dicaContainer) dicaContainer.style.display = "block";

    if (badgeDisplay) {
        const bText = badgeDisplay.querySelector(".badge-text");
        if (bText) bText.innerText = badgeData.id;
    }
    if (badgeImg) {
        badgeImg.src = badgeData.img;
        badgeImg.alt = badgeData.id;
    }
    
    const pEvento = document.getElementById("proximo-evento-txt");
    if (pEvento) pEvento.innerText = currentData.proximoEvento;
    

    // Progresso
    const percent = Math.min(100, currentData.arrasas);
    const metaTxt = document.getElementById("meta-txt");
    if (metaTxt) metaTxt.innerText = percent;
    
    const progBar = document.querySelector(".progress-bar");
    if (progBar) progBar.setAttribute("aria-valuenow", percent);
    
    const barFill = document.getElementById("bar-fill");
    if (barFill) setTimeout(() => barFill.style.width = percent + "%", 100);
    

    const btnResgate = document.getElementById("btn-resgate");
    if (currentData.arrasas >= 100 && btnResgate) btnResgate.style.display = "flex";

    // Jornada 3A
    window.currentLevelIndex = configMapa.findIndex(l => l.id === currentData.badge);
    if (window.currentLevelIndex < 0) window.currentLevelIndex = 0;
    
    const currentStage = configMapa[window.currentLevelIndex].stage;
    document.querySelectorAll(".stage-card").forEach(c => c.classList.remove("active"));
    const stageCardElem = document.getElementById("card-" + currentStage);
    if (stageCardElem) stageCardElem.classList.add("active");

    const jornadaLista = document.getElementById("jornada-lista");
    if (jornadaLista) {
        jornadaLista.innerHTML = configMapa.map((step, i) => `
            <div class="step-item ${i <= window.currentLevelIndex ? "unlocked" : ""}">
                <div class="step-circle">${i <= window.currentLevelIndex ? step.icon : "🔒"}</div>
                <div class="step-label"><b>${step.nome}</b><br><span style="font-size:9px">${step.desc}</span></div>
            </div>
        `).join("");
    }

    // Ranking
    const rankingList = document.getElementById("ranking-list");
    if (currentData.ranking && currentData.ranking.length > 0 && rankingList) {
        rankingList.innerHTML = currentData.ranking.map((r, i) => `
            <li class="list-item" style="justify-content:space-between; padding: 16px;">
                <div style="display:flex; width: 100%; align-items:center;">
                    <div style="width:30px; font-weight:800; color:var(--pet-purple); font-size:16px;">${i+1}º</div>
                    <div style="flex:1; margin-left:10px;"><b>${r.nome}</b><br><small>${r.badge || "Aluna"}</small></div>
                    <div style="font-weight:800; color:var(--pet-indigo); margin-right: 15px;">${r.xp} XP</div>
                </div>
            </li>
        `).join("");
    }

    // Extrato
    const eLista = document.getElementById("extrato-lista");
    if (currentData.historico && currentData.historico.length > 0 && eLista) {
        eLista.innerHTML = currentData.historico.map(h => `
            <li class="list-item" style="justify-content:space-between; padding:12px; cursor: default;">
                <div><small style="color:var(--pet-purple); font-weight:700;">${h.data}</small><br><b style="font-size:13px;">${h.acao}</b></div>
                <div style="font-weight:800; color:${h.pontos >= 0 ? "var(--pet-green)" : "#ef4444"};">${h.pontos >= 0 ? "+" : ""}${h.pontos}</div>
            </li>
        `).join("");
    }

    if (!localStorage.getItem("watchedProPet_2026")) showVideoGate();
}

function animarJornada() {
    const line = document.getElementById("horiz-line-active");
    const total = configMapa.length - 1;
    const progress = (window.currentLevelIndex / total) * 100;
    line.style.width = `calc(${progress}% - 50px)`;
}

function renderChart() {
    const ctx = document.getElementById("arrasasChart").getContext("2d");
    if (chartInstance) chartInstance.destroy();
    
    let sum = 0;
    const points = currentData.historico.map(h => { 
        sum += h.pontos; 
        return Math.max(0, sum); 
    });
    const labels = currentData.historico.map(h => h.data);

    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                data: points,
                borderColor: "#6366f1",
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                backgroundColor: "rgba(99, 102, 241, 0.1)",
                pointBackgroundColor: "#fff",
                pointBorderColor: "#6366f1",
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
                    grid: { color: "#f1f5f9" },
                    title: { display: true, text: "Saldo (A$)" }
                }, 
                x: { grid: { display: false } } 
            }
        }
    });
}

function showVideoGate() {
    document.getElementById("video-gate").style.display = "flex";
    document.getElementById("video-iframe").src = "https://drive.google.com/file/d/1r3sF2U6-KzkQEHOJy6c5u3FaZ_t5IH2s/preview?autoplay=1";
}

function closeVideoGate() {
    localStorage.setItem("watchedProPet_2026", "true");
    document.getElementById("video-gate").style.display = "none";
    document.getElementById("video-iframe").src = "";
}

function solicitarResgate() {
    if (confirm("Deseja solicitar o resgate do seu auxílio de R$ 100,00? Você será redirecionada para o WhatsApp de suporte.")) {
        window.open("https://wa.me/5521982013090?text=Quero%20resgatar%20meu%20auxilio%20Profissao%20Pet", "_blank");
    }
}

function abrirModalRecompensas() {
    const modalBody = document.getElementById("modal-recompensas-conteudo");
    modalBody.innerHTML = `
        ${recompensa1}
        ${recompensa2}
        ${recompensa3}
    `;
    document.getElementById("modal-recompensas").style.display = "flex";
    // Biblioteca confetti carregada via CDN
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
    });
}

function fecharModalRecompensas() {
    document.getElementById("modal-recompensas").style.display = "none";
}

async function toggleNotificacoes() {
    const btn = document.getElementById("btn-toggle-notif");
    const loader = document.getElementById("loader"); 
    const isAtivo = btn.innerText === "ATIVADAS";
    
    // Removido o parseamento incorreto de CPF via nome, agora utiliza currentData.cpf já carregado
    const userCpf = currentData.cpf; 

    let novoStatus = isAtivo ? "Não" : "Sim";
    
    if (isAtivo) {
        if (!confirm("Deseja realmente desativar as notificações por WhatsApp? Você pode perder avisos importantes sobre seu saldo e eventos.")) {
            return;
        }
    }

    loader.style.display = "flex";

    try {
        const result = await jsonpRequest({
            action: "updateNotif",
            cpf: userCpf,
            status: novoStatus
        });
        
        if (novoStatus === "Não") {
            btn.innerText = "DESATIVADAS";
            btn.style.background = "#94a3b8";
            alert("Notificações desativadas.");
        } else {
            btn.innerText = "ATIVADAS";
            btn.style.background = "var(--pet-green)";
            alert("Notificações reativadas!");
        }

    } catch (error) {
        console.error("Erro ao atualizar notificações:", error);
        alert("Erro ao conectar ao servidor.");
    } finally {
        loader.style.display = "none";
    }
}

function switchTab(tabId, el) {
    document.querySelectorAll(".tab-content").forEach(content => {
        content.style.display = "none";
        content.setAttribute("aria-hidden", "true");
    });

    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.remove("active");
        btn.setAttribute("aria-selected", "false");
        btn.removeAttribute("tabindex"); 
    });

    const selectedTabContent = document.getElementById(tabId);
    if (selectedTabContent) {
        selectedTabContent.style.display = "block";
        selectedTabContent.setAttribute("aria-hidden", "false");
    }

    if (el) {
        el.classList.add("active");
        el.setAttribute("aria-selected", "true");
        el.setAttribute("tabindex", "0"); 
    }

    if (tabId === "tab-jornada") {
        animarJornada();
    } else if (tabId === "tab-extrato") {
        if (currentData && currentData.historico) {
            renderChart();
        }
    } else if (tabId === "tab-quiz") {
        renderQuiz();
    }
}


document.getElementById("cpf-input").addEventListener("keypress", (e) => { 
    if(e.key === "Enter") verificarCPF(); 
});

function renderQuiz() {
    const quizContent = document.getElementById("quiz-content");

    quizContent.innerHTML = `
        <h4 style="color: var(--pet-purple);">🧠 Quiz Diário da Embaixadora</h4>
        <div id="quiz-question-area">
            <p id="pergunta-txt" style="font-size: 16px; font-weight: 700; margin-bottom: 15px;"></p>
            <div id="opcoes-quiz" style="display: flex; flex-direction: column; gap: 10px;"></div>
        </div>
        <div id="quiz-result" style="margin-top: 20px; font-weight: 700; text-align: center; display: none;"></div>
    `;

    const currentPerguntaTxt = document.getElementById("pergunta-txt");
    const currentOpcoesQuiz = document.getElementById("opcoes-quiz");
    const quizResult = document.getElementById("quiz-result");

    if (currentData.jaRespondeuQuiz) {
        quizResult.style.color = "var(--pet-text-sub)";
        quizResult.innerHTML = `⏳ Você já respondeu o quiz hoje. Volte amanhã!`;
        quizResult.style.display = "block";
        currentPerguntaTxt.style.display = "none";
        currentOpcoesQuiz.style.display = "none";
        return;
    }

    if (DADOS_QUIZ_LOCAL.length === 0) {
        currentPerguntaTxt.innerText = "Nenhuma pergunta de quiz disponível no momento.";
        return;
    }

    const randomIndex = Math.floor(Math.random() * DADOS_QUIZ_LOCAL.length);
    quizData = DADOS_QUIZ_LOCAL[randomIndex];

    currentPerguntaTxt.innerText = quizData.pergunta;
    currentOpcoesQuiz.innerHTML = "";
    quizData.opcoes.forEach(opcao => {
        const button = document.createElement("button");
        button.className = "btn-glow quiz-option-btn";
        button.style.background = "#f1f5f9";
        button.style.color = "var(--pet-text-main)";
        button.style.boxShadow = "none";
        button.style.borderColor = "#e2e8f0";
        button.style.border = "1px solid";
        button.innerText = opcao;
        button.onclick = () => checkQuizAnswer(opcao, currentOpcoesQuiz, quizResult);
        currentOpcoesQuiz.appendChild(button);
    });
}

async function checkQuizAnswer(selectedOption, opcoesQuizElement, quizResultElement) {
    const loaderQuiz = document.getElementById("loader-quiz");
    Array.from(opcoesQuizElement.children).forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = "0.7";
    });

    loaderQuiz.style.display = "flex";

    if (selectedOption === quizData.respostaCorreta) {
        await sendQuizLogToBackend(true, quizData.pergunta);
    } else {
        await sendQuizLogToBackend(false, quizData.pergunta);
    }

    loaderQuiz.style.display = "none";

    Array.from(opcoesQuizElement.children).forEach(btn => {
        if (btn.innerText === quizData.respostaCorreta) {
            btn.style.background = "var(--pet-green)";
            btn.style.color = "white";
        } else if (btn.innerText === selectedOption) {
            btn.style.background = "#ef4444";
            btn.style.color = "white";
        }
    });
}

async function sendQuizLogToBackend(isCorrect, quizPergunta) {
    if (!currentData || !currentData.cpf) {
        console.error("Dados do usuário não disponíveis para enviar o log do quiz.");
        return;
    }

    const nome = currentData.nome.split(" ")[0];
    const cpf = currentData.cpf;
    const acao = isCorrect ? "acerto" : "erro";
    const pontos = isCorrect ? 1 : 0;
    
    // Lógica de e-mail prioritário: localStorage da Circle
    const circleUserEmail = localStorage.getItem("pet_user_email");
    const email = circleUserEmail ? JSON.parse(circleUserEmail).email : (currentData.email || "");

    try {
        const result = await new Promise((resolve, reject) => {
            const callbackName = "jsonp_callback_" + Math.round(100000 * Math.random());
            const timeout = setTimeout(() => {
                window[callbackName] = () => { delete window[callbackName]; };
                const s = document.getElementById(callbackName);
                if (s) document.body.removeChild(s);
                reject(new Error("Tempo limite da requisição excedido."));
            }, 25000);

            window[callbackName] = (data) => {
                clearTimeout(timeout);
                delete window[callbackName];
                const s = document.getElementById(callbackName);
                if (s) document.body.removeChild(s);
                resolve(data);
            };

            const script = document.createElement("script");
            script.id = callbackName;
            script.src = `${urlApp}?action=logAcertoQuiz&nome=${encodeURIComponent(nome)}&cpf=${cpf}&email=${encodeURIComponent(email)}&status=${acao}&pontos=${pontos}&pergunta=${encodeURIComponent(quizPergunta)}&callback=${callbackName}`;
            script.onerror = () => {
                clearTimeout(timeout);
                delete window[callbackName];
                const s = document.getElementById(callbackName);
                if (s) document.body.removeChild(s);
                reject(new Error("Erro ao carregar script (CORS ou rede)."));
            };
            document.body.appendChild(script);
        });

        if (result.erro) {
            document.getElementById("quiz-result").innerHTML = `⏳ ${result.erro}`;
            document.getElementById("quiz-result").style.display = "block";
            document.getElementById("quiz-result").style.color = "#ef4444";
            document.getElementById("quiz-result").style.fontSize = "18px";
            document.getElementById("quiz-result").style.padding = "15px";
            document.getElementById("quiz-result").style.background = "#fee2e2";
            document.getElementById("quiz-result").style.borderRadius = "12px";
            document.getElementById("opcoes-quiz").style.display = "none";
            return;
        }

        if (result.sucesso) {
            if (isCorrect) {
                document.getElementById("quiz-result").style.color = "var(--pet-green)";
                document.getElementById("quiz-result").innerHTML = "🎉 Resposta Correta! Você ganhou 1 Arrasa!";
                document.getElementById("quiz-result").style.display = "block";
                
                if (currentData) {
                    currentData.arrasas = (currentData.arrasas || 0) + 1;
                    document.getElementById("user-arrasas").innerText = currentData.arrasas;
                    
                    const percent = Math.min(100, currentData.arrasas);
                    document.getElementById("meta-txt").innerText = percent;
                    document.querySelector(".progress-bar").setAttribute("aria-valuenow", percent);
                    document.getElementById("bar-fill").style.width = percent + "%";
                    if (currentData.arrasas >= 100) document.getElementById("btn-resgate").style.display = "flex";
                }
            } else {
                document.getElementById("quiz-result").style.color = "#ef4444";
                document.getElementById("quiz-result").innerHTML = `❌ Resposta Incorreta. A resposta certa era: "${quizData.respostaCorreta}"`;
                document.getElementById("quiz-result").style.display = "block";
            }

            // Atualização silenciosa dos dados
            refreshDadosSilencioso(cpf);
        }
    } catch (error) {
        console.error("Erro na comunicação com o backend para registrar log do quiz:", error);
    }
}
