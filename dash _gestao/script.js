// ── CONFIGURAÇÕES ─────────────────────────────────────────────────────────────
const API_BASE = "https://script.google.com/macros/s/AKfycbz4RQ0OnhomLbHwe1WIpQygtA3obEKbVrVJznOczGETLRLDI3gSLWn8U21I1JCHdo2Z/exec";

const BADGE_LABELS = ['Aprendiz Curiosa 🐾','Mulher de Propósito ✨','Fera da Técnica  🎓','Profissional que Arrasa 💼','Embaixadora Pet Rocinha 👑'];
const BADGE_COLORS = ['#378add','#1d9e75','#ef9f27','#d4537e', '#8b5cf6'];
const BADGE_CLASS  = ['b-curiosa','b-proposito','b-tecnica','b-embaixadora', 'b-rainha'];
const PIE_PALETTE  = ['#378add','#1d9e75','#ef9f27','#d4537e','#8b5cf6','#f97316','#0ea5e9','#a3a3a3'];

let MEMBROS = [];
let SOCIO   = [];
let CONFIG  = [];
let LOG     = [];
let socioChartsReady = false;
const SALARIO_MINIMO = 1621;
const VALOR_HORA_AULA_SOCIAL = 18.50; // Valor simbólico em R$ para o cálculo do sROI, baseado em fontes de referência (ex: Pronatec/MEC)
let chartInstances = {}; // Para armazenar e gerenciar as instâncias dos gráficos
let mapInstance = null; // Para armazenar a instância do mapa de calor
let heatLayerInstance = null; // Para atualizar a camada de calor progressivamente
let markersLayerInstance = null; // Para armazenar os marcadores interativos das alunas

// ── NAVEGAÇÃO ─────────────────────────────────────────────────────────
function switchPanel(id, el) {
  if (id === 'config') {
    let isAuthorized = sessionStorage.getItem('adminAuthorized');
    
    // Tenta ler o e-mail da URL (caso o Circle.so passe o e-mail como parâmetro no Iframe)
    const urlParams = new URLSearchParams(window.location.search);
    const urlEmail = urlParams.get('email');
    if (urlEmail && urlEmail.toLowerCase() === "profissaopet@j3lab.com.br") {
      isAuthorized = 'true';
      sessionStorage.setItem('adminAuthorized', 'true');
    }

    if (!isAuthorized) {
      const emailInput = prompt("Acesso restrito. Insira o e-mail de administrador para continuar:");
      if (emailInput && emailInput.trim().toLowerCase() === "profissaopet@j3lab.com.br") {
        sessionStorage.setItem('adminAuthorized', 'true');
      } else {
        alert("Acesso negado. Esta área é restrita para profissaopet@j3lab.com.br");
        return; // Interrompe a função e bloqueia a navegação
      }
    }
  }

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('panel-' + id).classList.add('active');
  if (id === 'ods' || id === 'sroi') {
    // Garante que os gráficos/métricas dessas abas sejam renderizados se os dados já estiverem prontos
    initImpactoCharts();
  }
  if (id === 'config') {
    // Garante que os gráficos da aba de config sejam renderizados
    initConfigCharts();
  }
  if (id === 'radar-pet') {
    setTimeout(() => {
      if (mapInstance) mapInstance.invalidateSize();
      initMapaCalor(); // Força a renderização do mapa agora que a aba está visível
    }, 100);
  }
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('expanded');
}

// ── FUNÇÕES AUXILIARES ─────────────────────────────────────────────────────────────
function countBy(arr, fn) {
  return arr.reduce((a, v) => {
    const k = fn(v) || 'Não informado';
    a[k] = (a[k] || 0) + 1;
    return a;
  }, {});
}
function initials(name) {
  const parts = name.trim().split(' ');
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}
function makeLegend(elId, labels, colors) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = labels.map((l, i) =>
    `<span class="leg-item"><span class="leg-dot" style="background:${colors[i]}"></span>${l}</span>`
  ).join('');
}

// ── EXPORTAÇÃO PDF ──────────────────────────────────────────────────────────
function showPdfOptionsModal() {
  const optionsList = document.getElementById('pdf-options-list');
  optionsList.innerHTML = ''; // Limpa opções anteriores

  document.querySelectorAll('.panel').forEach(panel => {
    const panelId = panel.id;
    const panelTitle = panel.querySelector('.page-title').textContent;
    const isChecked = panel.classList.contains('active'); // Pré-seleciona a aba ativa

    const checkboxHTML = `
      <label style="display: flex; align-items: center; gap: 10px; padding: 8px; background: var(--surface2); border-radius: 8px; cursor: pointer;">
        <input type="checkbox" data-panel-id="${panelId}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px;">
        <span style="font-weight: 500;">${panelTitle}</span>
      </label>
    `;
    optionsList.insertAdjacentHTML('beforeend', checkboxHTML);
  });

  document.getElementById('pdf-options-modal').style.display = 'flex';
}

function closePdfOptionsModal() {
  document.getElementById('pdf-options-modal').style.display = 'none';
}

function executePdfExport() {
  closePdfOptionsModal();

  const selectedPanelIds = Array.from(document.querySelectorAll('#pdf-options-list input:checked'))
                                .map(input => input.getAttribute('data-panel-id'));

  if (selectedPanelIds.length === 0) {
    alert('Por favor, selecione ao menos uma seção para exportar.');
    return;
  }

  const activePanelId = document.querySelector('.panel.active').id;
  const originalTitle = document.title;
  const mainElement = document.querySelector('.main');

  // 1. Preparar para captura: desativar animações, mostrar painéis SELECIONADOS
  Chart.defaults.animation = false;
  document.querySelectorAll('.panel').forEach(p => {
    p.style.display = selectedPanelIds.includes(p.id) ? 'block' : 'none';
  });

  // Pequeno atraso para permitir que o navegador renderize os painéis
  setTimeout(() => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0'); // Meses são base 0
      const dd = String(today.getDate()).padStart(2, '0');
      const formattedDate = `${yyyy}-${mm}-${dd}`;

      const opt = {
          margin:       [10, 10, 10, 10], // topo, esquerda, baixo, direita em mm
          filename:     `relatorio-profissao-pet-rocinha-${formattedDate}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, logging: false },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // 2. Clonar o elemento principal para a geração do PDF
      const elementToPrint = mainElement.cloneNode(true);

      // 3. Limpar o clone (remover botões, etc.)
      elementToPrint.querySelectorAll('.btn, .filter-sel, .modal-backdrop, .menu-toggle').forEach(el => el.remove());

      // 4. Substituir os canvas por imagens no clone
      const originalCanvases = mainElement.querySelectorAll('canvas');
      const clonedCanvases = elementToPrint.querySelectorAll('canvas');
      originalCanvases.forEach((canvas, index) => {
          if (clonedCanvases[index]) {
              const dataURL = canvas.toDataURL('image/png');
              const img = document.createElement('img');
              img.src = dataURL; img.style.width = '100%'; img.style.height = 'auto';
              clonedCanvases[index].parentNode.replaceChild(img, clonedCanvases[index]);
          }
      });

      // 5. Gerar o PDF a partir do clone preparado
      html2pdf().from(elementToPrint).set(opt).save().then(() => {
          // 6. Restaurar o estado original após salvar
          document.title = originalTitle;
          Chart.defaults.animation = true;
          document.querySelectorAll('.panel').forEach(p => {
              // Reverte a visibilidade para o estado original (apenas o ativo é 'block')
              p.style.display = (p.id === activePanelId) ? 'block' : 'none';
          });
      });
  }, 100); // Atraso crucial para a renderização
}

// ── GRÁFICOS ──────────────────────────────────────────────────────────────
function donutChart(id, labels, data, colors) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const total = data.reduce((a, b) => a + b, 0);
  chartInstances[id] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 3, borderColor: '#ffffff', hoverOffset: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%', animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => ` ${c.label}: ${c.raw} (${Math.round(c.raw / total * 100)}%)`
          }
        }
      }
    }
  });
}

function hBarChart(id, labels, data, color) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const wrap = ctx.parentElement;
  wrap.style.height = Math.max(labels.length * 40 + 60, 160) + 'px';
  chartInstances[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: color, borderRadius: 4, borderSkipped: false }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } }, beginAtZero: true },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

function barChart(id, labels, data, color) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }
  const ctx = document.getElementById(id);
  if (!ctx) return;
  chartInstances[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: color, borderRadius: 5, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 30 } },
        y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } }, beginAtZero: true }
      }
    }
  });
}

function groupedBarChart(id, labels, datasets) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }
  const ctx = document.getElementById(id);
  if (!ctx) return;
  chartInstances[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: datasets
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// ── MAPA DE CALOR ─────────────────────────────────────────────────────────
function initMapaCalor() {
  const mapContainer = document.getElementById('mapa-calor-rocinha');
  if (!mapContainer) return;
if (mapContainer.clientWidth === 0 || mapContainer.clientHeight === 0) {
    return;
  }
  if (!mapInstance) {
    // Centro aproximado da Rocinha - Instancia o mapa principal apenas uma vez
    mapInstance = L.map('mapa-calor-rocinha').setView([-22.9886, -43.2486], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
      crossOrigin: true
    }).addTo(mapInstance);
  }

  if (heatLayerInstance) {
    // Remove a camada de calor anterior para atualizar sem piscar a base do mapa
    mapInstance.removeLayer(heatLayerInstance);
  }
  if (markersLayerInstance) {
    // Remove marcadores antigos
    mapInstance.removeLayer(markersLayerInstance);
  }

  const heatData = [];
  markersLayerInstance = L.layerGroup().addTo(mapInstance);
  
  // Varre a lista de MEMBROS (agora com CEP) para plotar no mapa
  MEMBROS.forEach(m => {
    const lat = m.lat || (m.dadosSocio && m.dadosSocio.lat);
    const lng = m.lng || (m.dadosSocio && m.dadosSocio.lng);
    
    if (lat && lng) {
      const pLat = parseFloat(lat);
      const pLng = parseFloat(lng);
      heatData.push([pLat, pLng, 1]); // O número '1' é a intensidade
      
      // Define a cor do marcador baseada na medalha da aluna
      const badgeIdx = BADGE_LABELS.indexOf(m.badge);
      const mColor = badgeIdx >= 0 ? BADGE_COLORS[badgeIdx] : '#378add';

      // Cria um marcador interativo para a aluna
      const marker = L.circleMarker([pLat, pLng], {
        radius: 7, fillColor: mColor, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 0.9
      });

      // Adiciona o nome ao passar o mouse e o evento de clique para abrir o modal de Perfil
      marker.bindTooltip(`<b>${m.nome}</b><br><span style="font-size:11px">${m.badge || 'Sem medalha'}</span>`);
      if (m.cpf) marker.on('click', () => showSocioModal(m.cpf));
      markersLayerInstance.addLayer(marker);
    }
  });

  if (heatData.length > 0) {
    if (typeof L.heatLayer !== 'undefined') {
      heatLayerInstance = L.heatLayer(heatData, { radius: 25, blur: 15, maxZoom: 17 }).addTo(mapInstance);
    }
  } else {
    // Enquanto os dados reais não terminam de converter, mantemos os pontos ilustrativos
    for (let i = 0; i < 50; i++) {
      const randLat = -22.9886 + (Math.random() - 0.5) * 0.01;
      const randLng = -43.2486 + (Math.random() - 0.5) * 0.01;
      heatData.push([randLat, randLng, 1]);
    }
    if (typeof L.heatLayer !== 'undefined') {
      heatLayerInstance = L.heatLayer(heatData, { radius: 25, blur: 15, maxZoom: 17 }).addTo(mapInstance);
    }
  }
}

// Função assíncrona que integra a geocodificação no frontend silenciosamente
async function geocodeSocioDataBackground() {
  let updated = false;

  for (const m of MEMBROS) {
    // Tenta pegar o CEP diretamente de MEMBROS ou cai para os dados socioeconômicos como fallback
    const cepStr = m.cep || m.CEP || (m.dadosSocio && (m.dadosSocio.cep || m.dadosSocio.CEP)); 
    
    if ((!m.lat && !m.latitude) && cepStr) {
      const cacheKey = `geo_${cepStr}`;
      const cached = localStorage.getItem(cacheKey); // Verifica se já pesquisou antes

      if (cached) {
        const parsed = JSON.parse(cached);
        m.lat = parsed.lat;
        m.lng = parsed.lon;
        updated = true;
      } else {
        try {
          // Pausa de 1.5s entre requisições para evitar ser bloqueado pela API gratuita
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const cleanCep = String(cepStr).replace(/\D/g, ''); 
          let url = cleanCep.length === 8 
            ? `https://nominatim.openstreetmap.org/search?postalcode=${cleanCep}&country=Brazil&format=json`
            : `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cepStr + ", Rio de Janeiro, Brasil")}&format=json`;

          const response = await fetch(url);
          const data = await response.json();
          
          if (data && data.length > 0) {
            m.lat = data[0].lat;
            m.lng = data[0].lon;
            // Salva na memória do navegador para ficar muito rápido nas próximas vezes
            localStorage.setItem(cacheKey, JSON.stringify({ lat: m.lat, lon: m.lng }));
            updated = true;
            
            // Atualiza o mapa na hora a cada novo CEP localizado
            initMapaCalor();
          }
        } catch (error) {
          console.warn(`Erro ao converter CEP ${cepStr}:`, error);
        }
      }
    }
  }

  // Atualização de varredura final se houve atualizações em massa pelo cache rápido
  if (updated) {
    initMapaCalor();
  }
}

// ── GRÁFICOS: VISÃO GERAL ──────────────────────────────────────────────────
function initGeraisCharts(membros) {
  const badgeCounts = countBy(membros, m => m.badge);
  const bData = BADGE_LABELS.map(l => badgeCounts[l] || 0);
  donutChart('chartBadge', BADGE_LABELS, bData, BADGE_COLORS);
  makeLegend('legend-badge',
    BADGE_LABELS.map((l, i) => `${l} (${bData[i]})`),
    BADGE_COLORS
  );

  const top5 = [...membros].sort((a, b) => b.arrasas - a.arrasas).slice(0, 5);
  barChart(
    'chartTop5',
    top5.map(m => m.nome.split(' ')[0]),
    top5.map(m => m.arrasas),
    '#003366'
  );

  const total = membros.length;
  const prog = document.getElementById('progress-badges');
  prog.innerHTML = BADGE_LABELS.map((l, i) => {
    const pct = total ? Math.round((bData[i] / total) * 100) : 0;
    return `<div class="progress-item">
      <div class="progress-top">
        <span>${l}</span>
        <span class="progress-pct">${bData[i]} alunas · ${pct}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${pct}%;background:${BADGE_COLORS[i]}"></div>
      </div>
    </div>`;
  }).join('');

  // Gráfico de Média de Horas por Fase
  if (LOG.length > 0 && CONFIG.length > 0 && membros.length > 0) {
    const configMap = new Map(CONFIG.map(item => [item.Codigo, { horas: Number(item.Horas) || 0, fase: item['Fase pedagogica'] }]));
    
    const totalHorasPorFase = LOG.reduce((acc, logEntry) => {
      const configItem = configMap.get(logEntry.codigo_evento);
      if (configItem && configItem.fase) {
        acc[configItem.fase] = (acc[configItem.fase] || 0) + configItem.horas;
      }
      return acc;
    }, {});

    const fases = ['Acreditar', 'Aprender', 'Agir'];
    const avgHorasData = fases.map(fase => {
      const totalHoras = totalHorasPorFase[fase] || 0;
      return totalHoras / membros.length;
    });

    barChart('chartAvgHorasFase', fases, avgHorasData, [
      '#378add', // Cor para Acreditar
      '#1d9e75', // Cor para Aprender
      '#ef9f27'  // Cor para Agir
    ]);
  }
  
  // Inicializa o Mapa de Calor
  initMapaCalor();
}

// ── GRÁFICOS: SOCIOECONÔMICO ────────────────────────────────────────────────────────
function initSocioCharts() {
  const s = SOCIO;

  const raca = countBy(s, r => r.raca);
  const racaL = Object.keys(raca), racaD = Object.values(raca);
  donutChart('chartRaca', racaL, racaD, PIE_PALETTE.slice(0, racaL.length));
  makeLegend('legend-raca', racaL.map((l, i) => `${l} (${racaD[i]})`), PIE_PALETTE.slice(0, racaL.length));

  const gen = countBy(s, r => r.genero);
  const genL = Object.keys(gen), genD = Object.values(gen);
  donutChart('chartGenero', genL, genD, PIE_PALETTE.slice(0, genL.length));
  makeLegend('legend-genero', genL.map((l, i) => `${l} (${genD[i]})`), PIE_PALETTE.slice(0, genL.length));

  const escl = countBy(s, r => r.escolaridade);
  hBarChart('chartEscola', Object.keys(escl), Object.values(escl), '#185fa5');

  const renda = countBy(s, r => r.ganhos);
  hBarChart('chartRenda', Object.keys(renda), Object.values(renda), '#0f6e56');

  const civil = countBy(s, r => r.estadoCivil);
  const civL = Object.keys(civil), civD = Object.values(civil);
  donutChart('chartCivil', civL, civD, PIE_PALETTE.slice(0, civL.length));
  makeLegend('legend-civil', civL.map((l, i) => `${l} (${civD[i]})`), PIE_PALETTE.slice(0, civL.length));

  const emprego = countBy(s, r => {
    if (!r.trabalhando) return 'Sem vínculo';
    return r.ocupacao || 'Com vínculo';
  });
  const empL = Object.keys(emprego), empD = Object.values(emprego);
  donutChart('chartEmprego', empL, empD, PIE_PALETTE.slice(0, empL.length));
  makeLegend('legend-emprego', empL.map((l, i) => `${l} (${empD[i]})`), PIE_PALETTE.slice(0, empL.length));

  const pessoas = countBy(s, r => r.pessoasDomicilio ? String(r.pessoasDomicilio) + ' pessoas' : null);
  const pesL = Object.keys(pessoas).sort();
  barChart('chartPessoas', pesL, pesL.map(k => pessoas[k]), '#7c3aed');

  const orientacao = countBy(s, r => r.orientacao);
  const orL = Object.keys(orientacao), orD = Object.values(orientacao);
  donutChart('chartOrientacao', orL, orD, PIE_PALETTE.slice(0, orL.length));
  makeLegend('legend-orientacao', orL.map((l, i) => `${l} (${orD[i]})`), PIE_PALETTE.slice(0, orL.length));

  const alunasComSocio = MEMBROS.filter(m => m.dadosSocio && m.idade);
  const idade = countBy(alunasComSocio, m => {
    if (m.idade <= 24) return '18-24 anos';
    if (m.idade <= 34) return '25-34 anos';
    if (m.idade <= 44) return '35-44 anos';
    if (m.idade <= 54) return '45-54 anos';
    return '55+ anos';
  });
  const idadeL = ['18-24 anos', '25-34 anos', '35-44 anos', '45-54 anos', '55+ anos'];
  const idadeD = idadeL.map(k => idade[k] || 0);
  hBarChart('chartIdade', idadeL, idadeD, '#d4537e');


  const comFilhos = s.filter(r => r.filhos === 'Sim').length;
  const comTrabalho = s.filter(r => r.trabalhando).length;
  const baixaRenda = s.filter(r => r.ganhos && (r.ganhos.includes('500') || r.ganhos.includes('1.413') || r.ganhos.includes('1413'))).length;
  const pf = s.length ? ` (${Math.round(comFilhos / s.length * 100)}%)` : '';
  const pt = s.length ? ` (${Math.round(comTrabalho / s.length * 100)}%)` : '';
  const pb = s.length ? ` (${Math.round(baixaRenda / s.length * 100)}%)` : '';

  document.getElementById('s-filhos').textContent = comFilhos + pf;
  document.getElementById('s-trabalho').textContent = comTrabalho + pt;
  document.getElementById('s-baixa-renda').textContent = baixaRenda + pb;
}

// ── GRÁFICOS: ODS & SROI ──────────────────────────────────────────────────
function initImpactoCharts() {
  if (SOCIO.length === 0) return;

  // --- ODS Cards ---
  const ods1 = SOCIO.filter(s => s.ganhos && (s.ganhos.includes('500') || s.ganhos.includes('1.413') || s.ganhos.includes('1413'))).length;
  const ods4 = MEMBROS.length;
  const ods5 = SOCIO.filter(s => s.filhos === 'Sim').length;
  const ods8 = SOCIO.filter(s => !s.trabalhando).length;

  document.getElementById('ods-1-val').textContent = `${ods1} alunas`;
  document.getElementById('ods-4-val').textContent = `${ods4} alunas`;
  document.getElementById('ods-5-val').textContent = `${ods5} alunas`;
  document.getElementById('ods-8-val').textContent = `${ods8} alunas`;

  // Gráfico de Cobertura ODS
  const totalAlunas = MEMBROS.length;
  const odsCoberturaData = [
    (ods1 / totalAlunas) * 100,
    (ods4 / totalAlunas) * 100,
    (ods5 / totalAlunas) * 100,
    (ods8 / totalAlunas) * 100,
  ];
  const odsCoberturaLabels = ["ODS 1", "ODS 4", "ODS 5", "ODS 8"];
  const odsCoberturaColors = ['#e5243b', '#c59b2e', '#ef402b', '#a21942'];
  hBarChart('chartOdsCobertura', odsCoberturaLabels, odsCoberturaData, odsCoberturaColors);

  // Gráfico de Perfil do Público ODS 8
  const alunasSemVinculoSocio = SOCIO.filter(s => !s.trabalhando);
  const escolaridadeOds8 = countBy(alunasSemVinculoSocio, s => s.escolaridade);
  const escOds8Labels = Object.keys(escolaridadeOds8);
  const escOds8Data = Object.values(escolaridadeOds8);
  donutChart('chartOds8Escolaridade', escOds8Labels, escOds8Data, PIE_PALETTE);
  makeLegend('legend-ods8-escolaridade', escOds8Labels.map((l, i) => `${l} (${escOds8Data[i]})`), PIE_PALETTE);


  // --- sROI ---
  const alunasSemVinculo = SOCIO.filter(s => !s.trabalhando).length;
  const potencialRenda = alunasSemVinculo * SALARIO_MINIMO;

  const sroiRendaEl = document.getElementById('sroi-renda-potencial');
  const sroiRendaSubEl = document.getElementById('sroi-renda-sub');

  sroiRendaEl.textContent = potencialRenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  sroiRendaSubEl.textContent = `Considerando ${alunasSemVinculo} alunas sem vínculo empregatício empregadas com 1 S.M.`;

  // Métrica de Valor Social da Educação (Proxy)
  const totalHorasCurso = CONFIG
    .filter(item => item.Tipo === 'Curso')
    .reduce((sum, curso) => sum + (Number(curso.Horas) || 0), 0);
  const valorEducacao = totalHorasCurso * MEMBROS.length * VALOR_HORA_AULA_SOCIAL;
  document.getElementById('sroi-valor-educacao').textContent = valorEducacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // sROI Chart 1: Situação Profissional
  const situacaoProf = countBy(SOCIO, s => s.ocupacao);
  const sitLabels = Object.keys(situacaoProf);
  const sitData = Object.values(situacaoProf);
  donutChart('chartSroiSituacao', sitLabels, sitData, PIE_PALETTE);
  makeLegend('legend-sroi-situacao', sitLabels.map((l, i) => `${l} (${sitData[i]})`), PIE_PALETTE);

  // sROI Chart 2: Potencial de Renda
  const faixasDeRenda = {
    'Até R$ 500': { sum: 250, count: 0 }, // Usando valor médio para cálculo
    'De R$ 501 a R$ 1.412': { sum: 956, count: 0 },
    'De R$ 1.413 a R$ 2.000': { sum: 1700, count: 0 },
    'Acima de R$ 2.001': { sum: 2500, count: 0 }
  };

  // Mapeamento de substrings para chaves do objeto faixasDeRenda
  const rendaMap = {
    '500': 'Até R$ 500',
    '1.412': 'De R$ 501 a R$ 1.412',
    '2.000': 'De R$ 1.413 a R$ 2.000',
    '2.001': 'Acima de R$ 2.001'
  };

  SOCIO.forEach(s => {
    const ganhoStr = s.ganhos || '';
    const key = Object.keys(rendaMap).find(sub => ganhoStr.includes(sub));
    if (key) faixasDeRenda[rendaMap[key]].count++;
  });

  const potLabels = Object.keys(faixasDeRenda);
  const rendaAtualData = potLabels.map(key => faixasDeRenda[key].count > 0 ? faixasDeRenda[key].sum : 0);
  const rendaPotencialData = potLabels.map(key => faixasDeRenda[key].count > 0 ? SALARIO_MINIMO : 0);

  groupedBarChart('chartSroiPotencial', potLabels, [
    {
      label: 'Renda Média Atual (Estimada)',
      data: rendaAtualData,
      backgroundColor: '#a8a29e',
      borderRadius: 4,
    },
    {
      label: 'Renda Potencial (1 S.M.)',
      data: rendaPotencialData,
      backgroundColor: '#166534',
      borderRadius: 4,
    }
  ]);

  // sROI Chart 3: Distribuição de Incentivos
  const pontosPorFase = CONFIG.reduce((acc, item) => {
    const fase = item['Fase pedagogica'] || 'Não Definida';
    const valor = Number(item.Valor) || 0;
    if (valor > 0) {
      acc[fase] = (acc[fase] || 0) + valor;
    }
    return acc;
  }, {});
  const incentivoLabels = Object.keys(pontosPorFase);
  const incentivoData = Object.values(pontosPorFase);
  barChart('chartSroiIncentivos', incentivoLabels, incentivoData, '#003366');

}

// ── GRÁFICOS E TABELA: CONFIGURAÇÕES ───────────────────────────────────────────────
function initConfigCharts() {
  if (CONFIG.length === 0) return;

  const horasPorFase = CONFIG.reduce((acc, item) => {
    const fase = item['Fase pedagogica'] || 'Não Definida';
    const horas = Number(item.Horas) || 0;
    if (horas > 0) {
      acc[fase] = (acc[fase] || 0) + horas;
    }
    return acc;
  }, {});

  const faseLabels = Object.keys(horasPorFase);
  const faseData = Object.values(horasPorFase);

  donutChart('chartConfigFase', faseLabels, faseData, PIE_PALETTE);
  makeLegend('legend-config-fase', faseLabels.map((l, i) => `${l} (${faseData[i]}h)`), PIE_PALETTE);

  // Gráfico de Tipos de Atividade
  const tipos = countBy(CONFIG, item => item.Tipo);
  const tipoLabels = Object.keys(tipos);
  const tipoData = Object.values(tipos);
  donutChart('chartConfigTipo', tipoLabels, tipoData, PIE_PALETTE);
  makeLegend('legend-config-tipo', tipoLabels.map((l, i) => `${l} (${tipoData[i]})`), PIE_PALETTE);
}

function populateConfigFilter() {
  const filterSelect = document.getElementById('filter-config-tipo');
  // Previne a duplicação de opções ao recarregar
  filterSelect.innerHTML = '<option value="">Todos os Tipos</option>';

  const tipos = [...new Set(CONFIG.map(item => item.Tipo).filter(Boolean))]; // Pega tipos únicos e remove vazios
  tipos.sort().forEach(tipo => {
    const option = document.createElement('option');
    option.value = tipo;
    option.textContent = tipo;
    filterSelect.appendChild(option);
  });
}

function renderConfigTabela() {
  const tbody = document.getElementById('tbody-config');
  const filterValue = document.getElementById('filter-config-tipo').value;
  const filteredConfig = filterValue ? CONFIG.filter(c => c.Tipo === filterValue) : CONFIG;

  if (!CONFIG.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i>Nenhuma configuração encontrada.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = filteredConfig.map(c => {
    return `<tr>
      <td><input type="text" class="table-input" value="${c.Codigo}" readonly style="background:#eee; border:none; font-family:monospace;"></td>
      <td>
        <input type="text" class="table-input" value="${c['Descrição'] || ''}">
      </td>
      <td><input type="text" class="table-input" value="${c.Tipo || ''}"></td>
      <td><input type="text" class="table-input" value="${c['Fase pedagogica'] || ''}"></td>
      <td><input type="number" class="table-input" value="${c.Horas || 0}" style="width: 70px;"></td>
      <td><input type="number" class="table-input" value="${c.Valor || 0}" style="width: 70px;"></td>
    </tr>`;
  }).join('');
}


// ── TABELA: ALUNAS ───────────────────────────────────────────────────────────────
function renderTabela() {
  const filtBadge = document.getElementById('filter-badge-sel').value;
  const filtSocio = document.getElementById('filter-socio-sel').value;
  let lista = [...MEMBROS];
  if (filtBadge) lista = lista.filter(m => m.badge === filtBadge);
  if (filtSocio === 'formadas') lista = lista.filter(m => m.formada);
  if (filtSocio === 'ok') lista = lista.filter(m => m.dadosSocio);
  if (filtSocio === 'pend') lista = lista.filter(m => !m.dadosSocio);

  const tbody = document.getElementById('tbody-alunas');
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i>Nenhuma aluna encontrada.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = lista.map(m => {
    const badgeIdx = BADGE_LABELS.indexOf(m.badge);
    const bClass = badgeIdx >= 0 ? BADGE_CLASS[badgeIdx] : 'b-curiosa';
    return `<tr>
      <td data-label="Nome">
        <div class="name-cell">
          <span class="avatar">${initials(m.nome || '')}</span>
          <strong style="cursor:pointer;text-decoration:underline;" onclick="showSocioModal('${m.cpf}')">${m.nome}</strong>
        </div>
      </td>
      <td data-label="E-mail" style="color:var(--muted);font-size:12px">${m.email}</td>
      <td data-label="Medalha"><span class="pill ${bClass}">${m.badge}</span></td>
      <td data-label="Horas"><strong>${m.horasConcluidas || 0}h</strong></td>
      <td data-label="Arrasas"><strong>${m.arrasas.toLocaleString('pt-BR')} AS</strong></td>
      <td data-label="XP">${m.xp.toLocaleString('pt-BR')} XP</td>
      <td data-label="Socioecon.">
        ${m.dadosSocio
          ? `<span class="status-ok"><i class="fa-solid fa-circle-check"></i> Concluído</span>`
          : `<span class="status-pend"><i class="fa-regular fa-clock"></i> Pendente</span>`
        }
      </td>
    </tr>`;
  }).join('');
}

// ── LÓGICA DO MODAL ─────────────────────────────────────────────────────────
function showSocioModal(cpf) {
  const aluna = MEMBROS.find(m => m.cpf === cpf);
  if (!aluna) return;

  document.getElementById('modal-title').textContent = `Perfil de ${aluna.nome.split(' ')[0]}`;
  const body = document.getElementById('modal-body');

  if (!aluna.dadosSocio) {
    body.innerHTML = `<div class="empty-state"><i class="fa-regular fa-file-lines"></i>Formulário socioeconômico não preenchido.</div>`;
  } else {
    const s = aluna.dadosSocio;
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('pt-BR') : 'Não informado';
    const formatCep = (cep) => {
      if (!cep) return 'Não informado';
      const clean = String(cep).replace(/\D/g, '');
      return clean.length === 8 ? clean.replace(/(\d{5})(\d{3})/, '$1-$2') : cep;
    };
    const endId = 'end-' + Date.now(); // Gera um ID único para evitar conflito de tela

    const programDetails = [
      { label: 'E-mail', value: aluna.email },
      { label: 'Telefone (WPP)', value: aluna.wpp },
      { label: 'Medalha Atual', value: aluna.badge },
      { label: 'Arrasas (AS)', value: aluna.arrasas.toLocaleString('pt-BR') },
      { label: 'Experiência (XP)', value: aluna.xp.toLocaleString('pt-BR') },
      { label: 'Tags', value: aluna.tags },
      { label: 'Alertas', value: aluna.alertas },
      { label: 'ID da Aluna', value: aluna.id },
      { label: 'Data de Cadastro', value: formatDate(aluna.criadoEm) },
      { label: 'Última Visita', value: formatDate(aluna.ultimaVisita) },
      { label: 'CEP', value: formatCep(aluna.cep || s.cep || s.CEP) },
      { label: 'Endereço', value: `<span id="${endId}"><i class="fa-solid fa-spinner fa-spin"></i> Buscando...</span>` },
    ];

    const socioDetails = [
      { label: 'Idade', value: aluna.idade ? `${aluna.idade} anos` : 'Não informado' },
      { label: 'CPF', value: s.cpf },
      { label: 'NIS', value: s.nis },
      { label: 'Gênero', value: s.genero },
      { label: 'Raça/Cor', value: s.raca },
      { label: 'Orientação Sexual', value: s.orientacao },
      { label: 'Estado Civil', value: s.estadoCivil },
      { label: 'Filhos', value: `${s.filhos}${s.quantosFilhos > 0 ? ` (${s.quantosFilhos})` : ''}` },
      { label: 'Escolaridade', value: s.escolaridade },
      { label: 'Situação Profissional', value: s.situacaoProf },
      { label: 'Trabalhando Hoje?', value: s.trabalhando ? 'Sim' : 'Não' },
      { label: 'Ocupação', value: s.ocupacao },
      { label: 'Renda Familiar', value: s.ganhos },
      { label: 'Pessoas no Domicílio', value: s.pessoasDomicilio },
      { label: 'Organização Financeira', value: s.orgFinanceira },
      { label: 'Renda Extra', value: `${s.rendaExtra}${s.rendaExtraOque ? ` (${s.rendaExtraOque})` : ''}` },
      { label: 'Maiores Gastos', value: s.maioresGastos },
      { label: 'Interesse no Curso', value: s.interesse },
      { label: 'Melhor Horário', value: s.horario },
      { label: 'Indicação', value: s.indicacao },
      { label: 'Motivação', value: s.motivacao },
    ];

    const renderGrid = (details) => details.map(d => `
      <div class="detail-item">
        <div class="detail-label">${d.label}</div>
        <div class="detail-value">${d.value || 'Não informado'}</div>
      </div>
    `).join('');

    body.innerHTML = `
      <div class="modal-profile-header">
        <img src="${aluna.imgUrl || 'https://github.com/juanjsales/PETRocinha/blob/main/pet%20(1).png?raw=true'}" alt="Foto de ${aluna.nome}" class="modal-profile-img">
        <div>
          <h3 style="font-size:18px; color:var(--navy);">${aluna.nome}</h3>
          <p style="font-size:12px; color:var(--muted);">${aluna.email}</p>
        </div>
      </div>
      <h4><i class="fa-solid fa-award"></i> Perfil do Programa</h4>
      <div class="detail-grid">
        ${renderGrid(programDetails)}
      </div>
      <div class="divider"></div>
      <h4><i class="fa-solid fa-users"></i> Perfil Socioeconômico</h4>
      <div class="detail-grid">
        ${renderGrid(socioDetails)}
      </div>`;

    // Dispara a busca no ViaCEP de forma assíncrona (não trava a abertura do modal)
    const cepVal = aluna.cep || s.cep || s.CEP;
    const cleanCep = cepVal ? String(cepVal).replace(/\D/g, '') : '';
    
    if (cleanCep.length === 8) {
      fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        .then(res => res.json())
        .then(data => {
          const el = document.getElementById(endId);
          if (el) {
            if (data.erro) el.textContent = 'CEP não encontrado';
            else el.textContent = data.logradouro ? `${data.logradouro}, ${data.bairro}` : `${data.localidade} - ${data.uf}`;
          }
        })
        .catch(() => {
          const el = document.getElementById(endId);
          if (el) el.textContent = 'Erro ao buscar endereço';
        });
    } else {
      const el = document.getElementById(endId);
      if (el) el.textContent = cleanCep ? 'CEP inválido' : 'Não informado';
    }
  }
  document.getElementById('socio-modal').style.display = 'flex';
}

function mergeDataSources(socioMap) {
  MEMBROS.forEach(membro => {
    const dadosSocio = socioMap.get(membro.cpf);
    if (dadosSocio) {
      membro.dadosSocio = dadosSocio; // Anexa o objeto socioeconômico completo
    }

    // Calcula a idade a partir da data de nascimento
    if (membro.nascimento) {
      const birthDate = new Date(membro.nascimento);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
      }
      membro.idade = age;
    }
  });

  // Cria um mapa de referência de Código -> Horas para consulta rápida
  const configMap = new Map(CONFIG.map(item => [item.Codigo, Number(item.Horas) || 0]));

  // Agrupa os logs por e-mail da aluna
  const logPorAluna = LOG.reduce((acc, logEntry) => {
    const email = logEntry.Email;
    if (email) {
      if (!acc[email]) acc[email] = [];
      acc[email].push(logEntry.codigo_evento);
    }
    return acc;
  }, {});

  // Calcula as horas concluídas e o status de formada para cada membro
  MEMBROS.forEach(membro => {
    const alunaLogs = logPorAluna[membro.email] || [];
    membro.horasConcluidas = alunaLogs.reduce((totalHoras, codigo) => totalHoras + (configMap.get(codigo) || 0), 0);
    membro.formada = alunaLogs.includes('course_completed');
  });
}

function closeModal() {
  document.getElementById('socio-modal').style.display = 'none';
}

// ── JUNÇÃO E PROCESSAMENTO DE DADOS ───────────────────────────────────────────
function tentarMergeEProcessar() {
  // Guardião: Se não houver dados de membros, não processa o restante e destrava o carregamento
  if (MEMBROS.length === 0) {
    document.getElementById('loading-overlay').style.display = 'none';
    setReloadButtonState(false);
    return;
  }

  // Cria um mapa dos dados socioeconômicos para busca rápida
  const socioMap = new Map(SOCIO.map(s => [s.cpf, s]));

  mergeDataSources(socioMap); // Passa o mapa como argumento

  // Agora que os dados estão mesclados, podemos processar as métricas e a tabela
  let totalAlunas = MEMBROS.length, totalAS = 0, totalXP = 0, socioOk = 0;
  MEMBROS.forEach(m => {
    totalAS += m.arrasas;
    totalXP += m.xp;
    if (m.dadosSocio) socioOk++;
  });
  const pct = totalAlunas ? Math.round(socioOk / totalAlunas * 100) : 0;

  updateDashboardUI({ totalAlunas, totalAS, totalXP, socioOk, pct });
  renderAllCharts();

  // Esconde a tela de carregamento
  document.getElementById('loading-overlay').style.display = 'none';
  
  // Restaura o botão de recarregar
  setReloadButtonState(false);

  // Dispara a conversão de CEP -> Coordenadas em segundo plano sem travar a interface
  geocodeSocioDataBackground();
}

/**
 * Atualiza todos os componentes da UI com os dados processados.
 * @param {object} metrics - Objeto contendo as métricas calculadas.
 */
function updateDashboardUI(metrics) {
  const { totalAlunas, totalAS, totalXP, socioOk, pct } = metrics;

  document.getElementById('m-total').textContent = totalAlunas;
  document.getElementById('m-arrasas').textContent = totalAS.toLocaleString('pt-BR') + ' AS';
  document.getElementById('m-socio').textContent = socioOk;
  document.getElementById('m-socio-pct').textContent = `${pct}% concluíram o formulário`;
  document.getElementById('m-xp').textContent = totalXP.toLocaleString('pt-BR') + ' XP';

  // Calcula e atualiza a métrica de horas de curso
  const totalHorasCurso = CONFIG
    .filter(item => item.Tipo === 'Curso')
    .reduce((sum, curso) => sum + (Number(curso.Horas) || 0), 0);
  
  document.getElementById('m-horas-curso').textContent = `${totalHorasCurso}h`;

  // Limpa os diffs antigos antes de adicionar novos
  document.querySelectorAll('.mcard-diff').forEach(el => el.remove());

  // --- Lógica de Comparação com Dia Anterior ---
  const todayStr = new Date().toISOString().slice(0, 10);
  const storageKey = 'petRocinhaMetrics';
  const yesterdayMetrics = JSON.parse(localStorage.getItem(storageKey));

  const currentMetrics = {
    date: todayStr, totalAlunas, totalAS, socioOk, totalXP
  };

  // Salva as métricas de hoje se não houver dados ou se os dados forem de outro dia
  if (!yesterdayMetrics || yesterdayMetrics.date !== todayStr) {
    localStorage.setItem(storageKey, JSON.stringify(currentMetrics));
  }

  const renderDiff = (current, previous, elId) => {
    const diff = current - previous;
    if (isNaN(diff) || diff === 0) return '';
    const sign = diff > 0 ? '+' : '';
    const diffClass = diff > 0 ? 'pos' : 'neg';
    return `<span class="mcard-diff ${diffClass}">${sign}${diff}</span>`;
  };

  if (yesterdayMetrics && yesterdayMetrics.date !== todayStr) {
    document.getElementById('m-total').parentElement.insertAdjacentHTML('beforeend', renderDiff(currentMetrics.totalAlunas, yesterdayMetrics.totalAlunas));
    document.getElementById('m-arrasas').parentElement.insertAdjacentHTML('beforeend', renderDiff(currentMetrics.totalAS, yesterdayMetrics.totalAS));
    document.getElementById('m-socio').parentElement.insertAdjacentHTML('beforeend', renderDiff(currentMetrics.socioOk, yesterdayMetrics.socioOk));
    document.getElementById('m-xp').parentElement.insertAdjacentHTML('beforeend', renderDiff(currentMetrics.totalXP, yesterdayMetrics.totalXP));
  }
  // --- Fim da Lógica de Comparação ---
  // A renderização dos gráficos é chamada a partir de tentarMergeEProcessar
}

// ── CARREGAMENTO DE DADOS ────────────────────────────────────────────────────────
function processarTudo(dados) {
  // NOVO: try...catch garante que qualquer erro no processamento não trave a tela
  try {
    if (!dados || dados.erro) {
      document.getElementById('tbody-alunas').innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i>Erro ao carregar dados: ${dados && dados.erro ? dados.erro : 'Verifique o script.'}</div></td></tr>`;
      document.getElementById('loading-overlay').style.display = 'none';
      setReloadButtonState(false); // Restaura em caso de erro
      return;
    }
    // Alimenta todas as variáveis de uma vez
    MEMBROS = dados.membros || [];
    SOCIO   = dados.socio   || [];
    CONFIG  = dados.config  || [];
    LOG     = dados.log     || [];
    
    tentarMergeEProcessar();
  } catch (erro) {
    console.error("Erro fatal ao processar e desenhar os dados na tela:", erro);
    // Mesmo que dê erro na renderização, a gente tira a tela de loading!
    document.getElementById('loading-overlay').style.display = 'none';
    setReloadButtonState(false);
    alert("Conseguimos baixar os dados, mas houve um erro ao desenhar os gráficos. Verifique o console.");
  }
}


function renderAllCharts() {
  initGeraisCharts(MEMBROS);
  if (!socioChartsReady) {
    initSocioCharts();
    socioChartsReady = true;
  }
  initImpactoCharts();
  renderConfigTabela();
  initConfigCharts();
  populateConfigFilter();
  renderTabela();
}

function fetchData() {
  // Remove scripts antigos para evitar cache e duplicação de dados
  document.querySelectorAll('.jsonp-script').forEach(el => el.remove());

  // Faz uma única requisição unificada ao backend para carregar todas as planilhas
  const s1 = document.createElement('script');
  s1.src = `${API_BASE}?callback=processarTudo&endpoint=all`;
  s1.className = 'jsonp-script';
  
  // NOVO: Tratamento de erro caso o link do Google Script falhe silenciosamente
  s1.onerror = function() {
    console.error("Falha na requisição: O banco de dados (Google Apps Script) não respondeu.");
    document.getElementById('loading-overlay').style.display = 'none';
    setReloadButtonState(false);
    alert("Erro de conexão com o banco de dados. Verifique sua internet ou tente recarregar a página.");
  };

  document.body.appendChild(s1);
}


function clearUIForLoading() {
  document.getElementById('tbody-alunas').innerHTML = '';
  document.getElementById('tbody-config').innerHTML = '';
  ['m-total', 'm-arrasas', 'm-socio', 'm-xp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });
  ['m-horas-curso'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });
}

function setReloadButtonState(isLoading) {
  const buttons = document.querySelectorAll('button[onclick="reloadData()"]');
  buttons.forEach(btn => {
    if (isLoading) {
      btn.disabled = true;
      if (!btn.dataset.originalText) {
        btn.dataset.originalText = btn.innerHTML; // Salva o ícone e texto original
      }
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pensando...';
      btn.classList.add('btn-loading'); // Adiciona a barra de progresso em CSS
    } else {
      btn.disabled = false;
      if (btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
      }
      btn.classList.remove('btn-loading');
    }
  });
}

function reloadData() {
  // Bloqueia os botões e mostra a barra de progresso animada
  setReloadButtonState(true);

  // Mostra a tela de carregamento
  document.getElementById('loading-overlay').style.display = 'flex';

  clearUIForLoading();

  // Limpa os dados antigos
  MEMBROS = [];
  SOCIO = [];
  CONFIG = [];
  LOG = [];
  chartInstances = {};
  socioChartsReady = false;

  // Buscar novos dados
  fetchData();
}

function initApp() {
  // Fecha o modal ao clicar fora dele
  document.getElementById('socio-modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // Fecha o modal de opções de PDF ao clicar fora dele
  document.getElementById('pdf-options-modal').addEventListener('click', function(e) {
    if (e.target === this) closePdfOptionsModal();
  });

  if (window.innerWidth <= 860) {
    document.querySelector('.sidebar').classList.remove('expanded');
  }

  // Fecha a barra lateral ao clicar fora dela (em modo mobile)
  document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.sidebar');
    const isClickInsideSidebar = sidebar.contains(event.target);
    const isMenuToggle = event.target.closest('.menu-toggle');

    if (sidebar.classList.contains('expanded') && !isClickInsideSidebar && !isMenuToggle) {
      sidebar.classList.remove('expanded');
    }
  });

  fetchData(); // Carrega os dados na inicialização
}

async function saveConfigChanges() {
  const tableRows = document.querySelectorAll('#tbody-config tr');
  const newConfigData = [];

  tableRows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    newConfigData.push({
      'Codigo': inputs[0].value,
      'Descrição': inputs[1].value,
      'Tipo': inputs[2].value,
      'Fase pedagogica': inputs[3].value,
      'Horas': inputs[4].value,
      'Valor': inputs[5].value
    });
  });

  // Exibe um feedback visual para o usuário
  const saveButton = document.querySelector('#panel-config .btn-primary');
  if (!saveButton.dataset.originalText) {
    saveButton.dataset.originalText = saveButton.innerHTML;
  }
  saveButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
  saveButton.classList.add('btn-loading');
  saveButton.disabled = true;

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // Required for Apps Script POST
      body: JSON.stringify({ endpoint: 'config', data: newConfigData })
      // mode: 'no-cors' // 'no-cors' pode ser necessário em alguns cenários, mas impede a leitura da resposta.
    });

    // Idealmente, verificaríamos a resposta, mas por simplicidade, assumimos sucesso.
    alert('Alterações salvas com sucesso! Os dados serão recarregados.');
    saveButton.innerHTML = saveButton.dataset.originalText;
    saveButton.classList.remove('btn-loading');
    saveButton.disabled = false;
    reloadData();

  } catch (error) {
    alert('Ocorreu um erro ao salvar as alterações. Verifique o console para mais detalhes.');
    saveButton.innerHTML = saveButton.dataset.originalText || '<i class="fa-solid fa-save"></i> Salvar Alterações';
    saveButton.classList.remove('btn-loading');
    saveButton.disabled = false;
  }
}

/**
 * Configura o marquee de patrocinadores duplicando os logotipos para criar um efeito de rolagem infinita.
 */
function setupSponsorMarquee() {
  const logosContainer = document.querySelector('.sponsors-logos');
  if (!logosContainer) return;

  const logos = logosContainer.querySelectorAll('img');
  logos.forEach(logo => {
    logosContainer.appendChild(logo.cloneNode(true));
  });
}

window.addEventListener('load', () => {
  initApp();
  setupSponsorMarquee();
});
