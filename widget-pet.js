(function() {
    // ⚠️ URL DO SEU APP SCRIPT
    var urlApp = "https://script.google.com/macros/s/AKfycbyCtBQ_wVDEpyKybzHgo9eFswc6tczQuFs53VLzg3t9HuoFbLOVVY_zrVScPxIwG2b0/exec";

    // ⚠️ DOMÍNIO CONFIÁVEL DO SEU DASHBOARD (Ajuste para a URL real do seu Vercel)
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
            // Se o localStorage estiver bloqueado (Aba Anônima), usa a memória RAM
            if (action === 'get') return memoryStorage[key];
            if (action === 'set') memoryStorage[key] = value;
            if (action === 'remove') delete memoryStorage[key];
        }
    }

    // --- INJETAR ESTILOS DE ANIMAÇÃO ---
    function injectAnimationStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes pet-tada {
              from { transform: scale3d(1, 1, 1); }
              10%, 20% { transform: scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg); }
              30%, 50%, 70%, 90% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg); }
              40%, 60%, 80% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg); }
              to { transform: scale3d(1, 1, 1); }
            }
            .pet-celebrate {
              animation: pet-tada 1s ease-in-out;
            }
        `;
        document.head.appendChild(style);
    }

    // 1. CAPTURA DE E-MAIL COM PERSISTÊNCIA
    function getEmail() {
        let userEmail = safeStorage('get', 'pet_user_email');
        let currentSystemEmail = null;
        let currentSource = null;

        try {
            // 1. Tenta pegar da chave do Pundit (Circle)
            let punditContext = localStorage.getItem('V1-PunditUserContext');
            if (punditContext) {
                try {
                    let parsedContext = JSON.parse(punditContext);
                    if (parsedContext && parsedContext.current_user && parsedContext.current_user.email) {
                        currentSystemEmail = parsedContext.current_user.email.toLowerCase().trim();
                        currentSource = 'circle_pundit';
                    }
                } catch(e) {}
            }

            // 2. Fallbacks antigos
            if (!currentSystemEmail) {
                if (window.circleUser && window.circleUser.email) {
                    currentSystemEmail = window.circleUser.email.toLowerCase().trim();
                    currentSource = 'circle';
                } else {
                    let liquidEmail = "{{ user.email }}";
                    if (liquidEmail && liquidEmail.indexOf('{{') === -1 && liquidEmail.trim() !== "") {
                        currentSystemEmail = liquidEmail.toLowerCase().trim();
                        currentSource = 'liquid';
                    }
                }
            }

            // Detecta se houve troca de conta em relação ao cache salvo
            if (currentSystemEmail && userEmail && currentSystemEmail !== userEmail) {
                safeStorage('remove', 'userSaldo');
                safeStorage('remove', 'userBadge');
                userEmail = currentSystemEmail;
                safeStorage('set', 'pet_user_email', userEmail);
                if (currentSource) safeStorage('set', 'pet_login_source', currentSource);
            } 
            // Se não tinha cache, mas tem usuário ativo no sistema
            else if (currentSystemEmail && (!userEmail || userEmail === "undefined" || userEmail === "null")) {
                userEmail = currentSystemEmail;
                safeStorage('set', 'pet_user_email', userEmail);
                if (currentSource) safeStorage('set', 'pet_login_source', currentSource);
            }
        } catch (e) { console.warn("Erro ao capturar e-mail."); }
        
        return (userEmail && userEmail !== "null") ? userEmail : null;
    }

    // 2. SISTEMA DE ARRASTE
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

        const handle = elmnt.querySelector('.drag-handle') || elmnt;
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
            
            // Impede que o widget seja arrastado para fora da tela
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

    // 3. MINIMIZAR
    function togglePetWidget(e) {
        if (e) e.stopPropagation();
        const isMin = safeStorage('get', 'petMinimized') === 'true';
        safeStorage('set', 'petMinimized', !isMin);
        
        renderizar({ 
            encontrado: true, 
            arrasas: safeStorage('get', 'userSaldo') || 0, 
            badge: safeStorage('get', 'userBadge') || "Aprendiz Curiosa 🐾", 
            isCache: true 
        });
    }

    // 4. ANIMAÇÃO
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

    // 5. RENDERIZAÇÃO
    function renderizar(data) {
        let widget = document.getElementById('pet-floating-widget');
        if (!widget) {
            widget = document.createElement('div');
            widget.id = 'pet-floating-widget';
            document.body.appendChild(widget);
            setupDraggable(widget);
        }

        const isMinimized = safeStorage('get', 'petMinimized') === 'true';
        const isAluna = data && data.encontrado;
        const valorNovo = isAluna ? parseInt(data.arrasas || 0) : 0;
        const valorAnterior = parseInt(safeStorage('get', 'userSaldo') || 0);

        if (isAluna && !data.isCache) {
            safeStorage('set', 'userSaldo', valorNovo);
            if(data.badge) safeStorage('set', 'userBadge', data.badge);
        }

        if (isMinimized) {
            widget.innerHTML = `<div class="minimized-icon" id="pet-btn-maximize">🐾</div>`;
        } else {
            const imgs = {
                "Aprendiz Curiosa 🐾": "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Aprendiz.webp",
                "Mulher de Propósito ✨": "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Mulher.webp",
                "Fera da Técnica 🎓": "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Fera.webp",
                "Profissional que Arrasa 💼": "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Prof.webp",
                "Embaixadora Pet Rocinha 👑": "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Embaixadora.webp"
            };
            const badge = imgs[data?.badge] || imgs["Aprendiz Curiosa 🐾"];

            const contentAluna = `
                <img src="${badge}" class="widget-badge" ondragstart="return false">
                <div class="widget-info">
                    <span class="widget-label">Saldo</span>
                    <span class="widget-value" id="pet-val">${valorAnterior} Arrasas</span>
                </div>
            `;

            const contentVisitante = `
                <div class="widget-badge" style="display: flex; align-items: center; justify-content: center; font-size: 24px; background: rgba(0,0,0,0.05); border-radius: 50%;">👋</div>
                <div class="widget-info" style="display: flex; flex-direction: column; justify-content: center; width: 100%;">
                    <span class="widget-value" style="font-size: 13px; font-weight: bold; white-space: normal; line-height: 1.2; text-align: left; color: var(--pet-text-main, #333);">Cadastre-se ou<br>Faça Login</span>
                </div>
            `;

            widget.innerHTML = `
                <div class="widget-container">
                    <div class="drag-handle">⠿</div>
                    <div class="widget-main-content" id="pet-main-content">
                        ${isAluna ? contentAluna : contentVisitante}
                    </div>
                    <button class="btn-minimize" id="pet-btn-minimize">✕</button>
                </div>
            `;
            
            const valEl = document.getElementById('pet-val');
            if (valEl) {
                if (valorNovo !== valorAnterior) {
                    animateValue(valEl, valorAnterior, valorNovo, 1500);

                    // ✨ Animação de celebração ao ganhar pontos!
                    if (valorNovo > valorAnterior && !isMinimized) {
                        widget.classList.add('pet-celebrate');
                        setTimeout(() => {
                            widget.classList.remove('pet-celebrate');
                        }, 1000); // Duração da animação em ms
                    }

                } else {
                    valEl.innerText = valorNovo + " Arrasas";
                }
            }
        }

        // Adicionando os event listeners programaticamente (Evita uso do Window/escopo global)
        const btnMinimize = document.getElementById('pet-btn-minimize');
        const btnMaximize = document.getElementById('pet-btn-maximize');
        const mainContent = document.getElementById('pet-main-content');

        if (btnMinimize) btnMinimize.addEventListener('click', togglePetWidget);
        if (btnMaximize) btnMaximize.addEventListener('click', togglePetWidget);
        if (mainContent) {
            mainContent.style.cursor = "pointer";
            mainContent.addEventListener('click', () => window.open(isAluna ? "/dash_aluna" : "/sign_up", '_self'));
        }
    }

    // 6. BACKEND
    function iniciarWidget() {
        // --- DETECÇÃO DE LOGOUT SEGURA ---
        const cachedEmail = safeStorage('get', 'pet_user_email');
        const loginSource = safeStorage('get', 'pet_login_source');
        
        let isLoggedOut = false;
        
        let punditContext = localStorage.getItem('V1-PunditUserContext');
        let hasPunditUser = false;
        if (punditContext) {
            try {
                let parsedContext = JSON.parse(punditContext);
                if (parsedContext && parsedContext.current_user && parsedContext.current_user.email) {
                    hasPunditUser = true;
                }
            } catch(e) {}
        }

        if (loginSource === 'circle_pundit' && !hasPunditUser) {
            isLoggedOut = true; // Estava logado via Pundit e a chave sumiu (Logout)
        } else if (loginSource === 'circle' && !hasPunditUser && (!window.circleUser || !window.circleUser.email)) {
            isLoggedOut = true; // Fallback
        } else if (loginSource === 'liquid') {
            let liquidEmail = "{{ user.email }}";
            if (!liquidEmail || liquidEmail.indexOf('{{') !== -1 || liquidEmail.trim() === "") {
                isLoggedOut = true;
            }
        }

        // Se tínhamos um e-mail salvo, mas ocorreu logout na plataforma origem
        if (cachedEmail && isLoggedOut) {
            safeStorage('remove', 'pet_user_email');
            safeStorage('remove', 'userSaldo');
            safeStorage('remove', 'userBadge');
            safeStorage('remove', 'pet_login_source');
            
            renderizar({ encontrado: false, arrasas: 0, badge: null, isCache: true });
            return;
        }

        var email = getEmail();
        if (!email) {
            renderizar({ encontrado: false, arrasas: 0, badge: null, isCache: true });
            return;
        }

        var script = document.createElement('script');
        var ts = new Date().getTime();
        script.src = urlApp + "?email=" + encodeURIComponent(email) + 
                     "&ultimoSaldo=" + (safeStorage('get', 'userSaldo') || 0) + 
                     "&action=widget" +
                     "&callback=receberDadosPet&t=" + ts;

        document.body.appendChild(script);
        script.onload = function() { if(this.parentNode) this.parentNode.removeChild(this); };
        script.onerror = function() { if(this.parentNode) this.parentNode.removeChild(this); }; // Limpeza em caso de falha de rede
    }

    window.receberDadosPet = function(data) {
        if (data.encontrado) {
            if (data.email) safeStorage('set', 'pet_user_email', data.email.toLowerCase().trim());
            data.isCache = false;
            renderizar(data); 
        } else {
            // Resposta do servidor: E-mail não está cadastrado (Visitante)
            safeStorage('remove', 'pet_user_email');
            safeStorage('remove', 'userSaldo');
            safeStorage('remove', 'userBadge');
            safeStorage('remove', 'pet_login_source');
            renderizar({ encontrado: false, arrasas: 0, badge: null, isCache: false });
        }
    };

    // 7. LISTENER PARA VERCEL (O que você precisa para o Dashboard!)
    window.addEventListener('message', (event) => {
        // Descomente e ative a linha abaixo quando estiver em produção para evitar que outros sites roubem o e-mail:
        // if (event.origin !== TRUSTED_ORIGIN && event.origin !== "http://localhost:3000") return;

        if (event.data === 'REQUEST_EMAIL') {
            const email = getEmail();
            if (email) event.source.postMessage({ email: email }, event.origin);
        }

        // Recebe atualizações instantâneas do dashboard (Vercel)
        if (event.data && event.data.type === 'PET_UPDATE') {
            const updatePayload = event.data.payload;
            const currentUserEmail = getEmail();

            // Garante que a atualização é para o usuário logado no widget
            if (updatePayload && updatePayload.email && updatePayload.email.toLowerCase().trim() === currentUserEmail) {
                updatePayload.isCache = false; // Força a animação e atualização do cache
                renderizar(updatePayload);
            }
        }
    });

    // 8. START
    injectAnimationStyles();

    // Define que o widget começa minimizado por padrão se não houver preferência salva
    if (safeStorage('get', 'petMinimized') == null) {
        safeStorage('set', 'petMinimized', 'true');
    }

    const cEmail = safeStorage('get', 'pet_user_email');
    const cS = safeStorage('get', 'userSaldo');
    
    // Evita que a string "0" seja interpretada como 'true' sem um e-mail salvo no cache
    const isProvavelAluna = !!cEmail && cS !== null && cS !== undefined;
    
    renderizar({ 
        encontrado: isProvavelAluna, arrasas: cS || 0, badge: safeStorage('get', 'userBadge'), isCache: true 
    });

    setTimeout(iniciarWidget, 1500);
    setInterval(iniciarWidget, 45000);
})();
