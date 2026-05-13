(function() {
    // ⚠️ URL DO SEU APP SCRIPT
    var urlApp = "https://script.google.com/macros/s/AKfycbxKYHhL6caVrF83jISARJlU2adlD6M-q2UqfGOxxQNO_fb6RoaHjLixBjA65a41jR6N/exec";

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

    // 1. CAPTURA DE E-MAIL COM PERSISTÊNCIA
    function getEmail() {
        let userEmail = safeStorage('get', 'pet_user_email');

        try {
            if (!userEmail || userEmail === "undefined" || userEmail === "null") {
                if (window.circleUser && window.circleUser.email) {
                    userEmail = window.circleUser.email;
                } else {
                    let liquidEmail = "{{ user.email }}";
                    if (liquidEmail && liquidEmail.indexOf('{{') === -1) {
                        userEmail = liquidEmail;
                    }
                }

                if (userEmail) {
                    userEmail = userEmail.toLowerCase().trim();
                    safeStorage('set', 'pet_user_email', userEmail);
                }
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
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
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
    window.togglePetWidget = function(e) {
        if (e) e.stopPropagation();
        const isMin = safeStorage('get', 'petMinimized') === 'true';
        safeStorage('set', 'petMinimized', !isMin);
        
        renderizar({ 
            encontrado: true, 
            arrasas: safeStorage('get', 'userSaldo') || 0, 
            badge: safeStorage('get', 'userBadge') || "Aprendiz Curiosa 🐾", 
            isCache: true 
        });
    };

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
            widget.innerHTML = `<div class="minimized-icon" onclick="togglePetWidget(event)">🐾</div>`;
        } else {
            const imgs = {
                "Aprendiz Curiosa 🐾": "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Aprendiz.webp",
                "Mulher de Propósito ✨": "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Mulher.webp",
                "Fera da Técnica 🎓": "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Fera.webp",
                "Profissional que Arrasa 💼": "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Prof.webp",
                "Embaixadora Pet Rocinha 👑": "https://raw.githubusercontent.com/juanjsales/PETRocinha/main/Embaixadora.webp"
            };
            const badge = imgs[data?.badge] || imgs["Aprendiz Curiosa 🐾"];

            widget.innerHTML = `
                <div class="widget-container">
                    <div class="drag-handle">⠿</div>
                    <div class="widget-main-content" onclick="window.open('${isAluna ? "/dash_aluna" : "/sign_up"}', '_self')">
                        <img src="${badge}" class="widget-badge" ondragstart="return false">
                        <div class="widget-info">
                            <span class="widget-label">Saldo</span>
                            <span class="widget-value" id="pet-val">${valorAnterior} Arrasas</span>
                        </div>
                    </div>
                    <button class="btn-minimize" onclick="togglePetWidget(event)">✕</button>
                </div>
            `;
            
            const valEl = document.getElementById('pet-val');
            if (valEl) {
                if (valorNovo !== valorAnterior) {
                    animateValue(valEl, valorAnterior, valorNovo, 1500);
                } else {
                    valEl.innerText = valorNovo + " Arrasas";
                }
            }
        }
    }

    // 6. BACKEND
    function iniciarWidget() {
        var email = getEmail();
        if (!email) return;

        var script = document.createElement('script');
        var ts = new Date().getTime();
        script.src = urlApp + "?email=" + encodeURIComponent(email) + 
                     "&ultimoSaldo=" + (safeStorage('get', 'userSaldo') || 0) + 
                     "&callback=receberDadosPet&t=" + ts;

        document.body.appendChild(script);
        script.onload = function() { if(this.parentNode) this.parentNode.removeChild(this); };
    }

    window.receberDadosPet = function(data) {
        if (data.encontrado) {
            if (data.email) safeStorage('set', 'pet_user_email', data.email.toLowerCase().trim());
            data.isCache = false;
            renderizar(data); 
        }
    };

    // 7. LISTENER PARA VERCEL (O que você precisa para o Dashboard!)
    window.addEventListener('message', (event) => {
        if (event.data === 'REQUEST_EMAIL') {
            const email = getEmail();
            if (email) event.source.postMessage({ email: email }, event.origin);
        }
    });

    // 8. START
    const cS = safeStorage('get', 'userSaldo');
    renderizar({ encontrado: !!cS, arrasas: cS || 0, badge: safeStorage('get', 'userBadge'), isCache: true });

    setTimeout(iniciarWidget, 1500);
    setInterval(iniciarWidget, 45000);
})();
