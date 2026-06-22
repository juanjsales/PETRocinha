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
let EVENTOS = [];
let PRESENCAS = [];
let isLoadingEventos = false;
let currentEventId = null;
let socioChartsReady = false;
const SALARIO_MINIMO = 1621;
const VALOR_HORA_AULA_SOCIAL = 18.50; // Valor simbólico em R$ para o cálculo do sROI, baseado em fontes de referência (ex: Pronatec/MEC)
let chartInstances = {}; // Para armazenar e gerenciar as instâncias dos gráficos
let leafletMap = null; // Instância do mapa OpenStreetMap
let leafletHeat = null; // Instância da camada de calor Leaflet
let leafletMarkers = null; // Instância para armazenar os marcadores (bolinhas) das alunas
let leafletTileLayer = null; // Instância da camada de fundo do mapa

// ── NAVEGAÇÃO ─────────────────────────────────────────────────────────
function switchPanel(id, el) {
  if (id === 'config') {
    let isAuthorized = sessionStorage.getItem('adminAuthorized');
    
    // Tenta ler o e-mail da URL (caso o Circle.so passe o e-mail como parâmetro no Iframe)
    const urlParams = new URLSearchParams(window.location.search);
    const urlEmail = urlParams.get('email');
    
    // MELHORIA: .trim() para remover espaços e tratamento seguro para evitar erros caso urlEmail venha nulo
    if (urlEmail && urlEmail.trim().toLowerCase() === "profissaopet@j3lab.com.br") {
      isAuthorized = 'true';
      sessionStorage.setItem('adminAuthorized', 'true');
    }

    if (!isAuthorized) {
      alert("Acesso negado. Esta área é restrita para profissaopet@j3lab.com.br");
      return; // Interrompe a função e bloqueia a navegação
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
  if (id === 'eventos') {
    loadEventosData();
  }
  if (id === 'radar-pet') {
    setTimeout(() => {
      if (typeof initLeafletMap === 'function') initLeafletMap();
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

  Chart.defaults.animation = false;
  document.querySelectorAll('.panel').forEach(p => {
    p.style.display = selectedPanelIds.includes(p.id) ? 'block' : 'none';
  });

  setTimeout(() => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const formattedDate = `${yyyy}-${mm}-${dd}`;

      const opt = {
          margin:       [15, 12, 15, 12],
          filename:     `relatorio-profissao-pet-rocinha-${formattedDate}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, logging: false },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak:    { mode: ['avoid-all', 'css'] }
      };

      const elementToPrint = mainElement.cloneNode(true);
      elementToPrint.querySelectorAll('.btn, .filter-sel, .modal-backdrop, .menu-toggle').forEach(el => el.remove());

      elementToPrint.style.margin = '0';
      elementToPrint.style.padding = '0';
      elementToPrint.style.width = '100%';
      elementToPrint.style.maxWidth = '100%';

      elementToPrint.querySelectorAll('.metrics-grid, .socio-metrics, .charts-2col, .charts-3col').forEach(grid => {
          grid.style.display = 'block';
          grid.style.width = '100%';
      });

      elementToPrint.querySelectorAll('.chart-card, .table-card, .mcard, .event-card').forEach(card => {
          card.style.display = 'block';
          card.style.width = '100%';
          card.style.marginBottom = '20px';
          card.style.pageBreakInside = 'avoid';
          card.style.breakInside = 'avoid';
          card.style.boxShadow = 'none';
          card.style.transform = 'none';
      });

      const originalCanvases = mainElement.querySelectorAll('canvas');
      const clonedCanvases = elementToPrint.querySelectorAll('canvas');
      
      originalCanvases.forEach((canvas, index) => {
          if (clonedCanvases[index]) {
              const dataURL = canvas.toDataURL('image/png');
              const img = document.createElement('img');
              img.src = dataURL; 
              img.style.width = '100%'; 
              img.style.height = 'auto';
              img.style.display = 'block';
              img.style.margin = '0 auto';
              img.style.pageBreakInside = 'avoid';
              img.style.breakInside = 'avoid';
              
              const parentContainer = clonedCanvases[index].parentNode;
              if (parentContainer) {
                  parentContainer.style.display = 'block';
                  parentContainer.style.position = 'relative';
                  parentContainer.style.overflow = 'hidden';
                  parentContainer.style.height = 'auto';
                  parentContainer.style.width = '100%';
                  parentContainer.replaceChild(img, clonedCanvases[index]);
              }
          }
      });

      elementToPrint.querySelectorAll('.chart-card').forEach(card => {
          card.style.setProperty('position', 'relative', 'important');
          card.style.setProperty('overflow', 'hidden', 'important');
          card.style.setProperty('height', 'auto', 'important');
      });

      html2pdf().from(elementToPrint).set(opt).save().then(() => {
          document.title = originalTitle;
          Chart.defaults.animation = true;
          document.querySelectorAll('.panel').forEach(p => {
              p.style.display = (p.id === activePanelId) ? 'block' : 'none';
          });
      });
  }, 150);
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

// ── MAPA DE CALOR LEAFLET (OPENSTREETMAP) ─────────────────────────────────
function initLeafletMap() {
  const container = document.getElementById('mapa-calor-leaflet');
  if (!container || typeof L === 'undefined') return;
  if (container.clientWidth === 0 || container.clientHeight === 0) return;

  if (!leafletMap) {
    leafletMap = L.map('mapa-calor-leaflet').setView([-22.9886, -43.2486], 15);
    leafletTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(leafletMap);
  }

  if (!leafletMarkers) {
    leafletMarkers = L.markerClusterGroup({
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 18
    });
  } else {
    leafletMarkers.clearLayers();
  }

  const heatData = [];
  MEMBROS.forEach(m => {
    const lat = m.lat || (m.dadosSocio && m.dadosSocio.lat);
    const lng = m.lng || (m.dadosSocio && m.dadosSocio.lng);
    
    if (lat && lng) {
      const pLat = parseFloat(lat);
      const pLng = parseFloat(lng);
      heatData.push([pLat, pLng, 1]);

      const badgeIdx = BADGE_LABELS.indexOf(m.badge);
      const mColor = badgeIdx >= 0 ? BADGE_COLORS[badgeIdx] : '#378add';

      const circle = L.circleMarker([pLat, pLng], {
        radius: 7,
        fillColor: mColor,
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85
      });

      circle.bindTooltip(`<b>${m.nome}</b><br><span style="font-size:11px">${m.badge || 'Sem medalha'}</span>`, { direction: 'top' });
      if (m.cpf) {
        circle.on('click', () => showSocioModal(m.cpf));
      }
      circle.addTo(leafletMarkers);
    }
  });

  if (leafletHeat) {
    leafletMap.removeLayer(leafletHeat);
  }

  const showHeat = document.getElementById('ctrl-leaflet-heat') ? document.getElementById('ctrl-leaflet-heat').checked : true;
  const showMarkers = document.getElementById('ctrl-leaflet-markers') ? document.getElementById('ctrl-leaflet-markers').checked : true;

  if (heatData.length > 0 && typeof L.heatLayer !== 'undefined') {
    leafletHeat = L.heatLayer(heatData, {
      radius: 25, 
      blur: 20, 
      maxZoom: 17,
      gradient: {0.3: '#0ea5e9', 0.5: '#10b981', 0.7: '#eab308', 1.0: '#ef4444'}
    });
    if (showHeat) leafletHeat.addTo(leafletMap);
  }

  if (showMarkers) {
    leafletMarkers.addTo(leafletMap);
  } else {
    leafletMap.removeLayer(leafletMarkers);
  }

  changeLeafletStyle();
  leafletMap.invalidateSize();
}

function toggleLeafletHeat() {
  if (!leafletMap || !leafletHeat) return;
  const isChecked = document.getElementById('ctrl-leaflet-heat').checked;
  isChecked ? leafletHeat.addTo(leafletMap) : leafletMap.removeLayer(leafletHeat);
}

function toggleLeafletMarkers() {
  if (!leafletMap || !leafletMarkers) return;
  const isChecked = document.getElementById('ctrl-leaflet-markers').checked;
  isChecked ? leafletMarkers.addTo(leafletMap) : leafletMap.removeLayer(leafletMarkers);
}

function changeLeafletStyle() {
  if (!leafletTileLayer) return;
  const styleSelect = document.getElementById('ctrl-leaflet-style');
  if (!styleSelect) return;
  
  const style = styleSelect.value;
  const tileUrls = {
    'standard': 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    'dark': 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    'light': 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
  };
  leafletTileLayer.setUrl(tileUrls[style] || tileUrls['standard']);
}

// ── GEOCODIFICAÇÃO GRATUITA (VIACEP + NOMINATIM) ──────────────────────────
async function geocodeSocioDataBackground() {
  let updated = false;
  for (const m of MEMBROS) {
    const cepStr = m.cep || m.CEP || (m.dadosSocio && (m.dadosSocio.cep || m.dadosSocio.CEP)); 
    
    if ((!m.lat && !m.latitude) && cepStr) {
      const cleanCep = String(cepStr).replace(/\D/g, ''); 
      const cacheKey = `geo_os_${cleanCep || cepStr}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        m.lat = parsed.lat; m.lng = parsed.lon;
        updated = true;
      } else {
        try {
          await new Promise(resolve => setTimeout(resolve, 1500));
          let query = cleanCep.length === 8 ? `${cleanCep}, Rio de Janeiro, Brasil` : `${cepStr}, Rio de Janeiro, Brasil`;
          
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (data && data.length > 0) {
            m.lat = parseFloat(data[0].lat); m.lng = parseFloat(data[0].lon);
            localStorage.setItem(cacheKey, JSON.stringify({ lat: m.lat, lon: m.lng }));
            updated = true; initLeafletMap();
          }
        } catch (error) {
          console.warn(`Erro ao converter CEP ${cepStr}:`, error);
        }
      }
    }
  }
  if (updated) initLeafletMap();
}

// ── GRÁFICOS: VISÃO GERAL ──────────────────────────────────────────────────
function initGeraisCharts(membros) {
  const badgeCounts = countBy(membros, m => m.badge);
  const bData = BADGE_LABELS.map(l => badgeCounts[l] || 0);
  donutChart('chartBadge', BADGE_LABELS, bData, BADGE_COLORS);
  makeLegend('legend-badge', BADGE_LABELS.map((l, i) => `${l} (${bData[i]})`), BADGE_COLORS);

  const top5 = [...membros].sort((a, b) => b.arrasas - a.arrasas).slice(0, 5);
  barChart('chartTop5', top5.map(m => m.nome.split(' ')[0]), top5.map(m => m.arrasas), '#003366');

  const total = membros.length;
  const prog = document.getElementById('progress-badges');
  prog.innerHTML = BADGE_LABELS.map((l, i) => {
    const pct = total ? Math.round((bData[i] / total) * 100) : 0;
    return `<div class="progress-item">
      <div class="progress-top"><span>${l}</span><span class="progress-pct">${bData[i]} alunas · ${pct}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${BADGE_COLORS[i]}"></div></div>
    </div>`;
  }).join('');

  // 💡 RECALIBRADO: Gráfico de Média de Horas por Fase (Minutos convertidos para Horas Decimais)
  if (LOG.length > 0 && CONFIG.length > 0 && membros.length > 0) {
    const configMap = new Map(CONFIG.map(item => [
      item.Codigo, 
      { minutos: Number(item.Horas) || 0, fase: item['Fase pedagogica'] }
    ]));
    
    const totalMinutosPorFase = LOG.reduce((acc, logEntry) => {
      const configItem = configMap.get(logEntry.codigo_evento);
      if (configItem && configItem.fase) {
        acc[configItem.fase] = (acc[configItem.fase] || 0) + configItem.minutos;
      }
      return acc;
    }, {});

    const fases = ['Acreditar', 'Aprender', 'Agir'];
    const avgHorasData = fases.map(fase => {
      const totalMinutos = totalMinutosPorFase[fase] || 0;
      const totalHorasLíquidas = totalMinutos / 60; // 🎯 Conversão explícita de Minutos para Horas
      return totalHorasLíquidas / membros.length;
    });

    barChart('chartAvgHorasFase', fases, avgHorasData, ['#378add', '#1d9e75', '#ef9f27']);
  }
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

  const emprego = countBy(s, r => r.trabalhando ? (r.ocupacao || 'Com vínculo') : 'Sem vínculo');
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
  
  document.getElementById('s-filhos').textContent = comFilhos + (s.length ? ` (${Math.round(comFilhos / s.length * 100)}%)` : '');
  document.getElementById('s-trabalho').textContent = comTrabalho + (s.length ? ` (${Math.round(comTrabalho / s.length * 100)}%)` : '');
  document.getElementById('s-baixa-renda').textContent = baixaRenda + (s.length ? ` (${Math.round(baixaRenda / s.length * 100)}%)` : '');
}

// ── GRÁFICOS: ODS & SROI ──────────────────────────────────────────────────
function initImpactoCharts() {
  if (SOCIO.length === 0) return;

  const ods1 = SOCIO.filter(s => s.ganhos && (s.ganhos.includes('500') || s.ganhos.includes('1.413') || s.ganhos.includes('1413'))).length;
  const ods4 = MEMBROS.length;
  const ods5 = SOCIO.filter(s => s.filhos === 'Sim').length;
  const ods8 = SOCIO.filter(s => !s.trabalhando).length;

  const alunasSemVinculo = SOCIO.filter(s => !s.trabalhando).length;
  const potencialRenda = alunasSemVinculo * SALARIO_MINIMO;
  document.getElementById('sroi-renda-potencial').textContent = potencialRenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  document.getElementById('sroi-renda-sub').textContent = `Considerando ${alunasSemVinculo} alunas sem vínculo empregatício empregadas com 1 S.M.`;
  document.getElementById('ods-1-val').textContent = `${ods1} alunas`;
  document.getElementById('ods-4-val').textContent = `${ods4} alunas`;
  document.getElementById('ods-5-val').textContent = `${ods5} alunas`;
  document.getElementById('ods-8-val').textContent = `${ods8} alunas`;

  const totalAlunas = MEMBROS.length;
  const odsCoberturaData = [(ods1 / totalAlunas) * 100, (ods4 / totalAlunas) * 100, (ods5 / totalAlunas) * 100, (ods8 / totalAlunas) * 100];
  const odsCoberturaLabels = ["ODS 1", "ODS 4", "ODS 5", "ODS 8"];
  const odsCoberturaColors = ['#e5243b', '#c59b2e', '#ef402b', '#a21942'];
  hBarChart('chartOdsCobertura', odsCoberturaLabels, odsCoberturaData, odsCoberturaColors);

  const alunasSemVinculoSocio = SOCIO.filter(s => !s.trabalhando);
  const escolaridadeOds8 = countBy(alunasSemVinculoSocio, s => s.escolaridade);
  const escOds8Labels = Object.keys(escolaridadeOds8);
  const escOds8Data = Object.values(escolaridadeOds8);
  donutChart('chartOds8Escolaridade', escOds8Labels, escOds8Data, PIE_PALETTE);
  makeLegend('legend-ods8-escolaridade', escOds8Labels.map((l, i) => `${l} (${escOds8Data[i]})`), PIE_PALETTE);

  const alunasSemVinculo = SOCIO.filter(s => !s.trabalhando).length;
  const potencialRenda = alunasSemVinculo * SALARIO_MINIMO;

  document.getElementById('sroi-renda-potencial').textContent = potencialRenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  document.getElementById('sroi-renda-sub').textContent = `Considerando ${alunasSemVinculo} alunas sem vínculo empregatício empregadas com 1 S.M.`;

  // 💡 RECALIBRADO: Métrica do sROI de Valor Social da Educação (Proxy baseada em minutos convertidos)
const totalMinutosCurso = CONFIG.reduce((sum, item) => {
    const tipo = String(item.Tipo || '').toLowerCase().trim();
    const minutos = Number(item.Horas || item.horas || 0);
    
    // Filtra independente de espaços ou letras maiúsculas na planilha Config
    if (tipo === 'curso' && minutos > 0) {
      return sum + minutos;
    }
    return sum;
  }, 0);
  
  // Se o filtro estrito falhar, calcula com base em todas as cargas horárias registradas como plano B
  const minutosLiquidos = totalMinutosCurso > 0 
    ? totalMinutosCurso 
    : CONFIG.reduce((sum, item) => sum + (Number(item.Horas || item.horas || 0)), 0);

  const totalHorasLíquidasCurso = minutosLiquidos / 60;
  
  // Multiplicação do sROI baseada nas diretrizes de custeio/h da Bolsa-Formação PRONATEC/MEC
  const valorEducacao = totalHorasLíquidasCurso * MEMBROS.length * VALOR_HORA_AULA_SOCIAL;
  
  // Atualiza com segurança o Card Proxy na tela
  const cardProxy = document.getElementById('sroi-valor-educacao');
  if (cardProxy) {
    cardProxy.textContent = valorEducacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  const situacaoProf = countBy(SOCIO, s => s.ocupacao);
  const sitLabels = Object.keys(situacaoProf);
  const sitData = Object.values(situacaoProf);
  donutChart('chartSroiSituacao', sitLabels, sitData, PIE_PALETTE);
  makeLegend('legend-sroi-situacao', sitLabels.map((l, i) => `${l} (${sitData[i]})`), PIE_PALETTE);

  const faixasDeRenda = {
    'Até R$ 500': { sum: 250, count: 0 },
    'De R$ 501 a R$ 1.412': { sum: 956, count: 0 },
    'De R$ 1.413 a R$ 2.000': { sum: 1700, count: 0 },
    'Acima de R$ 2.001': { sum: 2500, count: 0 }
  };
  const rendaMap = { '500': 'Até R$ 500', '1.412': 'De R$ 501 a R$ 1.412', '2.000': 'De R$ 1.413 a R$ 2.000', '2.001': 'Acima de R$ 2.001' };

  SOCIO.forEach(s => {
    const ganhoStr = s.ganhos || '';
    const key = Object.keys(rendaMap).find(sub => ganhoStr.includes(sub));
    if (key) faixasDeRenda[rendaMap[key]].count++;
  });

  const potLabels = Object.keys(faixasDeRenda);
  const rendaAtualData = potLabels.map(key => faixasDeRenda[key].count > 0 ? faixasDeRenda[key].sum : 0);
  const rendaPotencialData = potLabels.map(key => faixasDeRenda[key].count > 0 ? SALARIO_MINIMO : 0);

  groupedBarChart('chartSroiPotencial', potLabels, [
    { label: 'Renda Média Atual (Estimada)', data: rendaAtualData, backgroundColor: '#a8a29e', borderRadius: 4 },
    { label: 'Renda Potencial (1 S.M.)', data: rendaPotencialData, backgroundColor: '#166534', borderRadius: 4 }
  ]);

  const pontosPorFase = CONFIG.reduce((acc, item) => {
    const fase = item['Fase pedagogica'] || 'Não Definida';
    const valor = Number(item.Valor) || 0;
    if (valor > 0) acc[fase] = (acc[fase] || 0) + valor;
    return acc;
  }, {});
  barChart('chartSroiIncentivos', Object.keys(pontosPorFase), Object.values(pontosPorFase), '#003366');
}

// ── GRÁFICOS E TABELA: CONFIGURAÇÕES ───────────────────────────────────────────────
function initConfigCharts() {
  if (CONFIG.length === 0) return;

  // 💡 RECALIBRADO: Gráfico de Carga Horária (Minutos convertidos para Horas na exibição gráfica)
  const horasPorFase = CONFIG.reduce((acc, item) => {
    const fase = item['Fase pedagogica'] || 'Não Definida';
    const minutos = Number(item.Horas) || 0;
    if (minutos > 0) {
      acc[fase] = (acc[fase] || 0) + (minutos / 60); // 🎯 Converte minutos para horas decimais
    }
    return acc;
  }, {});

  const faseLabels = Object.keys(horasPorFase);
  const faseData = Object.values(horasPorFase).map(h => parseFloat(h.toFixed(1))); // Limita a 1 casa decimal

  donutChart('chartConfigFase', faseLabels, faseData, PIE_PALETTE);
  makeLegend('legend-config-fase', faseLabels.map((l, i) => `${l} (${faseData[i]}h)`), PIE_PALETTE);

  const tipos = countBy(CONFIG, item => item.Tipo);
  const tipoLabels = Object.keys(tipos);
  const tipoData = Object.values(tipos);
  donutChart('chartConfigTipo', tipoLabels, tipoData, PIE_PALETTE);
  makeLegend('legend-config-tipo', tipoLabels.map((l, i) => `${l} (${tipoData[i]})`), PIE_PALETTE);
}

function populateConfigFilter() {
  const filterSelect = document.getElementById('filter-config-tipo');
  filterSelect.innerHTML = '<option value="">Todos os Tipos</option>';
  const tipos = [...new Set(CONFIG.map(item => item.Tipo).filter(Boolean))];
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
    // 💡 PADRONIZAÇÃO VISUAL: Transforma o Tipo em formato Title/Capitalize (Ex: "CURSO" vira "Curso")
    const tipoCru = String(c.Tipo || '').toLowerCase().trim();
    const tipoFormatado = tipoCru.charAt(0).toUpperCase() + tipoCru.slice(1);

    return `<tr>
      <td><input type="text" class="table-input" value="${c.Codigo}" readonly style="background:#eee; border:none; font-family:monospace;"></td>
      <td><input type="text" class="table-input" value="${c['Descrição'] || ''}"></td>
      <td><span class="pill b-curiosa" style="text-transform: capitalize !important; font-weight: 700; font-size: 11px;">${tipoFormatado}</span></td>
      <td><input type="text" class="table-input" value="${c['Fase pedagogica'] || ''}"></td>
      <td><input type="number" class="table-input" value="${c.Horas || 0}" style="width: 70px;"> <small style="color:var(--muted); font-size:10px;">min</small></td>
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
    
    // 💡 FORMATADO: Exibe com precisão matemática em formato de horas decimais líquidas (Ex: 1.5h em vez de 90h)
    const horasExibidas = m.horasConcluidas ? m.horasConcluidas.toFixed(1) : 0;

    return `<tr>
      <td data-label="Nome">
        <div class="name-cell">
          <span class="avatar">${initials(m.nome || '')}</span>
          <strong style="cursor:pointer;text-decoration:underline;" onclick="showSocioModal('${m.cpf}')">${m.nome}</strong>
        </div>
      </td>
      <td data-label="E-mail" style="color:var(--muted);font-size:12px">${m.email}</td>
      <td data-label="Medalha"><span class="pill ${bClass}">${m.badge}</span></td>
      <td data-label="Horas"><strong>${horasExibidas}h</strong></td>
      <td data-label="Arrasas"><strong>${m.arrasas.toLocaleString('pt-BR')} AS</strong></td>
      <td data-label="XP">${m.xp.toLocaleString('pt-BR')} XP</td>
      <td data-label="Socioecon.">${m.dadosSocio ? `<span class="status-ok"><i class="fa-solid fa-circle-check"></i> Concluído</span>` : `<span class="status-pend"><i class="fa-regular fa-clock"></i> Pendente</span>`}</td>
    </tr>`;
  }).join('');
}

// ── EVENTOS E PRESENÇA ───────────────────────────────────────────────────────────
function renderEventos() {
  if (isLoadingEventos) return;
  const container = document.getElementById('events-container');
  if (!container) return;
  
  if (!EVENTOS || EVENTOS.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><i class="fa-solid fa-list-check"></i>Nenhuma presença registrada ainda.</div>`;
    return;
  }
  
  container.innerHTML = EVENTOS.map(ev => {
    const dateObj = new Date(ev.date);
    const dateStr = dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });
    const count = (ev.presentes || []).length;
    
    const avaliacoes = (ev.presentes || []).filter(p => p.Classificacao);
    const media = avaliacoes.length ? (avaliacoes.reduce((acc, curr) => acc + Number(curr.Classificacao), 0) / avaliacoes.length).toFixed(1) : '-';
    const conteudos = avaliacoes.map(p => Number(p.Conteudo)).filter(n => !isNaN(n) && n > 0);
    const mediaConteudo = conteudos.length ? (conteudos.reduce((a, b) => a + b, 0) / conteudos.length).toFixed(1) : '-';
    const estruturas = avaliacoes.map(p => Number(p.Estrutura)).filter(n => !isNaN(n) && n > 0);
    const mediaEstrutura = estruturas.length ? (estruturas.reduce((a, b) => a + b, 0) / estruturas.length).toFixed(1) : '-';

    const perfis = countBy(ev.presentes || [], p => p.Perfil);
    const perfilComum = Object.keys(perfis).length ? Object.keys(perfis).reduce((a, b) => perfis[a] > perfis[b] ? a : b) : '-';
    const comentariosCount = avaliacoes.filter(p => p.Comentario_Geral && String(p.Comentario_Geral).trim().length > 0).length;
    const linkUrl = `${API_BASE}?evento=${encodeURIComponent(ev.title)}`;

    return `
      <div class="event-card">
        <div class="event-date"><i class="fa-regular fa-clock"></i> ${dateStr}</div>
        <div class="event-title">${ev.title}</div>
        <div class="event-desc">${ev.desc || ''}</div>
        <div class="event-insights" style="background: var(--surface2); padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--border);">
           <div style="font-size: 11px; text-transform: uppercase; color: var(--navy); font-weight: 700; margin-bottom: 12px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;"><i class="fa-solid fa-chart-simple"></i> Insights do Evento</div>
           <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
             <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid var(--border);"><span style="font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px;"><i class="fa-solid fa-users"></i> Presenças</span><strong style="font-size: 16px; color: var(--navy);">${count}</strong></div>
             <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid var(--border);"><span style="font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px;"><i class="fa-solid fa-star" style="color:var(--gold)"></i> Aval. Geral</span><strong style="font-size: 16px; color: var(--navy);">${media}</strong></div>
             <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid var(--border);"><span style="font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px;"><i class="fa-solid fa-book-open" style="color:var(--purple)"></i> Conteúdo</span><strong style="font-size: 16px; color: var(--navy);">${mediaConteudo}</strong></div>
             <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid var(--border);"><span style="font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px;"><i class="fa-solid fa-building" style="color:var(--green)"></i> Estrutura</span><strong style="font-size: 16px; color: var(--navy);">${mediaEstrutura}</strong></div>
             <div style="grid-column: 1 / -1; background: white; padding: 10px; border-radius: 8px; border: 1px solid var(--border);"><span style="font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px;"><i class="fa-solid fa-id-badge" style="color:var(--orange)"></i> Perfil Dominante</span><strong style="font-size: 13px; color: var(--navy);">${perfilComum}</strong></div>
           </div>
           ${comentariosCount > 0 ? `<div style="margin-top: 12px; font-size: 12px; color: var(--navy); font-weight: 500; text-align: center;"><i class="fa-regular fa-comments"></i> ${comentariosCount} comentários recebidos</div>` : ''}
        </div>
        <div class="event-footer" style="flex-wrap: wrap; gap: 10px;">
          <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px; flex: 1;" onclick="navigator.clipboard.writeText('${linkUrl}'); alert('Link de presença copiado!');"><i class="fa-solid fa-link"></i> Link</button>
          <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" onclick="openAttendanceModal('${ev.id}')">Gerenciar</button>
        </div>
      </div>
    `;
  }).join('');
}

function loadEventosData() {
  if (PRESENCAS.length > 0 || isLoadingEventos) {
    renderEventos();
    return;
  }
  isLoadingEventos = true;
  const container = document.getElementById('events-container');
  if (container) container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><i class="fa-solid fa-spinner fa-spin"></i> Baixando presenças da planilha...</div>`;
  
  const s1 = document.createElement('script');
  s1.src = `${API_BASE}?callback=processarEventos&endpoint=presencas`;
  s1.className = 'jsonp-script-eventos';
  s1.onerror = function() {
    isLoadingEventos = false;
    if (container) container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; color: var(--pink);"><i class="fa-solid fa-triangle-exclamation"></i> Erro ao carregar eventos.</div>`;
  };
  document.body.appendChild(s1);
}

function processarEventos(dados) {
  isLoadingEventos = false;
  PRESENCAS = dados || [];
  
  const presencasPorEvento = {};
  PRESENCAS.forEach(p => {
    const eventoNome = p.Evento || "Evento não identificado";
    if (!presencasPorEvento[eventoNome]) presencasPorEvento[eventoNome] = [];
    presencasPorEvento[eventoNome].push({
      Data_do_registro: p['Data do registro'], Evento: p.Evento, Nome: p.Nome, Email: p.Email,
      CPF: p.CPF, Celular: p.Celular, Localidade: p.Localidade, Perfil: p.Perfil,
      Classificacao: p['Classificação'], Comentario_Geral: p['Comentario Geral'], Conteudo: p.Conteudo,
      Comentario_conteudo: p['Comentario conteudo'], Estrutura: p.Estrutura, Comentario_estrutura: p['Comentario estrutura'],
      cpf: p.CPF
    });
  });

  EVENTOS = Object.keys(presencasPorEvento).map((nome, index) => {
    const presentes = presencasPorEvento[nome];
    let evDate = new Date().toISOString();
    if (presentes[0] && presentes[0].Data_do_registro) {
      const parsed = new Date(presentes[0].Data_do_registro);
      if (!isNaN(parsed.getTime())) evDate = parsed.toISOString();
    }
    return { id: 'ev_' + index, title: nome, date: evDate, desc: 'Registros extraídos da aba Lista de Presença.', presentes: presentes };
  });
  renderEventos();
}

function openAttendanceModal(eventId) {
  currentEventId = eventId;
  const ev = EVENTOS.find(e => e.id === eventId);
  if (!ev) return;
  
  document.getElementById('attendance-modal-title').textContent = `Presença: ${ev.title}`;
  document.getElementById('event-title-input').value = ev.title || '';

  const datetimeInput = document.getElementById('event-datetime');
  if (ev.date) {
    const d = new Date(ev.date);
    const tzoffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    datetimeInput.value = localISOTime;
  } else {
    datetimeInput.value = '';
  }
  renderAttendanceList();
  document.getElementById('attendance-modal').style.display = 'flex';
}

function closeAttendanceModal() {
  document.getElementById('attendance-modal').style.display = 'none';
  currentEventId = null;
}

function removePresence(cpf) {
  const ev = EVENTOS.find(e => e.id === currentEventId);
  if (!ev || !ev.presentes) return;
  ev.presentes = ev.presentes.filter(p => p.CPF !== cpf && p.cpf !== cpf);
  renderAttendanceList();
  renderEventos();
}

function renderAttendanceList() {
  const ev = EVENTOS.find(e => e.id === currentEventId);
  const container = document.getElementById('attendance-list');
  const countSpan = document.getElementById('attendance-count');

  if (!ev || !ev.presentes || ev.presentes.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 20px;"><i class="fa-solid fa-user-slash"></i>Nenhuma presença registrada.</div>`;
    countSpan.textContent = '0';
    return;
  }

  countSpan.textContent = ev.presentes.length;
  container.innerHTML = ev.presentes.map(p => `
    <div class="attendance-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--surface2); border-radius: 8px; border: 1px solid var(--border); font-size: 13px;">
      <div>
        <strong style="color: var(--navy);">${p.Nome || p.nome || 'Sem Nome'}</strong><br>
        <span style="font-size: 11px; color: var(--muted);">CPF: ${p.CPF || p.cpf} | Perfil: ${p.Perfil || '-'}</span>
        <div style="margin-top: 6px; display: flex; gap: 12px; font-size: 11px; font-weight: 500;">
          ${p.Classificacao ? `<span style="color: var(--gold);"><i class="fa-solid fa-star"></i> Geral: ${p.Classificacao}</span>` : ''}
          ${p.Conteudo ? `<span style="color: var(--purple);"><i class="fa-solid fa-book-open"></i> Conteúdo: ${p.Conteudo}</span>` : ''}
          ${p.Estrutura ? `<span style="color: var(--green);"><i class="fa-solid fa-building"></i> Estrutura: ${p.Estrutura}</span>` : ''}
        </div>
      </div>
      <button class="attendance-remove" onclick="removePresence('${p.CPF || p.cpf}')" style="color: var(--pink); background: none; border: none; cursor: pointer; font-size: 14px; padding: 4px;"><i class="fa-solid fa-trash-can"></i></button>
    </div>
  `).join('');
}

async function saveEventAndAttendance() {
  const btn = document.querySelector('#attendance-modal .btn-primary:last-child');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
  btn.disabled = true;

  try {
    const ev = EVENTOS.find(e => e.id === currentEventId);
    if (!ev) throw new Error("Evento não encontrado!");

    const newDateValue = document.getElementById('event-datetime').value;
    if (newDateValue) ev.date = new Date(newDateValue).toISOString();

    const newTitleValue = document.getElementById('event-title-input').value;
    if (newTitleValue && newTitleValue.trim() !== '') ev.title = newTitleValue.trim();

    const novasPresencas = ev.presentes.filter(p => p.novo);
    if (novasPresencas.length > 0) {
      const payload = novasPresencas.map(p => ({
        'Data do registro': p.Data_do_registro, 'Evento': p.Evento, 'Nome': p.Nome, 'Email': p.Email, 'CPF': p.CPF, 'Celular': p.Celular, 'Localidade': p.Localidade, 'Perfil': p.Perfil, 'Classificação': p.Classificacao, 'Comentario Geral': p.Comentario_Geral, 'Conteudo': p.Conteudo, 'Comentario conteudo': p.Comentario_conteudo, 'Estrutura': p.Estrutura, 'Comentario estrutura': p.Comentario_estrutura
      }));

      await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ endpoint: 'presencas', data: payload })
      });
      novasPresencas.forEach(p => delete p.novo);
    }
    renderEventos(); 
    alert('Alterações salvas com sucesso!');
    closeAttendanceModal();
  } catch (error) {
    alert('Erro ao salvar as alterações: ' + error.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// ── LÓGICA DO MODAL DE PERFIL ────────────────────────────────────────────────
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
    const endId = 'end-' + Date.now(); 

    // 💡 FORMATADO: Exibição unificada das horas decimais em vez de minutos no modal individual
    const horasLíquidasAluna = aluna.horasConcluidas ? aluna.horasConcluidas.toFixed(1) + 'h' : '0h';

    const programDetails = [
      { label: 'E-mail', value: aluna.email },
      { label: 'Telefone (WPP)', value: aluna.wpp },
      { label: 'Medalha Atual', value: aluna.badge },
      { label: 'Horas Concluídas', value: horasLíquidasAluna },
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
      { label: 'CPF', value: s.cpf }, { label: 'NIS', value: s.nis }, { label: 'Gênero', value: s.genero }, { label: 'Raça/Cor', value: s.raca }, { label: 'Orientação Sexual', value: s.orientacao }, { label: 'Estado Civil', value: s.estadoCivil }, { label: 'Filhos', value: `${s.filhos}${s.quantosFilhos > 0 ? ` (${s.quantosFilhos})` : ''}` }, { label: 'Escolaridade', value: s.escolaridade }, { label: 'Situação Profissional', value: s.situacaoProf }, { label: 'Trabalhando Hoje?', value: s.trabalhando ? 'Sim' : 'Não' }, { label: 'Ocupação', value: s.ocupacao }, { label: 'Renda Familiar', value: s.ganhos }, { label: 'Pessoas no Domicílio', value: s.pessoasDomicilio }, { label: 'Organização Financeira', value: s.orgFinanceira }, { label: 'Renda Extra', value: `${s.rendaExtra}${s.rendaExtraOque ? ` (${s.rendaExtraOque})` : ''}` }, { label: 'Maiores Gastos', value: s.maioresGastos }, { label: 'Interesse no Curso', value: s.interesse }, { label: 'Melhor Horário', value: s.horario }, { label: 'Indicação', value: s.indicacao }, { label: 'Motivação', value: s.motivacao },
    ];

    const renderGrid = (details) => details.map(d => `
      <div class="detail-item">
        <div class="detail-label">${d.label}</div>
        <div class="detail-value">${d.value || 'Não informado'}</div>
      </div>
    `).join('');

    body.innerHTML = `
      <div class="modal-profile-header">
        <img src="${aluna.imgUrl || 'https://github.com/juanjsales/PETRocinha/blob/main/pet%20(1).png?raw=true'}" class="modal-profile-img">
        <div><h3>${aluna.nome}</h3><p>${aluna.email}</p></div>
      </div>
      <h4><i class="fa-solid fa-award"></i> Perfil do Programa</h4>
      <div class="detail-grid">${renderGrid(programDetails)}</div>
      <div class="divider"></div>
      <h4><i class="fa-solid fa-users"></i> Perfil Socioeconômico</h4>
      <div class="detail-grid">${renderGrid(socioDetails)}</div>`;

    const cleanCep = String(aluna.cep || s.cep || s.CEP).replace(/\D/g, '');
    if (cleanCep.length === 8) {
      fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        .then(res => res.json())
        .then(data => {
          const el = document.getElementById(endId);
          if (el) el.textContent = data.erro ? 'CEP não encontrado' : (data.logradouro ? `${data.logradouro}, ${data.bairro}` : `${data.localidade} - ${data.uf}`);
        })
        .catch(() => { const el = document.getElementById(endId); if (el) el.textContent = 'Erro ao buscar endereço'; });
    } else {
      const el = document.getElementById(endId); if (el) el.textContent = cleanCep ? 'CEP inválido' : 'Não informado';
    }
  }
  document.getElementById('socio-modal').style.display = 'flex';
}

// ──💡 ALGORITMO CORE DE CONVERSÃO MATEMÁTICA (SINTONIA FINA) ──────────────────
function mergeDataSources(socioMap) {
  MEMBROS.forEach(membro => {
    const dadosSocio = socioMap.get(membro.cpf);
    if (dadosSocio) membro.dadosSocio = dadosSocio;

    if (membro.nascimento) {
      const birthDate = new Date(membro.nascimento);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      membro.idade = age;
    }
  });

  // 🎯 O MAPA AGORA ARMAZENA CARGA HORÁRIA EM MINUTOS DIRETAMENTE DO SHEETS
  const configMap = new Map(CONFIG.map(item => [item.Codigo, Number(item.Horas) || 0]));

  const logPorAluna = LOG.reduce((acc, logEntry) => {
    const email = logEntry.Email;
    if (email) {
      if (!acc[email]) acc[email] = [];
      acc[email].push(logEntry.codigo_evento);
    }
    return acc;
  }, {});

  MEMBROS.forEach(membro => {
    const alunaLogs = logPorAluna[membro.email] || [];
    
    // 🧠 SOMA DOS MINUTOS ACUMULADOS:
    const acumuladoMinutos = alunaLogs.reduce((totalMinutos, codigo) => totalMinutos + (configMap.get(codigo) || 0), 0);
    
    // 🎯 TRANSFORMAÇÃO MATEMÁTICA: Minutos convertidos explicitamente para Horas Decimais Líquidas
    membro.horasConcluidas = acumuladoMinutos / 60; 
    
    membro.formada = alunaLogs.includes('course_completed');
  });
}

function closeModal() {
  document.getElementById('socio-modal').style.display = 'none';
}

// ── JUNÇÃO E PROCESSAMENTO DE DADOS ───────────────────────────────────────────
function tentarMergeEProcessar() {
  if (MEMBROS.length === 0) {
    document.getElementById('loading-overlay').style.display = 'none';
    setReloadButtonState(false);
    return;
  }

  const socioMap = new Map(SOCIO.map(s => [s.cpf, s]));
  mergeDataSources(socioMap); 

  let totalAlunas = MEMBROS.length, totalAS = 0, totalXP = 0, socioOk = 0;
  MEMBROS.forEach(m => {
    totalAS += m.arrasas;
    totalXP += m.xp;
    if (m.dadosSocio) socioOk++;
  });
  const pct = totalAlunas ? Math.round(socioOk / totalAlunas * 100) : 0;

  updateDashboardUI({ totalAlunas, totalAS, totalXP, socioOk, pct });
  renderAllCharts();

  document.getElementById('loading-overlay').style.display = 'none';
  setReloadButtonState(false);
  geocodeSocioDataBackground();
}

function updateDashboardUI(metrics) {
  const { totalAlunas, totalAS, totalXP, socioOk, pct } = metrics;

  document.getElementById('m-total').textContent = totalAlunas;
  document.getElementById('m-arrasas').textContent = totalAS.toLocaleString('pt-BR') + ' AS';
  document.getElementById('m-socio').textContent = socioOk;
  document.getElementById('m-socio-pct').textContent = `${pct}% concluíram o formulário`;
  document.getElementById('m-xp').textContent = totalXP.toLocaleString('pt-BR') + ' XP';

  // 🛡️ CORREÇÃO E BLINDAGEM DO CÁLCULO DE HORAS TOTAIS
 const totalMinutosCurso = CONFIG.reduce((sum, item) => {
  const tipo = String(item.Tipo || '').toLowerCase().trim();
  const minutos = Number(item.Horas || item.horas || 0);
  
  if (tipo === 'curso' && minutos > 0) {
    return sum + minutos;
  }
  return sum;
}, 0);
  
  const totalHorasLíquidasDisplay = totalMinutosCurso / 60;
  const valorSocialProxy = totalHorasLíquidasDisplay * 25; 
  const elementoProxy = document.getElementById('m-proxy') || document.getElementById('v-proxy');
if (elementoProxy) {
  elementoProxy.textContent = valorSocialProxy > 0 
    ? `R$ ${valorSocialProxy.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'R$ 0,00';
}// Substitua o 25 pelo seu valor multiplicador caso seja outro
  // Se o cálculo ainda der 0 por falta de dados com a tag "Curso", 
  // ele tenta somar absolutamente tudo que tem minutos na aba Config como plano B
  if (totalHorasLíquidasDisplay === 0 && CONFIG.length > 0) {
    const fallbackMinutos = CONFIG.reduce((sum, item) => sum + (Number(item.Horas || item.horas || 0)), 0);
    document.getElementById('m-horas-curso').textContent = `${(fallbackMinutos / 60).toFixed(0)}h`;
  } else {
    document.getElementById('m-horas-curso').textContent = `${totalHorasLíquidasDisplay.toFixed(0)}h`;
  }

  // ── Restante das rotinas de Log / Diferenciais diários (Mantidas intactas) ──
  document.querySelectorAll('.mcard-diff').forEach(el => el.remove());
  const todayStr = new Date().toISOString().slice(0, 10);
  const storageKey = 'petRocinhaMetrics';
  const yesterdayMetrics = JSON.parse(localStorage.getItem(storageKey));
  const currentMetrics = { date: todayStr, totalAlunas, totalAS, socioOk, totalXP };

  if (!yesterdayMetrics || yesterdayMetrics.date !== todayStr) {
    localStorage.setItem(storageKey, JSON.stringify(currentMetrics));
  }

  const renderDiff = (current, previous) => {
    const diff = current - previous;
    if (isNaN(diff) || diff === 0) return '';
    return `<span class="mcard-diff ${diff > 0 ? 'pos' : 'neg'}">${diff > 0 ? '+' : ''}${diff}</span>`;
  };

  if (yesterdayMetrics && yesterdayMetrics.date !== todayStr) {
    document.getElementById('m-total').parentElement.insertAdjacentHTML('beforeend', renderDiff(currentMetrics.totalAlunas, yesterdayMetrics.totalAlunas));
    document.getElementById('m-arrasas').parentElement.insertAdjacentHTML('beforeend', renderDiff(currentMetrics.totalAS, yesterdayMetrics.totalAS));
    document.getElementById('m-socio').parentElement.insertAdjacentHTML('beforeend', renderDiff(currentMetrics.socioOk, yesterdayMetrics.socioOk));
    document.getElementById('m-xp').parentElement.insertAdjacentHTML('beforeend', renderDiff(currentMetrics.totalXP, yesterdayMetrics.totalXP));
  }
}

// ── CARREGAMENTO DE DADOS ────────────────────────────────────────────────────────
function processarTudo(dados) {
  try {
    if (!dados || dados.erro) {
      document.getElementById('tbody-alunas').innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i>Erro: ${dados?.erro || 'Desconhecido'}</div></td></tr>`;
      document.getElementById('loading-overlay').style.display = 'none';
      setReloadButtonState(false); 
      return;
    }
    MEMBROS = dados.membros || [];
    SOCIO   = dados.socio   || [];
    CONFIG  = dados.config  || [];
    LOG     = dados.log     || [];
    tentarMergeEProcessar();
  } catch (erro) {
    document.getElementById('loading-overlay').style.display = 'none';
    setReloadButtonState(false);
    alert("Erro ao renderizar gráficos. Verifique o console.");
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
  if (typeof renderEventos === 'function') renderEventos();
}

function fetchData() {
  document.querySelectorAll('.jsonp-script').forEach(el => el.remove());
  const s1 = document.createElement('script');
  s1.src = `${API_BASE}?callback=processarTudo&endpoint=all`;
  s1.className = 'jsonp-script';
  s1.onerror = function() {
    document.getElementById('loading-overlay').style.display = 'none';
    setReloadButtonState(false);
    alert("Erro de conexão com o banco de dados.");
  };
  document.body.appendChild(s1);
}

function clearUIForLoading() {
  document.getElementById('tbody-alunas').innerHTML = '';
  document.getElementById('tbody-config').innerHTML = '';
  ['m-total', 'm-arrasas', 'm-socio', 'm-xp', 'm-horas-curso'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = '—';
  });
}

function setReloadButtonState(isLoading) {
  const buttons = document.querySelectorAll('button[onclick="reloadData()"]');
  buttons.forEach(btn => {
    if (isLoading) {
      btn.disabled = true;
      if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pensando...';
      btn.classList.add('btn-loading'); 
    } else {
      btn.disabled = false;
      if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
      btn.classList.remove('btn-loading');
    }
  });
}

function reloadData() {
  setReloadButtonState(true);
  document.getElementById('loading-overlay').style.display = 'flex';
  clearUIForLoading();
  MEMBROS = []; SOCIO = []; CONFIG = []; LOG = []; EVENTOS = []; PRESENCAS = [];
  isLoadingEventos = false; chartInstances = {}; socioChartsReady = false;
  fetchData();
}

function initApp() {
  document.getElementById('socio-modal').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
  document.getElementById('pdf-options-modal').addEventListener('click', function(e) { if (e.target === this) closePdfOptionsModal(); });
  
  const attendanceModal = document.getElementById('attendance-modal');
  if (attendanceModal) {
    attendanceModal.addEventListener('click', function(e) { if (e.target === this && typeof closeAttendanceModal === 'function') closeAttendanceModal(); });
  }

  if (window.innerWidth <= 860) document.querySelector('.sidebar').classList.remove('expanded');

  document.addEventListener('click', function(event) {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar.classList.contains('expanded') && !sidebar.contains(event.target) && !event.target.closest('.menu-toggle')) {
      sidebar.classList.remove('expanded');
    }
  });
  fetchData(); 
}

async function saveConfigChanges() {
  const tableRows = document.querySelectorAll('#tbody-config tr');
  const newConfigData = [];
  let alertaMinutos = false;

  tableRows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const codigo = inputs[0].value;
    const horasEmMinutos = Number(inputs[4].value) || 0;

    // Se for um tipo Curso e o valor for muito baixo (ex: menor que 5), pode indicar que digitaram em horas brutas
    if (inputs[2].value === 'Curso' && horasEmMinutos > 0 && horasEmMinutos < 10) {
      alertaMinutos = true;
    }

    newConfigData.push({
      'Codigo': codigo, 
      'Descrição': inputs[1].value, 
      'Tipo': inputs[2].value, 
      'Fase pedagogica': inputs[3].value, 
      'Horas': horasEmMinutos, 
      'Valor': inputs[5].value
    });
  });

  // 🛡️ TRAVA DE SEGURANÇA INTERATIVA
  if (alertaMinutos) {
    const confirmar = confirm("⚠️ Atenção detectada!\n\nVocê inseriu valores de carga horária menores que 10 minutos em alguns cursos. Lembre-se de que a planilha armazena os dados em MINUTOS (ex: 2 horas = 120).\n\nDeseja salvar assim mesmo?");
    if (!confirmar) return; // Cancela a operação de salvamento
  }

  const saveButton = document.querySelector('#panel-config .btn-primary');
  if (!saveButton.dataset.originalText) saveButton.dataset.originalText = saveButton.innerHTML;
  saveButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
  saveButton.disabled = true;

  try {
    await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, 
      body: JSON.stringify({ endpoint: 'config', data: newConfigData })
    });
    alert('Alterações salvas com sucesso!');
    saveButton.innerHTML = saveButton.dataset.originalText;
    saveButton.disabled = false;
    reloadData();
  } catch (error) {
    alert('Ocorreu um erro ao salvar as alterações.');
    saveButton.innerHTML = saveButton.dataset.originalText;
    saveButton.disabled = false;
  }
}

function setupSponsorMarquee() {
  const logosContainer = document.querySelector('.sponsors-logos');
  if (!logosContainer) return;
  logosContainer.querySelectorAll('img').forEach(logo => { logosContainer.appendChild(logo.cloneNode(true)); });
}

window.addEventListener('load', () => { initApp(); setupSponsorMarquee(); });

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    countBy, initials, mergeDataSources,
    setGlobals: (membros, socio, config, log) => { MEMBROS = membros; SOCIO = socio; CONFIG = config; LOG = log; },
    getGlobals: () => ({ MEMBROS, SOCIO, CONFIG, LOG })
  };
}
