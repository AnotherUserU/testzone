/*
  Master Admin Logic - Entry Point for the Refactored Admin Dashboard
*/

// Note: In a real module system, we would use 'import' here.
// Since we are using standard script tags for now, we attach to window.

import { ALL_MODES, PAGE_MAP, PV_MAP, TEAM_COLORS, H1_COLORS, SECURITY } from './config.js';
import { AppState } from './state.js';
import { showToast, showFbStatus, sanitizeHTML, escapeAttr, rgbToHex, selectAll } from './utils.js';
import { buildCard, refreshAllCardCredits, nextColor } from './renderer.js';
import { wireBlockDrag, enableCardDrag, wireGridDrop, enableMemDrag, renumMembers } from './drag.js';
import { saveToFirebase, loadFromFirebase } from './firebase.js';

// --- UI Navigation ---
window.switchMode = function(mode) {
  if (!ALL_MODES.includes(mode)) return;
  AppState.currentMode = mode;
  document.querySelectorAll('.mode-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById(PAGE_MAP[mode]);
  if (sec) sec.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-mode="${mode}"]`);
  if (btn) btn.classList.add('active');
};

// --- Theme Logic ---
window.toggleTheme = function() {
  AppState.isDarkTheme = !AppState.isDarkTheme;
  const root = document.documentElement, btn = document.getElementById('themeToggle');
  if (AppState.isDarkTheme) { 
    root.classList.remove('light-theme'); 
    if (btn) btn.textContent = '🌙 Dark'; 
  } else { 
    root.classList.add('light-theme'); 
    if (btn) btn.textContent = '☀️ Light'; 
  }
  localStorage.setItem('theme', AppState.isDarkTheme ? 'dark' : 'light');
};

// --- Modal Logic ---
window.openModal = function(id) {
  if (document.body.classList.contains('readonly')) return;
  AppState.activeImgId = id;
  document.getElementById('modalInput').value = '';
  document.getElementById('modal').classList.add('open');
  setTimeout(() => document.getElementById('modalInput').focus(), 60);
};

window.closeModal = function() { 
  document.getElementById('modal').classList.remove('open'); 
  AppState.activeImgId = null; 
};

window.applyImg = function() {
  if (!AppState.activeImgId) return closeModal();
  const url = document.getElementById('modalInput').value.trim();
  if (!url) { alert('Enter image link!'); return; }
  const panel = document.getElementById('panel-' + AppState.activeImgId);
  if (panel) {
    let img = panel.querySelector('img');
    if (!img) { img = document.createElement('img'); panel.appendChild(img); }
    img.src = url; img.onerror = () => alert('Image failed to load.');
    panel.classList.add('loaded');
  }
  closeModal();
};

// --- Heading Logic ---
window.buildH1Grid = function() {
  const g = document.getElementById('h1ColorGrid'); 
  if (!g) return;
  g.innerHTML = '';
  H1_COLORS.forEach(c => {
    const s = document.createElement('div'); 
    s.className = 'h1-swatch' + (c === AppState.h1Color ? ' sel' : '');
    s.style.background = c;
    s.onclick = () => { 
      AppState.h1Color = c; 
      document.getElementById('h1Custom').value = c; 
      g.querySelectorAll('.h1-swatch').forEach(x => x.classList.remove('sel')); 
      s.classList.add('sel'); 
    };
    g.appendChild(s);
  });
};

window.openH1Modal = function(btn) {
  AppState.activeH1Btn = btn; AppState.h1Color = '#f5c842';
  document.getElementById('h1Text').value = ''; buildH1Grid();
  document.getElementById('h1Modal').classList.add('open');
  setTimeout(() => document.getElementById('h1Text').focus(), 60);
};

window.closeH1Modal = function() { 
  document.getElementById('h1Modal').classList.remove('open'); 
  AppState.activeH1Btn = null; 
};

window.applyH1 = function() {
  const text = sanitizeHTML(document.getElementById('h1Text').value.trim() || 'Heading'); 
  const c = AppState.h1Color;
  const block = document.createElement('div'); 
  block.className = 'h1-block';
  block.innerHTML = `<h1 contenteditable="true" style="color:${c};text-shadow:0 0 14px ${c}66">${text}</h1><span class="delete-box" onclick="this.closest('.h1-block').remove()">✕</span>`;
  if (AppState.activeH1Btn) {
    const foot = AppState.activeH1Btn.closest('.card-foot');
    if (foot) foot.querySelector('.foot-content').appendChild(block);
  }
  closeH1Modal();
};

// --- Card Interactions ---
window.makeColorPalette = function(card, initColor) {
  const pal = document.createElement('div'); pal.className = 'clr-palette';
  TEAM_COLORS.forEach(c => {
    const s = document.createElement('div'); s.className = 'cp-sw'; s.style.background = c; s.title = c;
    s.onclick = e => { e.stopPropagation(); setCardColor(card, c); pal.classList.remove('open'); };
    pal.appendChild(s);
  });
  const ci = document.createElement('input'); ci.type = 'color'; ci.value = initColor || '#f5c842';
  ci.style.cssText = 'width:22px;height:22px;border:none;border-radius:50%;cursor:pointer;padding:0;background:none;';
  ci.title = 'Custom'; ci.addEventListener('input', e => { setCardColor(card, e.target.value); pal.classList.remove('open'); });
  pal.appendChild(ci); return pal;
};

window.setCardColor = function(card, color) {
  card.style.setProperty('--tc', color);
  const dot = card.querySelector('.color-dot'); if (dot) dot.style.background = color;
  card.querySelectorAll('.card-tag,.card-title,.mem-num').forEach(el => el.style.color = color);
  const accent = card.querySelector('.card-accent-bar');
  if (accent) accent.style.background = `linear-gradient(90deg,${color},transparent)`;
};

// --- App Lifecycle ---
window.rewireAll = function() {
  document.querySelectorAll('.page-block').forEach(wireBlockDrag);
  document.querySelectorAll('.core-grid,.new-grid').forEach(wireGridDrop);
  
  const isEditable = !document.body.classList.contains('readonly');
  const editables = [
    '.card-tag', '.card-title', '.card-desc', 
    '.mem-name', '.mem-bind', 
    '.mod-title', '.tips-title', '.mod-item', '.tips-item', '.warn-box',
    '.team-section-label', '.section-label', '.main-title', '.alert-box', '.h1-block h1', 
    '.banner-announce', '.banner-title', '.banner-alert', '.mp-pill'
  ];
  
  document.querySelectorAll(editables.join(',')).forEach(el => {
    el.contentEditable = isEditable;
    if (isEditable) { if (el.tagName === 'DIV') el.style.cursor = 'text'; }
    else { if (el.tagName === 'DIV') el.style.cursor = ''; }
  });

  document.querySelectorAll('.team-card').forEach(card => {
    enableCardDrag(card);
    card.querySelectorAll('.mem-row').forEach(row => {
      enableMemDrag(row);
      if (!row.querySelector('.delete-mem')) {
        const del = document.createElement('span'); del.className = 'delete-mem'; del.innerHTML = '✕';
        del.onclick = () => { row.remove(); renumMembers(row.closest('.card-members')); }; row.appendChild(del);
      }
    });
    const dot = card.querySelector('.color-dot');
    if (dot && !dot._palWired) {
      dot._palWired = true;
      card.querySelectorAll('.clr-palette').forEach(p => p.remove());
      const color = getComputedStyle(card).getPropertyValue('--tc').trim() || '#f5c842';
      const pal = makeColorPalette(card, color);
      card.appendChild(pal);
      dot.addEventListener('click', e => { e.stopPropagation(); pal.classList.toggle('open'); });
      document.addEventListener('click', () => pal.classList.remove('open'), true);
    }
  });
  // wirePillDelete logic will be added here
};

window.enterAsGuest = function() {
  AppState.currentRole = 'guest';
  document.getElementById('appContent').style.display = 'block';
  document.body.classList.add('readonly');
  document.body.classList.remove('is-admin');
  ['logoutBtn', 'saveCloudBtn', 'pvSettingsBtn', 'saveLocalBtn', 'loadLocalBtn', 'deleteLocalBtn', 'roleBadge'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  const floatXl = document.querySelector('.float-xl'); if (floatXl) floatXl.style.display = 'none';
  loadFromFirebase();
};

window.enterAsAdmin = function() {
  AppState.currentRole = 'admin';
  document.getElementById('appContent').style.display = 'block';
  document.body.classList.remove('readonly');
  document.body.classList.add('is-admin');
  ['logoutBtn', 'saveCloudBtn', 'pvSettingsBtn', 'saveLocalBtn', 'loadLocalBtn', 'deleteLocalBtn'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = '';
  });
  const floatXl = document.querySelector('.float-xl'); if (floatXl) floatXl.style.display = 'block';
  const badge = document.getElementById('roleBadge');
  if (badge) {
    badge.textContent = '👑 ADMIN'; badge.className = 'admin-badge'; badge.style.display = '';
  }
  showToast('👑 Admin mode activated!');
  loadFromFirebase({
    onVisibilityLoaded: () => window.applyPageVisibility()
  });
};

window.initApp = function() {
  if (sessionStorage.getItem('access_granted') === 'true' && localStorage.getItem('adminToken')) { 
    enterAsAdmin(); 
  } else { 
    enterAsGuest(); 
    if (window.openAdminShortcut) openAdminShortcut(); 
  }
  if (localStorage.getItem('theme') === 'light') { 
    AppState.isDarkTheme = false; 
    toggleTheme(); 
  }
};

// Global exports for inline HTML onclicks
window.addMember = function(btn) {
  const container = btn.closest('.team-card').querySelector('.card-members');
  const color = getComputedStyle(btn.closest('.team-card')).getPropertyValue('--tc').trim() || '#f5c842';
  const num = container.querySelectorAll('.mem-row').length + 1;
  const row = document.createElement('div'); row.className = 'mem-row';
  row.innerHTML = `<div class="mem-num" style="color:${color}">${num}</div><div style="flex:1"><div class="mem-name" contenteditable="true">New Unit Name</div><div class="mem-bind" contenteditable="true">· Binding Vow</div></div>`;
  const del = document.createElement('span'); del.className = 'delete-mem'; del.innerHTML = '✕';
  del.onclick = () => { row.remove(); renumMembers(container); };
  row.appendChild(del); enableMemDrag(row); container.appendChild(row);
};

window.saveToFirebase = saveToFirebase;
window.loadFromFirebase = loadFromFirebase;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => window.initApp());

// --- Visibility Modal ---
window.openPvModal = function() {
  ALL_MODES.forEach(m => {
    const el = document.getElementById(PV_MAP[m]);
    const btn = document.querySelector('.nav-btn[data-mode="' + m + '"]');
    if (el && btn) el.checked = btn.style.display !== 'none';
  });
  document.getElementById('pvModal').classList.add('open');
};
window.closePvModal = function() { document.getElementById('pvModal').classList.remove('open'); };

window.applyPageVisibility = function(saveToCloud) {
  const vis = {};
  ALL_MODES.forEach(m => {
    const el = document.getElementById(PV_MAP[m]);
    vis[m] = el ? el.checked : true;
    const btn = document.querySelector('.nav-btn[data-mode="' + m + '"]');
    if (btn) btn.style.display = vis[m] ? '' : 'none';
  });
  const activeSection = document.querySelector('.mode-section.active');
  const activeMode = Object.keys(PAGE_MAP).find(m => document.getElementById(PAGE_MAP[m]) === activeSection) || 'dungeon';
  if (!vis[activeMode]) {
    const firstVisible = ALL_MODES.find(m => vis[m]);
    if (firstVisible) switchMode(firstVisible);
  }
  if (AppState.currentRole === 'admin' && saveToCloud) { saveToFirebase(); }
};
