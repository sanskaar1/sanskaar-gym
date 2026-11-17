'use strict';
/* ---------- shared screen helpers ---------- */

// Feature files register their buttons here instead of growing one big switch:
// ACT['name'] = (button, event) => …  for data-a="name";  CHG['name'] = (input) => … for data-c="name" (change/input)
const ACT = {}, CHG = {};

// A light tap on iPhone (iOS 18+ ticks when a hidden switch is toggled; Android uses vibration)
let hapticLabel;
function haptic(kind) {
  try {
    if (navigator.vibrate) { navigator.vibrate(kind === 'success' ? [18, 50, 18] : 12); return; }
    if (!hapticLabel) { hapticLabel = document.createElement('label'); hapticLabel.style.display = 'none'; hapticLabel.innerHTML = '<input type="checkbox" switch>'; document.body.appendChild(hapticLabel); }
    hapticLabel.click();
    if (kind === 'success') setTimeout(() => hapticLabel.click(), 90);
  } catch (e) {}
}

/* segmented control and chips */
const segBar = (items, cur, action, cls = '') => `<div class="segbar ${cls}">${items.map(([k, l]) => `<button class="${k === cur ? 'on' : ''}" data-a="${action}" data-v="${k}">${l}</button>`).join('')}</div>`;
const pill = (txt, kind = '') => `<span class="pill2 ${kind}">${txt}</span>`;
const emptyCard = (title, sub, btn = '') => `<div class="card empty-state"><div class="es-t">${title}</div>${sub ? `<div class="es-s">${sub}</div>` : ''}${btn}</div>`;
const skeleton = (n = 3) => Array.from({ length: n }, () => '<div class="skel"></div>').join('');
const signedN = (d, dp = 1) => (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(dp ? Math.round(d * 10 ** dp) / 10 ** dp : Math.round(d)).toLocaleString();
const ytThumb = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
const shortDate = t => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const monthName = t => new Date(t).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

/* ---------- charts (Chart.js, stored with the app so it works offline) ---------- */
const PALETTE = {
  weight: '#ffd60a', bf: '#ff6b6b', waist: '#4dabf7', chest: '#69db7c', shoulders: '#b197fc', arms: '#ffa94d', forearms: '#63e6be',
  thighs: '#f783ac', calves: '#74c0fc', neck: '#e599f7', bmi: '#a9e34b',
  Chest: '#ff8787', Back: '#4dabf7', Shoulders: '#b197fc', Arms: '#ffa94d', Legs: '#69db7c', Glutes: '#f783ac', Core: '#ffd43b', Cardio: '#63e6be', Other: '#adb5bd',
  kcal: '#ffd60a', p: '#ff6b6b', c: '#4dabf7', f: '#ffa94d', water: '#74c0fc', sleep: '#b197fc', rhr: '#ff8787', hrv: '#63e6be', fatigue: '#ffa94d',
};
let chartQueue = [], chartsLive = [];
// Returns a placeholder; the chart is drawn right after the screen is shown
function chartBox(make, h = 170) {
  const id = 'ch' + Math.random().toString(36).slice(2, 8);
  chartQueue.push({ id, make });
  return `<div class="chart-box" style="height:${h}px"><canvas id="${id}" role="img"></canvas></div>`;
}
function mountCharts() {
  chartsLive = chartsLive.filter(c => { if (document.body.contains(c.canvas)) return true; c.destroy(); return false; });
  const q = chartQueue; chartQueue = [];
  if (!window.Chart) return;
  for (const { id, make } of q) { const el = document.getElementById(id); if (el) try { chartsLive.push(new Chart(el, make(el))); } catch (e) { console.warn('chart', e); } }
}
/* ---------- theme: light or dark, chosen in Settings ---------- */
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const ACC = () => cssVar('--chartAcc'); // the yellow, in a shade that reads on the current background
let themeOn = '';
function applyTheme() {
  const t = S.settings.theme === 'dark' ? 'dark' : 'light';
  if (t === themeOn) return;
  themeOn = t; document.documentElement.dataset.theme = t;
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = cssVar('--bg');
  PALETTE.weight = PALETTE.kcal = ACC();
  if (!window.Chart) return;
  Chart.defaults.color = cssVar('--muted'); Chart.defaults.font.family = "'DM Sans', Inter, system-ui, sans-serif"; Chart.defaults.font.size = 11;
  Chart.defaults.borderColor = cssVar('--line'); Chart.defaults.animation.duration = 450;
  Chart.defaults.plugins.legend.display = false;
  Object.assign(Chart.defaults.plugins.tooltip, { backgroundColor: cssVar('--solid'), borderColor: cssVar('--solid'), borderWidth: 1, padding: 10, displayColors: false, titleColor: cssVar('--onSolid'), bodyColor: cssVar('--onSolid') });
}
const fade = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
const gradientFor = (el, color) => { const g = el.getContext('2d').createLinearGradient(0, 0, 0, el.parentNode.clientHeight || 170); g.addColorStop(0, fade(color, .35)); g.addColorStop(1, fade(color, 0)); return g; };
// Smooth line over dates. pts: [{x: ms, y}], fmt formats values for the axis and tooltip
function lineChart2(pts, color, fmt = v => v, opts = {}) {
  return chartBox(el => ({
    type: 'line',
    data: { datasets: [{ data: pts, borderColor: color, backgroundColor: gradientFor(el, color), fill: true, tension: .35, borderWidth: 2.5, pointRadius: pts.length > 40 ? 0 : 3, pointHoverRadius: 6, pointBackgroundColor: color }].concat(opts.extra || []) },
    options: {
      maintainAspectRatio: false, parsing: false, interaction: { mode: 'nearest', intersect: false },
      scales: {
        x: { type: 'linear', min: pts[0]?.x, max: pts[pts.length - 1]?.x, grid: { display: false }, ticks: { maxTicksLimit: 4, callback: v => shortDate(v) } },
        y: { grace: '8%', ticks: { maxTicksLimit: 5, callback: v => fmt(v) }, beginAtZero: !!opts.zero },
      },
      plugins: { tooltip: { callbacks: { title: it => nice(it[0].parsed.x), label: it => fmt(it.parsed.y) } } },
    },
  }), opts.h || 170);
}
function barChart2(labels, datasets, opts = {}) {
  return chartBox(() => ({
    type: 'bar',
    data: { labels, datasets: datasets.map(d => ({ borderRadius: 6, maxBarThickness: 26, ...d })) },
    options: {
      maintainAspectRatio: false,
      scales: { x: { stacked: !!opts.stacked, grid: { display: false } }, y: { stacked: !!opts.stacked, beginAtZero: true, ticks: { maxTicksLimit: 5, callback: v => (opts.fmt || (x => x))(v) } } },
      plugins: { legend: { display: !!opts.legend, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } }, tooltip: { displayColors: !!opts.legend, callbacks: { label: it => (opts.legend ? it.dataset.label + ': ' : '') + (opts.fmt || (x => x))(it.parsed.y) } } },
    },
  }), opts.h || 180);
}
function doughnut2(labels, values, colors, opts = {}) {
  return chartBox(() => ({
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: cssVar('--card'), borderWidth: 3, hoverOffset: 6 }] },
    options: { maintainAspectRatio: false, cutout: '64%', plugins: { legend: { display: true, position: 'right', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 10 } }, tooltip: { callbacks: { label: it => `${it.label}: ${(opts.fmt || (x => x))(it.parsed)}` } } } },
  }), opts.h || 190);
}
// Ring progress (calories, macros, goals) drawn with SVG so it needs no library
function ring(value, target, color, label, sub, size = 92) {
  const r = 38, c = 2 * Math.PI * r, p = target ? Math.min(1, value / target) : 0, over = target && value > target;
  return `<div class="ring" style="width:${size}px"><svg viewBox="0 0 100 100" width="${size}" height="${size}"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--track)" stroke-width="10"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${over ? '#ff6b6b' : color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)" class="ring-arc"/></svg>
    <div class="ring-in"><b>${label}</b><small>${sub}</small></div></div>`;
}
const bar = (value, target, color) => `<div class="mbar"><i style="width:${Math.min(100, target ? value / target * 100 : 0)}%;background:${target && value > target * 1.1 ? '#ff6b6b' : color}"></i></div>`;
