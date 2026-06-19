(function() {
    // ⚠️ URL DO SEU APP SCRIPT
    var urlApp = "https://script.google.com/macros/s/AKfycbyCtBQ_wVDEpyKybzHgo9eFswc6tczQuFs53VLzg3t9HuoFbLOVVY_zrVScPxIwG2b0/exec";

    // ⚠️ DOMÍNIO CONFIÁVEL DO SEU DASHBOARD
    var TRUSTED_ORIGIN = "https://map-rocinha.vercel.app";

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

    function injectWidgetStyles() {
        if (document.getElementById("pet-widget-combined-styles")) return;
        const style = document.createElement('style');
        style.id = "pet-widget-combined-styles";
        style.innerHTML = `
            @keyframes pet-tada {
              from { transform: scale3d(1, 1, 1); }
              10%, 20% { transform: scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg); }
              30%, 50%, 70%, 90% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg); }
              40%, 60%, 80% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg); }
              to { transform: scale3d(1, 1, 1); }
            }
            .pet-celebrate { animation: pet-tada 1s ease-in-out; }
            @keyframes pet-widget-enter {
              0% { transform: scale(0) translateY(30px); opacity: 0; }
              60% { transform: scale(1.15) translateY(-10px); opacity: 1; }
              100% { transform: scale(1) translateY(0); opacity: 1; }
            }
            .pet-widget-first-show { animation: pet-widget-enter 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
            @keyframes circleModalPop {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            body.modal-open-circle { overflow: hidden !important; }

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
        `;
        document.head.appendChild(style);
    }

    // 💡 CAPTURA CORRIGIDA: Agora busca no LocalStorage Pundit Context que roda na Circle toda!
    function getEmail() {
        let userEmail = safeStorage('get', 'pet_user_email');
        let currentSystemEmail = null;
        let currentSource = null;

        try {
            // Rota 1: Pundit Token (Presente em TODAS as páginas da Circle)
            let punditContext = localStorage.getItem('V1-PunditUserContext');
            if (punditContext) {
                let parsedContext = JSON.parse(punditContext);
                if (parsedContext?.current_user?.email) {
                    currentSystemEmail = parsedContext.current_user.email.toLowerCase().trim();
                    currentSource = 'circle_pundit';
                }
            }
            // Rota 2: Objeto Nativo (Garante funcionamento no painel BI)
            if (!currentSystemEmail && window.Circle?.currentUser?.email) {
                currentSystemEmail = window.Circle.currentUser.email.toLowerCase().trim();
                currentSource = 'circle_native';
            }
            // Rota 3: Fallback Legado
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
        } catch (e) {}
        return (userEmail && userEmail !== "null") ? userEmail : null;
    }

    function setupDraggable(elmnt) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const savedX = safeStorage('get', 'petX'), savedY = safeStorage('get', 'petY');
        if (savedX && savedY) { 
            elmnt.style.left = savedX; elmnt.style.top = savedY; elmnt.style.bottom = 'auto'; elmnt.style.right = 'auto';
        } else { 
            elmnt.style.bottom = "25px"; elmnt.style.right = "25px"; 
        }
        const handle = elmnt.querySelector('.pet-drag-handle') || elmnt;
        handle.onmousedown = dragMouseDown; handle.ontouchstart = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            pos3 = e.clientX || (e.touches ? e.touches[0].clientX : 0);
            pos4 = e.clientY || (e.touches ? e.touches[0].clientY : 0);
            document.onmouseup = closeDragElement; document.onmousemove = elementDrag;
            document.ontouchend = closeDragElement; document.ontouchmove = elementDrag;
        }
        function elementDrag(e) {
            e = e || window.event;
            let cx = e.clientX || (e.touches ? e.touches[0].clientX : 0);
            let cy = e.clientY || (e.touches ? e.touches[0].clientY : 0);
            pos1 = pos3 - cx; pos2 = pos4 - cy; pos3 = cx; pos4 = cy;
            let newTop = elmnt.offsetTop - pos2; let newLeft = elmnt.offsetLeft - pos1;
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - elmnt.offsetHeight));
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - elmnt.offsetWidth));
            elmnt.style.top = newTop + "px"; elmnt.style.left = newLeft + "px";
        }
        function closeDragElement() {
            document.onmouseup = null; document.onmousemove = null;
            safeStorage('set', 'petX', elmnt.style.left); safeStorage('set', 'petY', elmnt.style.top);
        }
    }

    function togglePetWidget(e) {
        if (e) e.stopPropagation();
        const isMin = safeStorage('get', 'petMinimized') === 'true';
        safeStorage('set', 'petMinimized', !isMin);
        renderizar({ encontrado: true, arrasas: safeStorage('get', 'userSaldo') || 0, badge: safeStorage('get', 'userBadge') || "", isCache: true });
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
        const floatText = document.createElement('div');
        floatText.innerText = '+' + amount;
        floatText.style.cssText = 'position:absolute; top:-10px; left:50%; color:#22c55e; font-weight:900; font-size:28px; text-shadow: 0 2px 10px rgba(34,197,94,0.5), 0 3px 6px rgba(0,0,0,0.3); pointer-events:none; z-index:2147483647; animation: pet-float-up-dynamic 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;';
        widget.appendChild(floatText);
        setTimeout(() => { if (floatText.parentNode) floatText.parentNode.removeChild(floatText); }, 1500);
    }

    function exibirTravaSocioeconomicoPopup() {
        if (document.getElementById("circle-popup-socoeco")) return;
        if (sessionStorage.getItem('pet_popup_ignorado_sessao') === 'true') return;

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
                sessionStorage.setItem('pet_popup_ignorado_sessao', 'true');
            }
        });
    }

    function renderizar(data) {
        let widget = document.getElementById('pet-floating-widget');
        const isMinimized = safeStorage('get', 'petMinimized') === 'true';
        const isAluna = data && data.encontrado;
        const valorNovo = isAluna ? parseInt(data.arrasas || 0) : 0;
        const valorAnterior = parseInt(safeStorage('get', 'userSaldo') || 0);

        if (isAluna && !data.isCache) {
            safeStorage('set', 'userSaldo', valorNovo);
            if(data.badge && String(data.badge).trim() !== "") safeStorage('set', 'userBadge', data.badge);
            if(data.socioeconomico !== undefined) {
                const isSocioValido = data.socioeconomico === true || data.socioeconomico === 'true' || data.socioeconomico === 'Sim' || data.socioeconomico === 1;
                safeStorage('set', 'userSocioeconomico', isSocioValido ? 'true' : 'false');
            }
        }

        const hasSocioeconomico = isAluna && safeStorage('get', 'userSocioeconomico') === 'true';
        const hasBadge = isAluna && safeStorage('get', 'userBadge');

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
            setTimeout(() => { if (widget) widget.classList.remove('pet-widget-first-show'); }, 800);
        }
        widget.style.display = 'flex';

        if (isMinimized) {
            widget.innerHTML = `<div class="pet-minimized-icon" id="pet-btn-maximize">🐾</div>`;
        } else {
            const getBadgeImg = (b) => {
                if (!b) return "";
                const s = String(b).toLowerCase();
                if (s.includes("mulher")) return "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Mulher.webp";
                if (s.includes("fera")) return "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Fera.webp";
                if (s.includes("profissional")) return "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Prof.webp";
                if (s.includes("embaixadora")) return "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Embaixadora.webp";
                if (s.includes("aprendiz")) return "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Aprendiz.webp";
                return "";
            };
            const badge = getBadgeImg(data?.badge);
            const badgeHtml = badge ? `<img src="${badge}" class="pet-widget-badge">` : `<div class="pet-widget-badge">🐾</div>`;

            widget.innerHTML = `
                <div class="pet-widget-container">
                    <div class="pet-drag-handle">⠿</div>
                    <div class="pet-widget-main-content" id="pet-main-content">
                        ${badgeHtml}
                        <div class="pet-widget-info">
                            <span class="pet-widget-label">Saldo</span>
                            <span class="pet-widget-value" id="pet-val">${valorAnterior} Arrasas</span>
                        </div>
                    </div>
                    <button class="pet-btn-minimize" id="pet-btn-minimize">✕</button>
                </div>
            `;
            const valEl = document.getElementById('pet-val');
            if (valEl && valorNovo !== valorAnterior) {
                animateValue(valEl, valorAnterior, valorNovo, 1500);
            }
        }

        document.getElementById('pet-btn-minimize')?.addEventListener('click', togglePetWidget);
        document.getElementById('pet-btn-maximize')?.addEventListener('click', togglePetWidget);
        document.getElementById('pet-main-content')?.addEventListener('click', () => window.open(isAluna ? "/dash_aluna" : "/sign_up", '_self'));
    }

    function iniciarWidget() {
        var email = getEmail();
        if (!email) return;

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

    window.receberDadosPet = function(data) {
        const isSocioValido = data && data.encontrado && (data.socioeconomico === true || data.socioeconomico === 'true' || data.socioeconomico === 'Sim' || data.socioeconomico === 1);
        
        // 💡 DESTRANCADO: Ativa o pop-up usando o e-mail descriptografado do LocalStorage Pundit
        if (!isSocioValido && getEmail()) {
            exibirTravaSocioeconomicoPopup();
        }

        if (data && data.encontrado) {
            if (data.email) safeStorage('set', 'pet_user_email', data.email.toLowerCase().trim());
            data.isCache = false;
            renderizar(data); 
        } else {
            renderizar({ encontrado: false, arrasas: 0, badge: null, isCache: false });
        }
    };

    injectWidgetStyles();
    if (safeStorage('get', 'petMinimized') == null) safeStorage('set', 'petMinimized', 'true');
    
    const cEmail = safeStorage('get', 'pet_user_email');
    const cS = safeStorage('get', 'userSaldo');
    renderizar({ encontrado: !!cEmail && cS !== null, arrasas: cS || 0, badge: safeStorage('get', 'userBadge'), isCache: true });

    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(iniciarWidget, 1000);
    } else {
        window.addEventListener("load", () => setTimeout(iniciarWidget, 1000));
    }
})();
