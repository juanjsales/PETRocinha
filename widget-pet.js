(function() {
    // ⚠️ URL DO SEU APP SCRIPT
    var urlApp = "https://script.google.com/macros/s/AKfycbyCtBQ_wVDEpyKybzHgo9eFswc6tczQuFs53VLzg3t9HuoFbLOVVY_zrVScPxIwG2b0/exec";

    // ⚠️ DOMÍNIO CONFIÁVEL DO SEU DASHBOARD
    var TRUSTED_ORIGIN = "https://map-rocinha.vercel.app";

    // --- SISTEMA DE ARMAZENAMENTO SEGURO (Para Aba Anônima) ---
    var memoryStorage = {};
    function safeStorage(action, key, value) {
        try {
            if (action === 'get') return localStorage.getItem(key) || memoryStorage[key];
            if (action === 'set') {
                localStorage.setItem(key, value);
                memoryStorage[key] = value;
            }
            if (action === 'remove') {
                localStorage.removeItem(key);
                delete memoryStorage[key];
            }
        } catch (e) {
            if (action === 'get') return memoryStorage[key];
            if (action === 'set') memoryStorage[key] = value;
            if (action === 'remove') delete memoryStorage[key];
        }
    }

    // --- INJETAR ESTILOS DO WIDGET (CSS + ANIMAÇÕES) ---
    function injectWidgetStyles() {
        if (document.getElementById("pet-widget-combined-styles")) return;
        const style = document.createElement('style');
        style.id = "pet-widget-combined-styles";
        style.innerHTML = `
            /* --- Animações Base --- */
            @keyframes pet-tada {
              from { transform: scale3d(1, 1, 1); }
              10%, 20% { transform: scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg); }
              30%, 50%, 70%, 90% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg); }
              40%, 60%, 80% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg); }
              to { transform: scale3d(1, 1, 1); }
            }
            .pet-celebrate { animation: pet-tada 1s ease-in-out; }
            @keyframes pet-float-up {
              0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
              100% { transform: translate(-50%, -50px) scale(1.5); opacity: 0; }
            }
            @keyframes pet-widget-enter {
              0% { transform: scale(0) translateY(30px); opacity: 0; }
              60% { transform: scale(1.15) translateY(-10px); opacity: 1; }
              100% { transform: scale(1) translateY(0); opacity: 1; }
            }
            .pet-widget-first-show {
              animation: pet-widget-enter 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            @keyframes circleModalPop {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            body.modal-open-circle { overflow: hidden !important; }

            /* --- Estilos do Widget --- */
            #pet-floating-widget {
                position: fixed !important;
                z-index: 2147483647 !important;
                touch-action: none;
                user-select: none;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 8px;
            }
            .pet-widget-container {
                display: flex !important;
                align-items: center !important;
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(10px);
                border-radius: 50px !important;
                padding: 6px !important;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
                border: 2px solid #6366f1 !important;
                transition: transform 0.2s ease;
            }
            .pet-drag-handle {
                cursor: grab !important;
                padding: 0 8px 0 10px !important;
                color: #94a3b8 !important;
                font-size: 16px !important;
                display: flex;
                align-items: center;
                border-right: 1px solid #e2e8f0;
                margin-right: 4px;
            }
            .pet-drag-handle:active { cursor: grabbing !important; }
            .pet-widget-main-content {
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                cursor: pointer !important;
                padding-right: 10px;
            }
            .pet-widget-badge { width: 44px !important; height: 44px !important; border-radius: 50% !important; pointer-events: none; }
            .pet-widget-info { display: flex !important; flex-direction: column !important; }
            .pet-widget-label { font-size: 9px !important; color: #94a3b8 !important; text-transform: uppercase !important; font-weight: 800 !important; line-height: 1 !important; }
            .pet-widget-value { font-size: 18px !important; color: #6366f1 !important; font-weight: 800 !important; line-height: 1.2 !important; }
            .pet-btn-minimize {
                width: 24px !important; height: 24px !important; background: #f1f5f9 !important; border: none !important; border-radius: 50% !important;
                color: #64748b !important; font-size: 12px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; margin-right: 6px !important; transition: background 0.2s;
            }
            .pet-btn-minimize:hover { background: #e2e8f0 !important; }
            .pet-minimized-icon {
                width: 50px !important; height: 50px !important; background: #6366f1 !important; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4) !important; color: white !important; font-size: 22px !important; transition: transform 0.3s;
            }
            .pet-minimized-icon:hover { transform: scale(1.1); }
            @keyframes pet-float-up-dynamic {
                0% { transform: translate(-50%, 0) scale(0.5); opacity: 0; }
                20% { transform: translate(-50%, -25px) scale(1.2); opacity: 1; }
                80% { transform: translate(-50%, -45px) scale(1); opacity: 1; }
                100% { transform: translate(-50%, -60px) scale(0.8); opacity: 0; }
            }
            @keyframes pet-glow-pulse {
                0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); border-color: #22c55e; }
                50% { box-shadow: 0 0 25px 10px rgba(34, 197, 94, 0); border-color: #4ade80; }
                100% { box-shadow: 0 10px 30px rgba(0,0,0,0.2); border-color: #6366f1; }
            }
            .pet-celebration-glow { animation: pet-glow-pulse 1.2s ease-out; }
            @keyframes pet-gentle-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
            .pet-widget-alert-text { animation: pet-gentle-bounce 2s ease-in-out infinite; }
            .pet-hidden { display: none !important; }
        `;
        document.head.appendChild(style);
    }

    // 1. CAPTURA DE E-MAIL GLOBAL DA PLATAFORMA (CIRCLE INTEGRADA)
    function getEmail() {
        let userEmail = safeStorage('get', 'pet_user_email');
        let currentSystemEmail = null;
        let currentSource = null;

        try {
            // 💡 ESTRATÉGIA SUPREMA: Captura nativa do objeto logado da Circle em qualquer página
            if (window.Circle?.currentUser?.email) {
                currentSystemEmail = window.Circle.currentUser.email.toLowerCase().trim();
                currentSource = 'circle_native';
            }

            // Fallback 1: LocalStorage Context do IIC
            if (!currentSystemEmail) {
                let punditContext = localStorage.getItem('V1-PunditUserContext');
                if (punditContext) {
                    let parsedContext = JSON.parse(punditContext);
                    if (parsedContext?.current_user?.email) {
                        currentSystemEmail = parsedContext.current_user.email.toLowerCase().trim();
                        currentSource = 'circle_pundit';
                    }
                }
            }

            // Fallback 2: Chaves Legadas
            if (!currentSystemEmail && window.circleUser?.email) {
                currentSystemEmail = window.circleUser.email.toLowerCase().trim();
                currentSource = 'circle_legacy';
            }

            if (currentSystemEmail && userEmail && currentSystemEmail !== userEmail) {
                safeStorage('remove', 'userSaldo');
                safeStorage('remove', 'userBadge');
                safeStorage('remove', 'userSocioeconomico');
                userEmail = currentSystemEmail;
                safeStorage('set', 'pet_user_email', userEmail);
                safeStorage('set', 'pet_login_source', currentSource);
            } 
            else if (currentSystemEmail && (!userEmail || userEmail === "undefined" || userEmail === "null")) {
                userEmail = currentSystemEmail;
                safeStorage('set', 'pet_user_email', userEmail);
                safeStorage('set', 'pet_login_source', currentSource);
            }
        } catch (e) { console.warn("Erro ao processar e-mail."); }
        
        return (userEmail && userEmail !== "null") ? userEmail : null;
    }

    // 2. SISTEMA DE ARRASTE DO WIDGET
    function setupDraggable(elmnt) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const savedX = safeStorage('get', 'petX'), savedY = safeStorage('get', 'petY');
        
        if (savedX && savedY) { 
            elmnt.style.left = savedX; 
            elmnt.style.top = savedY; 
            elmnt.style.bottom = 'auto'; 
            elmnt.style.right = 'auto';
        } else { 
            elmnt.style.bottom = "25px"; 
            elmnt.style.right = "25px"; 
        }

        const handle = elmnt.querySelector('.pet-drag-handle') || elmnt;
        handle.onmousedown = dragMouseDown;
        handle.ontouchstart = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            pos3 = e.clientX || (e.touches ? e.touches[0].clientX : 0);
            pos4 = e.clientY || (e.touches ? e.touches[0].clientY : 0);
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            let cx = e.clientX || (e.touches ? e.touches[0].clientX : 0);
            let cy = e.clientY || (e.touches ? e.touches[0].clientY : 0);
            pos1 = pos3 - cx; pos2 = pos4 - cy;
            pos3 = cx; pos4 = cy;
            
            let newTop = elmnt.offsetTop - pos2;
            let newLeft = elmnt.offsetLeft - pos1;
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - elmnt.offsetHeight));
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - elmnt.offsetWidth));

            elmnt.style.top = newTop + "px";
            elmnt.style.left = newLeft + "px";
            elmnt.style.bottom = 'auto'; elmnt.style.right = 'auto';
        }

        function closeDragElement() {
            document.onmouseup = null; document.onmousemove = null;
            document.ontouchend = null; document.ontouchmove = null;
            safeStorage('set', 'petX', elmnt.style.left);
            safeStorage('set', 'petY', elmnt.style.top);
        }
    }

    function togglePetWidget(e) {
        if (e) e.stopPropagation();
        const isMin = safeStorage('get', 'petMinimized') === 'true';
        safeStorage('set', 'petMinimized', !isMin);
        
        renderizar({ 
            encontrado: true, 
            arrasas: safeStorage('get', 'userSaldo') || 0, 
            badge: safeStorage('get', 'userBadge') || "", 
            isCache: true 
        });
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerText = Math.floor(progress * (end - start) + start) + " Arrasas";
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }

    function showCelebration(widget, amount) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                if (ctx.state === 'suspended') ctx.resume();
                const osc1 = ctx.createOscillator();
                const gain = ctx.createGain();
                osc1.connect(gain); gain.connect(ctx.destination);
                osc1.type = 'triangle';
                osc1.frequency.setValueAtTime(987.77, ctx.currentTime);
                osc1.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                osc1.start(ctx.currentTime); 
                osc1.stop(ctx.currentTime + 0.4);
            }
        } catch(e) {}

        const floatText = document.createElement('div');
        floatText.innerText = '+' + amount;
        floatText.style.cssText = 'position:absolute; top:-10px; left:50%; color:#22c55e; font-weight:900; font-size:28px; text-shadow: 0 2px 10px rgba(34,197,94,0.5), 0 3px 6px rgba(0,0,0,0.3); pointer-events:none; z-index:2147483647; animation: pet-float-up-dynamic 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;';
        widget.appendChild(floatText);
        setTimeout(() => { if (floatText.parentNode) floatText.parentNode.removeChild(floatText); }, 1500);

        const colors = ['#f8a5c2', '#6366f1', '#22c55e', '#FFD700', '#ff2a7a'];
        for (let i = 0; i < 20; i++) {
            const conf = document.createElement('div');
            const size = Math.random() > 0.5 ? '8px' : '5px';
            const isCircle = Math.random() > 0.4 ? '50%' : '2px';
            conf.style.cssText = `position:absolute; width:${size}; height:${size}; background-color:${colors[Math.floor(Math.random() * colors.length)]}; top:30px; left:50%; border-radius:${isCircle}; pointer-events:none; z-index:2147483646;`;
            
            const angle = Math.random() * Math.PI * 2;
            const velocity = 40 + Math.random() * 60;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity - 50; 
            
            conf.animate([{ transform: 'translate(-50%, 0) scale(1) rotate(0deg)', opacity: 1 }, { transform: `translate(calc(-50% + ${tx}px), ${ty}px) scale(0.5) rotate(${Math.random() * 360}deg)`, opacity: 0 }], { duration: 800 + Math.random() * 400, easing: 'cubic-bezier(.37,0,.23,1)', fill: 'forwards' });
            widget.appendChild(conf);
            setTimeout(() => { if (conf.parentNode) conf.parentNode.removeChild(conf); }, 1200);
        }
    }

    function playPopSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                if (ctx.state === 'suspended') ctx.resume();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.05, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
            }
        } catch(e) {}
    }

    // 🚀 EXIBIÇÃO DA TRAVA SOCIOECONÔMICA (POP-UP GLOBAL)
    function exibirTravaSocioeconomicoPopup() {
        if (document.getElementById("circle-popup-socoeco")) return;
        if (sessionStorage.getItem('pet_popup_ignorado_sessao') === 'true') return; // Respeita a navegação na sessão atual

        const modalHtml = `
            <div id="circle-popup-socoeco" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 99999999 !important; display: flex; align-items: center; justify-content: center; font-family: 'Plus Jakarta Sans', sans-serif, Arial;">
                <div style="background: white; width: 90%; max-width: 500px; border-radius: 16px; padding: 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3); position: relative; animation: circleModalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                    
                    <h3 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #003366; line-height: 1.3;">🚀 Ative suas Medalhas e Prêmios, Mulher!</h3>
                    
                    <p style="font-size: 14px; color: #4a5568; margin: 0 0 24px; line-height: 1.6; text-align: center;">
                        O nosso novo curso de <strong>Pet Sitter</strong> já está liberado pra você decolar! Mas se você quer entrar no jogo pra vencer, acumular <strong>Arrasas</strong> e **botar no bolso o seu auxílio de R$ 100,00 em dinheiro**, falta só preencher o formulário socioeconômico!
                    </p>
                    
                    <a href="https://comunidade.aprenderecuidar.com.br/c/formulario-socioeconomico" target="_blank" style="display: block; background: #003366; color: white; text-decoration: none; padding: 14px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-bottom: 16px; text-align: center; transition: background 0.2s;">
                        Preencher e Ativar Meu Saldo 🐾
                    </a>
                    
                    <button id="close-circle-popup-btn" style="background: none; border: none; color: #64748b; font-size: 12px; cursor: pointer; text-decoration: underline;">
                        Vou preencher mais tarde
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.classList.add('modal-open-circle');

        document.getElementById("close-circle-popup-btn").addEventListener("click", function() {
            const modal = document.getElementById("circle-popup-socoeco");
            if (modal) {
                modal.remove();
                document.body.classList.remove('modal-open-circle');
                sessionStorage.setItem('pet_popup_ignorado_sessao', 'true'); // Silencia apenas nesta aba aberta para não cansar
            }
        });
    }

    // 5. RENDERIZAÇÃO DO WIDGET FLUTUANTE
    function renderizar(data) {
        let widget = document.getElementById('pet-floating-widget');

        const isMinimized = safeStorage('get', 'petMinimized') === 'true';
        const isAluna = data && data.encontrado;
        const valorNovo = isAluna ? parseInt(data.arrasas || 0) : 0;
        const valorAnterior = parseInt(safeStorage('get', 'userSaldo') || 0);

        if (isAluna && !data.isCache) {
            safeStorage('set', 'userSaldo', valorNovo);
            if(data.badge && String(data.badge).trim() !== "") {
                safeStorage('set', 'userBadge', data.badge);
            } else {
                safeStorage('remove', 'userBadge');
            }
            if(data.socioeconomico !== undefined) {
                const isSocioValido = data.socioeconomico === true || data.socioeconomico === 'true' || data.socioeconomico === 'Sim' || data.socioeconomico === 1;
                safeStorage('set', 'userSocioeconomico', isSocioValido ? 'true' : 'false');
            }
        }

        const hasSocioeconomico = isAluna && safeStorage('get', 'userSocioeconomico') === 'true';
        const currentBadge = safeStorage('get', 'userBadge');
        const hasBadge = isAluna && currentBadge && String(currentBadge).trim() !== "";

        // O widget flutuante lateral some se não houver medalhas, mas a trava global do pop-up continua ativa!
        if (!hasSocioeconomico || !hasBadge) {
            if (widget) widget.style.display = 'none';
            return;
        }

        if (!widget) {
            widget = document.createElement('div');
            widget.id = 'pet-floating-widget';
            widget.classList.add('pet-widget-first-show');
            document.body.appendChild(widget);
            setupDraggable(widget);
            playPopSound();
            setTimeout(() => { if (widget) widget.classList.remove('pet-widget-first-show'); }, 800);
        }
        
        widget.style.display = 'flex';

        if (isMinimized) {
            widget.innerHTML = `<div class="pet-minimized-icon" id="pet-btn-maximize">🐾</div>`;
        } else {
            const getBadgeImg = (b) => {
                if (!b || String(b).trim() === "") return "";
                const s = String(b).toLowerCase();
                if (s.includes("mulher")) return "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Mulher.webp";
                if (s.includes("fera")) return "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Fera.webp";
                if (s.includes("profissional")) return "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Prof.webp";
                if (s.includes("embaixadora")) return "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Embaixadora.webp";
                if (s.includes("aprendiz")) return "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Aprendiz.webp";
                return "";
            };
            const badge = getBadgeImg(data?.badge);
            const badgeHtml = badge ? `<img src="${badge}" class="pet-widget-badge" ondragstart="return false">` : `<div class="pet-widget-badge" style="display: flex; align-items: center; justify-content: center; font-size: 24px; background: rgba(0,0,0,0.05); border-radius: 50%;">🐾</div>`;

            const contentAluna = `
                ${badgeHtml}
                <div class="pet-widget-info">
                    <span class="pet-widget-label">Saldo</span>
                    <span class="pet-widget-value" id="pet-val">${valorAnterior} Arrasas</span>
                </div>
            `;

            const contentVisitante = `
                <div class="pet-widget-badge" style="display: flex; align-items: center; justify-content: center; font-size: 24px; background: rgba(0,0,0,0.05); border-radius: 50%;">👋</div>
                <div class="pet-widget-info" style="display: flex; flex-direction: column; justify-content: center; width: 100%;">
                    <span class="pet-widget-value pet-widget-alert-text" style="font-size: 10px; font-weight: bold; white-space: normal; line-height: 1.2; text-align: left; color: #333;">Cadastre-se ou<br>Faça Login</span>
                </div>
            `;

            widget.innerHTML = `
                <div class="pet-widget-container">
                    <div class="pet-drag-handle">⠿</div>
                    <div class="pet-widget-main-content" id="pet-main-content">
                        ${isAluna ? contentAluna : contentVisitante}
                    </div>
                    <button class="pet-btn-minimize" id="pet-btn-minimize">✕</button>
                </div>
            `;
            
            const valEl = document.getElementById('pet-val');
            if (valEl) {
                if (valorNovo !== valorAnterior) {
                    animateValue(valEl, valorAnterior, valorNovo, 1500);
                    if (valorNovo > valorAnterior && !isMinimized) {
                        widget.classList.add('pet-celebrate', 'pet-celebration-glow');
                        showCelebration(widget, valorNovo - valorAnterior);
                        setTimeout(() => { widget.classList.remove('pet-celebrate', 'pet-celebration-glow'); }, 1000);
                    }
                } else {
                    valEl.innerText = valorNovo + " Arrasas";
                }
            }
        }

        const btnMinimize = document.getElementById('pet-btn-minimize');
        const btnMaximize = document.getElementById('pet-btn-maximize');
        const mainContent = document.getElementById('pet-main-content');

        if (btnMinimize) btnMinimize.addEventListener('click', togglePetWidget);
        if (btnMaximize) btnMaximize.addEventListener('click', togglePetWidget);
        if (mainContent) {
            mainContent.addEventListener('click', () => window.open(isAluna ? "/dash_aluna" : "/sign_up", '_self'));
        }
    }

    // 6. CONTROLADOR CENTRAL DE CONSULTA
    function iniciarWidget() {
        const cachedEmail = safeStorage('get', 'pet_user_email');
        const loginSource = safeStorage('get', 'pet_login_source');
        let isLoggedOut = false;
        
        let punditContext = localStorage.getItem('V1-PunditUserContext');
        let hasPunditUser = false;
        if (punditContext) {
            try {
                let parsedContext = JSON.parse(punditContext);
                if (parsedContext?.current_user?.email) hasPunditUser = true;
            } catch(e) {}
        }

        if (loginSource === 'circle_pundit' && !hasPunditUser) isLoggedOut = true;
        else if (loginSource === 'circle_native' && !window.Circle?.currentUser?.email) isLoggedOut = true;

        if (cachedEmail && isLoggedOut) {
            safeStorage('remove', 'pet_user_email');
            safeStorage('remove', 'userSaldo');
            safeStorage('remove', 'userBadge');
            safeStorage('remove', 'userSocioeconomico');
            safeStorage('remove', 'pet_login_source');
            renderizar({ encontrado: false, arrasas: 0, badge: null, isCache: true });
            return;
        }

        var email = getEmail();

        // Modo Sandbox
        const isSandbox = window.location.search.includes('sandbox') || email === "teste@sandbox.com";
        if (isSandbox) {
            email = "teste@sandbox.com";
            safeStorage('set', 'pet_user_email', email);
            window.receberDadosPet({
                encontrado: true,
                email: email,
                arrasas: safeStorage('get', 'userSaldo') || 10,
                badge: safeStorage('get', 'userBadge') || "Aprendiz Curiosa 🐾",
                socioeconomico: false // Abre o pop-up no sandbox
            });
            return;
        }

        if (!email) {
            renderizar({ encontrado: false, arrasas: 0, badge: null, isCache: true });
            return;
        }

        // Executa a requisição JSONP para capturar os dados do Google Sheets
        var script = document.createElement('script');
        var ts = new Date().getTime();
        script.src = urlApp + "?email=" + encodeURIComponent(email) + 
                     "&ultimoSaldo=" + (safeStorage('get', 'userSaldo') || 0) + 
                     "&action=widget" +
                     "&callback=receberDadosPet&t=" + ts;

        document.body.appendChild(script);
        script.onload = function() { if(this.parentNode) this.parentNode.removeChild(this); };
        script.onerror = function() { if(this.parentNode) this.parentNode.removeChild(this); };
    }

    // 🔥 FIX COMPLETO DA INTERCEPTAÇÃO: O pop-up agora ignora a trava de "encontrado" do banco
    window.receberDadosPet = function(data) {
        // Verifica de ponta a ponta se o formulário está preenchido
        const isSocioValido = data && data.encontrado && (data.socioeconomico === true || data.socioeconomico === 'true' || data.socioeconomico === 'Sim' || data.socioeconomico === 1);
        
        // Se a usuária está logada na Circle mas o socioeconômico não está válido (ou não foi achado no banco), sobe o pop-up!
        if (!isSocioValido && getEmail()) {
            exibirTravaSocioeconomicoPopup();
        }

        if (data && data.encontrado) {
            if (data.email) safeStorage('set', 'pet_user_email', data.email.toLowerCase().trim());
            data.isCache = false;
            safeStorage('set', 'userSocioeconomico', isSocioValido ? 'true' : 'false');
            renderizar(data); 
        } else {
            safeStorage('remove', 'pet_user_email');
            safeStorage('remove', 'userSaldo');
            safeStorage('remove', 'userBadge');
            safeStorage('remove', 'userSocioeconomico');
            safeStorage('remove', 'pet_login_source');
            renderizar({ encontrado: false, arrasas: 0, badge: null, isCache: false });
        }
    };

    // 7. LISTENER DE COMUNICAÇÃO (IFRAMES DASHBOARD VERCEL)
    window.addEventListener('message', (event) => {
        const isSandbox = window.location.search.includes('sandbox');
        if (!isSandbox && event.origin !== TRUSTED_ORIGIN && event.origin !== "http://localhost:3000") return;

        if (event.data === 'REQUEST_EMAIL') {
            const email = getEmail();
            if (email) event.source.postMessage({ email: email }, event.origin);
        }

        if (event.data && event.data.type === 'PET_UPDATE') {
            const updatePayload = event.data.payload;
            const currentUserEmail = getEmail();
            if (updatePayload?.email && updatePayload.email.toLowerCase().trim() === currentUserEmail) {
                updatePayload.isCache = false;
                renderizar(updatePayload);
            }
        }
    });

    // 8. CONEXÃO DE STARTUP
    injectWidgetStyles();

    if (safeStorage('get', 'petMinimized') == null) {
        safeStorage('set', 'petMinimized', 'true');
    }

    const cEmail = safeStorage('get', 'pet_user_email');
    const cS = safeStorage('get', 'userSaldo');
    const isProvavelAluna = !!cEmail && cS !== null && cS !== undefined;
    
    renderizar({ 
        encontrado: isProvavelAluna, arrasas: cS || 0, badge: safeStorage('get', 'userBadge'), isCache: true 
    });

    // Inicialização segura respeitando o ciclo de vida do DOM da Circle
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(iniciarWidget, 1000);
    } else {
        window.addEventListener("load", () => setTimeout(iniciarWidget, 1000));
    }
    
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') iniciarWidget();
    });

    setInterval(() => {
        if (document.visibilityState === 'visible') iniciarWidget();
    }, 45000);
})();
