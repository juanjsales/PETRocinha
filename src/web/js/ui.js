export function showNotification(message, type = 'info') {
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

export function renderDashboard(currentData, configMapa, DICAS_IA_LOCAL, renderChart) {
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
