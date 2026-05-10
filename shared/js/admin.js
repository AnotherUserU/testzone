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

window.openAdminShortcut = function() {
  const overlay = document.getElementById('adminShortcutOverlay');
  if (overlay) {
    overlay.classList.add('open');
    const input = document.getElementById('ascPwInput');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }
  }
};

window.closeAdminShortcut = function() {
  const overlay = document.getElementById('adminShortcutOverlay');
  if (overlay) overlay.classList.remove('open');
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

window.addModBox = function(btn) {
  const container = btn.closest('.card-foot').querySelector('.foot-content');
  const div = document.createElement('div'); div.className = 'mod-box';
  div.innerHTML = `<div class="mod-title" contenteditable="true" style="cursor: text;">🔶 REQUIRED</div><div class="mod-item" contenteditable="true">Click to edit...</div><button class="add-point-btn" onclick="addBoxItem(this, 'mod-item')">+ Add Point</button><span class="delete-box" onclick="this.closest('.mod-box').remove()">✕</span>`;
  container.appendChild(div);
};

window.addTipsBox = function(btn) {
  const container = btn.closest('.card-foot').querySelector('.foot-content');
  const div = document.createElement('div'); div.className = 'tips-box';
  div.innerHTML = `<div class="tips-title" contenteditable="true" style="cursor: text;">💡 TIPS</div><div class="tips-item" contenteditable="true">Click to edit...</div><button class="add-point-btn" onclick="addBoxItem(this, 'tips-item')">+ Add Point</button><span class="delete-box" onclick="this.closest('.tips-box').remove()">✕</span>`;
  container.appendChild(div);
};

window.addBoxItem = function(btn, className) {
  const div = document.createElement('div');
  div.className = className;
  div.contentEditable = "true";
  div.innerText = "Click to edit...";
  btn.before(div);
};

window.addWarnBox = function(btn) {
  const container = btn.closest('.card-foot').querySelector('.foot-content');
  const div = document.createElement('div'); div.className = 'warn-box';
  div.innerHTML = `<span contenteditable="true" style="cursor: text;">⚠️ DANGER: High level required.</span><span class="delete-box" onclick="this.closest('.warn-box').remove()">✕</span>`;
  container.appendChild(div);
};

window.addBannerBlock = function(btn, type, sectionKey) {
  const section = btn.closest('.mode-section');
  const titleBlock = section?.querySelector('[data-block="title"], [data-block$="-title"]');

  
  const block = document.createElement('div');
  block.className = 'page-block';
  block.dataset.block = 'banner';
  block.innerHTML = `<span class="block-handle">⠿⠿</span>`;
  
  const banner = document.createElement('div');
  banner.contentEditable = "true";
  if (type === 'announce') {
    banner.className = 'banner-announce';
    banner.innerHTML = '📢 ANNOUNCEMENT: New units added!';
  } else if (type === 'title') {
    banner.className = 'banner-title';
    banner.innerHTML = '🏷️ NEW UNITS RELEASED';
  } else if (type === 'alert') {
    banner.className = 'banner-alert';
    banner.innerHTML = '🚨 URGENT: Meta shift detected!';
  }
  
  const del = document.createElement('span');
  del.className = 'delete-box';
  del.innerHTML = '✕';
  del.onclick = () => block.remove();
  
  block.appendChild(banner);
  block.appendChild(del);
  
  if (titleBlock) {
    titleBlock.after(block);
  } else {
    const container = document.getElementById(sectionKey + 'Groups');
    if (container) container.appendChild(block);
  }
  wireBlockDrag(block);
};



window.addGenericCoreTeam = function(gridId, modeName) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  const newTeam = {
    id: 't' + Date.now(),
    color: '#f5c842',
    tag: (modeName || 'DUNGEON').toUpperCase() + ' · CORE',
    title: 'New Core Team',
    desc: 'Enter team description here...',
    members: [
      { name: 'Unit 1', bind: 'Binding Vow' },
      { name: 'Unit 2', bind: 'Binding Vow' },
      { name: 'Unit 3', bind: 'Binding Vow' },
      { name: 'Unit 4', bind: 'Binding Vow' }
    ]
  };
  const card = buildCard(newTeam);
  grid.appendChild(card);
  rewireAll();
};


window.addGenericNewTeam = function(gridId, modeName) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  const newTeam = {
    id: 't' + Date.now(),
    color: '#ff8c42',
    tag: (modeName || 'DUNGEON').toUpperCase() + ' · NEW',
    title: 'New Variant Team',
    desc: 'Enter team description here...',
    members: [
      { name: 'Unit 1', bind: 'Binding Vow' },
      { name: 'Unit 2', bind: 'Binding Vow' },
      { name: 'Unit 3', bind: 'Binding Vow' },
      { name: 'Unit 4', bind: 'Binding Vow' }
    ]
  };
  const card = buildCard(newTeam);
  grid.appendChild(card);
  rewireAll();
};


window.addNewCoreTeam = () => addGenericCoreTeam('coreGrid', 'DUNGEON');
window.addNewTeam = () => addGenericNewTeam('newGrid', 'DUNGEON');
window.addNewStoryCoreTeam = () => addGenericCoreTeam('storyCoreGrid', 'STORY');
window.addNewStoryTeam = () => addGenericNewTeam('storyNewGrid', 'STORY');

window.addTeamSection = function(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const sectionId = 'sec' + Date.now();
  const div = document.createElement('div');
  div.className = 'page-block team-section';
  div.id = sectionId;
  div.innerHTML = `
    <span class="block-handle">⠿⠿</span>
    <button class="del-section-btn" onclick="this.closest('.team-section').remove()">Delete Section</button>
    <div class="team-section-label" contenteditable="true">NEW TEAM SECTION</div>
    <div class="grid-wrap"><div class="core-grid" id="${sectionId}Grid"></div></div>
    <div class="team-section-actions">
      <button class="edit-btn" onclick="addGenericCoreTeam('${sectionId}Grid','CUSTOM')">➕ Add Unit</button>
    </div>
  `;
  container.appendChild(div);
  wireBlockDrag(div);
};

window.addMember = function(btn) {
  const card = btn.closest('.team-card');
  const membersBox = card?.querySelector('.card-members');
  if (!membersBox) return;
  
  const i = membersBox.querySelectorAll('.mem-row').length;
  const row = document.createElement('div');
  row.className = 'mem-row';
  row.innerHTML = `
    <div class="mem-num">${i + 1}</div>
    <div style="flex:1">
      <div class="mem-name" contenteditable="true">New Unit</div>
      <div class="mem-bind" contenteditable="true">Binding Vow</div>
    </div>
  `;
  membersBox.appendChild(row);
  enableMemDrag(row);
  const del = document.createElement('span'); del.className = 'delete-mem'; del.innerHTML = '✕';
  del.onclick = () => { row.remove(); renumMembers(membersBox); }; 
  row.appendChild(del);
  rewireAll();
};

window.openLabelColorPicker = function(el, e) {
  e.preventDefault();
  const input = document.createElement('input');
  input.type = 'color';
  input.value = rgbToHex(el.style.color);
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.oninput = () => el.style.color = input.value;
  input.onchange = () => { input.remove(); };
  input.click();
};

window.openModModal = function(btn) {
  let chain;
  if (btn && btn.closest) {
    chain = btn.closest('.mod-priority')?.querySelector('.mp-chain');
  } 
  
  if (!chain) {
    const activeSection = document.querySelector('.mode-section.active');
    chain = activeSection?.querySelector('.mp-chain');
  }
  
  if (!chain) {
    console.error("Could not find mp-chain for modifiers");
    showToast("❌ Could not find modifier chain", true);
    return;
  }
  AppState.activeModChain = chain;
  
  const list = document.getElementById('modList');
  if (!list) return;
  list.innerHTML = '';
  
  // Find all pills (support both span and div, and different delete button classes)
  const pills = chain.querySelectorAll('.mp-pill');
  if (pills.length === 0) {
    list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--dim); font-size:0.9rem">No modifiers yet.</div>';
  }

  pills.forEach(pill => {
    const row = document.createElement('div');
    row.className = 'mod-modal-row';
    row.style.cssText = 'display:flex; align-items:center; gap:10px; background:var(--bg3); padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,.05); margin-bottom: 8px;';
    
    const txt = document.createElement('div');
    txt.style.flex = '1';
    txt.style.fontSize = '0.9rem';
    // Clean text by removing any nested delete spans/buttons
    let cleanText = pill.textContent.trim();
    const delBtn = pill.querySelector('.delete-pill, .delete-box');
    if (delBtn) {
      cleanText = pill.innerText.replace(delBtn.innerText, '').trim();
    }
    txt.textContent = cleanText;
    
    const del = document.createElement('button');
    del.className = 'delete-box';
    del.style.position = 'static';
    del.innerHTML = '✕';
    del.onclick = () => {
      // Logic to remove pill and surrounding arrows
      const next = pill.nextElementSibling;
      if (next && next.classList.contains('mp-arrow')) next.remove();
      else {
        const prev = pill.previousElementSibling;
        if (prev && prev.classList.contains('mp-arrow')) prev.remove();
      }
      pill.remove();
      row.remove();
      if (list.children.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--dim); font-size:0.9rem">No modifiers yet.</div>';
      }
    };
    
    row.appendChild(txt);
    row.appendChild(del);
    list.appendChild(row);
  });
  
  // Build color palette for modifiers
  const palette = document.getElementById('modColorPalette');
  if (palette) {
    palette.innerHTML = '';
    const colors = {
      gray: '#6b6f8f',
      white: '#ffffff',
      gold: '#f5c842',
      cyan: '#00d4ff',
      green: '#00e87a',
      red: '#ff3355',
      purple: '#c36bff',
      orange: '#ff8c42'
    };
    
    Object.entries(colors).forEach(([name, hex]) => {
      const dot = document.createElement('div');
      dot.style.cssText = `width:24px; height:24px; border-radius:50%; background:${hex}; cursor:pointer; border:2px solid transparent; transition:0.2s`;
      dot.title = name;
      
      const current = document.getElementById('modSelectedColor').value;
      if (current === name) dot.style.borderColor = '#fff';
      
      dot.onclick = () => {
        document.getElementById('modSelectedColor').value = name;
        palette.querySelectorAll('div').forEach(d => d.style.borderColor = 'transparent');
        dot.style.borderColor = '#fff';
      };
      palette.appendChild(dot);
    });
  }
  
  document.getElementById('modModal').classList.add('open');
};

window.closeModModal = function() {
  document.getElementById('modModal').classList.remove('open');
  AppState.activeModChain = null;
};

window.addModFromModal = function() {
  const input = document.getElementById('modNewInput');
  const text = input.value.trim();
  if (!text || !AppState.activeModChain) return;
  
  if (AppState.activeModChain.querySelectorAll('.mp-pill').length > 0) {
    const arrow = document.createElement('span');
    arrow.className = 'mp-arrow';
    arrow.textContent = ' › ';
    AppState.activeModChain.appendChild(arrow);
  }

  const colorClass = document.getElementById('modSelectedColor').value || 'gray';
  const pill = document.createElement('div');
  pill.className = `mp-pill ${colorClass}`;
  pill.contentEditable = "true";
  pill.textContent = text;
  
  const del = document.createElement('span');
  del.className = 'delete-box';
  del.innerHTML = '✕';
  del.onclick = (e) => { 
    e.stopPropagation(); 
    const next = pill.nextElementSibling;
    if (next && next.classList.contains('mp-arrow')) next.remove();
    else {
      const prev = pill.previousElementSibling;
      if (prev && prev.classList.contains('mp-arrow')) prev.remove();
    }
    pill.remove(); 
  };
  
  pill.appendChild(del);
  AppState.activeModChain.appendChild(pill);
  
  input.value = '';
  openModModal(); 
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
    if (isEditable) { 
      if (el.tagName === 'DIV') el.style.cursor = 'text'; 
    } else { 
      if (el.tagName === 'DIV') el.style.cursor = ''; 
    }

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
  loadFromFirebase({
    onSuccess: () => window.rewireAll()
  });
};

window.logoutToGuest = function() {
  sessionStorage.removeItem('adminKey');
  // Clear any legacy JWT tokens if they still exist in local storage
  localStorage.removeItem('adminToken');
  location.reload();
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
    onVisibilityLoaded: () => window.applyPageVisibility(),
    onSuccess: () => window.rewireAll()
  });
};

window.initApp = function() {
  if (sessionStorage.getItem('adminKey')) { 
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
};

// --- Credits Modal Logic ---
window.openCredModal = function(btn) {
  const modal = document.getElementById('credModal');
  const list = document.getElementById('cf-sections-list');
  if (!modal || !list) return;
  
  list.innerHTML = '';
  // If button passed, target its specific display box
  const credBox = btn ? btn.closest('.credits-box') : document.querySelector('.mode-section.active .credits-box');
  const credDisplay = credBox?.querySelector('.cred-display');
  AppState.activeCredDisplay = credDisplay;
  
  if (credDisplay) {
    credDisplay.querySelectorAll('.cred-pill').forEach(pill => {
      const lbl = pill.querySelector('.cred-lbl')?.textContent || '';
      const nameEl = pill.querySelector('.cred-name');
      const name = nameEl?.textContent || '';
      const color = nameEl?.style.color || '#f5c842';
      if (name.toLowerCase().includes('anotheruseru') || name.toLowerCase().includes('another729')) return; 
      addCredRow(lbl, name, color);
    });
  }
  modal.classList.add('open');
};

function addCredRow(lbl, name, color) {
  const list = document.getElementById('cf-sections-list');
  const div = document.createElement('div');
  div.className = 'cred-modal-row';
  div.innerHTML = `
    <input type="text" class="cred-input-lbl" value="${lbl}" placeholder="Label (e.g. TEAM 1 CREATOR)">
    <input type="text" class="cred-input-name" value="${name}" placeholder="Name">
    <input type="color" class="cred-input-clr" value="${rgbToHex(color)}">
    <span class="cred-row-del" onclick="this.parentElement.remove()">✕</span>
  `;
  list.appendChild(div);
}

window.credAddSection = () => addCredRow('', '', '#c36bff');

window.applyCredits = function() {
  const credDisplay = AppState.activeCredDisplay || document.querySelector('.mode-section.active .cred-display');
  if (!credDisplay) return;
  
  const pillsRow = credDisplay.querySelector('.cred-pills-row') || credDisplay;
  
  let html = `<div class="cred-pill"><div><div class="cred-lbl">DESIGN BY</div><div class="cred-name" style="color:var(--gold);text-shadow:0 0 12px rgba(245,200,66,.35);margin-bottom:0">another729</div></div></div>`;
  
  document.querySelectorAll('.cred-modal-row').forEach(row => {
    const lbl = row.querySelector('.cred-input-lbl').value.toUpperCase();
    const name = row.querySelector('.cred-input-name').value;
    const color = row.querySelector('.cred-input-clr').value;
    if (!name) return;
    html += `<div class="cred-pill"><div><div class="cred-lbl">${lbl}</div><div class="cred-name" style="color:${color};text-shadow:0 0 12px ${color}55;margin-bottom:0">${name}</div></div></div>`;
  });
  
  pillsRow.innerHTML = html;
  closeCredModal();
  refreshAllCardCredits();
};

window.closeCredModal = () => document.getElementById('credModal').classList.remove('open');


// --- Screenshot Logic ---
window.openDlModal = function(btn) {
  // Ensure credits are up to date before taking screenshot
  if (typeof refreshAllCardCredits === 'function') refreshAllCardCredits();
  
  const sel = document.getElementById('dlNodeSelect'); 
  if (sel) {
    sel.innerHTML = '<option value="">-- Select card --</option>';
    document.querySelectorAll('.team-card').forEach((card, i) => {
      const title = card.querySelector('.card-title')?.textContent.trim() || ('Card ' + (i + 1));
      const opt = document.createElement('option'); opt.value = i; opt.textContent = title; sel.appendChild(opt);
    });
  }
  if (btn) {
    setDlMode('node');
    const cards = [...document.querySelectorAll('.team-card')];
    const idx = cards.indexOf(btn.closest('.team-card')); 
    if (idx >= 0 && sel) sel.value = idx;
  } else { setDlMode('fullscreen'); }
  setDlFmt('png'); 
  const modal = document.getElementById('dlModal');
  if (modal) modal.classList.add('open');
};

window.closeDlModal = function() { 
  const modal = document.getElementById('dlModal');
  if (modal) modal.classList.remove('open'); 
};

window.setDlMode = function(m) {
  AppState.dlMode = m;
  const fullBtn = document.getElementById('dlModeFullscreen');
  const nodeBtn = document.getElementById('dlModeNode');
  const picker = document.getElementById('dlNodePicker');
  if (fullBtn) fullBtn.classList.toggle('active', m === 'fullscreen');
  if (nodeBtn) nodeBtn.classList.toggle('active', m === 'node');
  if (picker) picker.style.display = m === 'node' ? 'block' : 'none';
};

window.setDlFmt = function(f) {
  AppState.dlFmt = f;
  const pngBtn = document.getElementById('dlFmtPng');
  const jpgBtn = document.getElementById('dlFmtJpg');
  const quality = document.getElementById('dlQualityWrap');
  if (pngBtn) pngBtn.classList.toggle('active', f === 'png');
  if (jpgBtn) jpgBtn.classList.toggle('active', f === 'jpg');
  if (quality) quality.style.display = f === 'jpg' ? 'block' : 'none';
};

window.doDlDownload = function() {
  if (typeof html2canvas === 'undefined') {
    showFbStatus('⏳ Loading capture tools...', 'loading');
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => executeDownload();
    document.head.appendChild(script);
  } else {
    executeDownload();
  }
};

window.executeDownload = function() {
  const dlBtn = document.getElementById('dlDownloadBtn');
  if (dlBtn) { dlBtn.disabled = true; dlBtn.style.opacity = '0.5'; }
  const quality = parseInt(document.getElementById('dlQualitySlider')?.value || '90') / 100;
  const isLight = document.documentElement.classList.contains('light-theme');
  const HIDE_SEL = '.edit-btn,.delete-mem,.delete-team-btn,.delete-box,.add-point-btn,.card-drag-handle,.color-dot,.clr-palette,.block-handle,.cred-edit-btn,.float-xl,.add-banner-btn,.add-banner-bar,.save-bar,#downloadBtn,#dlBtnWrapper,[data-block="save-local"],[data-block="download"],#themeToggle,.del-section-btn,.team-section-actions,.add-section-btn,.download-node-btn,.nav-header,.admin-link,#roleBadge,#fbStatus,#scrollProgress';
  
  function reEnableBtn() { if (dlBtn) { dlBtn.disabled = false; dlBtn.style.opacity = ''; } }

  if (AppState.dlMode === 'fullscreen') {
    closeDlModal();
    setTimeout(() => {
      showFbStatus('Capturing...', 'loading');
      const pageBodyElement = document.getElementById('pageBody');
      const origMaxWidth = pageBodyElement.style.maxWidth;
      const origMargin = pageBodyElement.style.margin;

      // Force layout constraint so html2canvas captures exact content width, eliminating horizontal gaps
      pageBodyElement.style.maxWidth = '1440px';
      pageBodyElement.style.margin = '0 auto';

      html2canvas(pageBodyElement, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: isLight ? '#ffffff' : '#0f0f17', 
        logging: false,
        onclone: (clonedDoc) => {
          // Note: Since we target #pageBody, .nav-header is already excluded as it's a sibling
          
          // Also remove other UI chrome elements that may leave gaps
          clonedDoc.querySelectorAll(HIDE_SEL).forEach(el => el.remove());

          const pageBody = clonedDoc.getElementById('pageBody');
          if (pageBody) {
            // Keep the natural 20px horizontal padding from base.css, just reset background
            pageBody.style.setProperty('background-color', isLight ? '#ffffff' : '#0f0f17', 'important');
          }

          // Remove left/right padding from wrappers to prevent horizontal gaps in screenshot
          clonedDoc.querySelectorAll('.grid-wrap, .alert-wrap').forEach(el => {
            el.style.setProperty('padding-left', '0', 'important');
            el.style.setProperty('padding-right', '0', 'important');
          });

          // Tighten the main title padding so content sits near the top
          const mainTitle = clonedDoc.querySelector('.mode-section.active .main-title');
          if (mainTitle) {
            mainTitle.style.setProperty('padding-top', '12px', 'important');
            mainTitle.style.setProperty('margin-top', '0', 'important');
          }

          // CRIT-02: Guard against html2canvas CanvasGradient crash. 
          // Gradient rendering fails if addColorStop is called with non-finite values (often due to 0px dimensions).
          // We replace the gradient with a solid color in the clone to guarantee stability.
          clonedDoc.querySelectorAll('.card-accent-bar').forEach(el => {
            const tc = el.style.getPropertyValue('--tc') || '#f5c842';
            el.style.setProperty('background', tc, 'important');
            el.style.setProperty('min-width', '20px', 'important');
            el.style.setProperty('min-height', '3px', 'important');
          });

        }
      }).then(canvas => {
        pageBodyElement.style.maxWidth = origMaxWidth;
        pageBodyElement.style.margin = origMargin;
        const a = document.createElement('a'); 
        a.download = 'Team_Composition_Guide.' + (AppState.dlFmt === 'jpg' ? 'jpg' : 'png');
        a.href = AppState.dlFmt === 'jpg' ? canvas.toDataURL('image/jpeg', quality) : canvas.toDataURL('image/png'); 
        a.click();
        reEnableBtn();
        showFbStatus('✅ Downloaded', 'ok');
      }).catch(err => {
        pageBodyElement.style.maxWidth = origMaxWidth;
        pageBodyElement.style.margin = origMargin;
        console.error(err);
        alert('Failed to download.');
        reEnableBtn();
        showFbStatus('❌ Failed', 'err');
      });
    }, 400);
  } else {
    const cards = [...document.querySelectorAll('.team-card')];
    const idx = parseInt(document.getElementById('dlNodeSelect')?.value || '-1');
    if (isNaN(idx) || !cards[idx]) { alert('Please select a card first!'); reEnableBtn(); return; }
    
    // Tag target element for reliable finding in onclone
    cards.forEach(c => c.removeAttribute('data-capture-target'));
    cards[idx].setAttribute('data-capture-target', 'true');

    closeDlModal();

    
    setTimeout(() => {
      showFbStatus('Capturing...', 'loading');
      // Pass the actual card element. html2canvas will clone it within the document context.
      html2canvas(cards[idx], { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: isLight ? '#ffffff' : '#13131f', 
        logging: false,
        onclone: (clonedDoc) => {
          // CRIT-02: Guard against html2canvas CanvasGradient crash. 
          // Gradient rendering fails if addColorStop is called with non-finite values (often due to 0px dimensions).
          // We replace the gradient with a solid color in the clone to guarantee stability.
          clonedDoc.querySelectorAll('.card-accent-bar').forEach(el => {
            const tc = el.style.getPropertyValue('--tc') || '#f5c842';
            el.style.setProperty('background', tc, 'important');
            el.style.setProperty('min-width', '20px', 'important');
            el.style.setProperty('min-height', '3px', 'important');
          });


          // Find the tagged card inside the clone
          const clonedCard = clonedDoc.querySelector('[data-capture-target="true"]');
          
          if (clonedCard) {

            // Remove unwanted elements inside THIS card for cleaner capture
            const innerHide = clonedCard.querySelectorAll('.download-node-btn,.edit-btn,.delete-mem,.delete-team-btn,.delete-box,.add-point-btn,.card-drag-handle,.color-dot,.clr-palette,.block-handle,.cred-edit-btn');
            innerHide.forEach(el => el.remove());
            
            // Show credits
            const credits = clonedCard.querySelectorAll('.card-footer-credits');
            credits.forEach(el => el.style.setProperty('display', 'flex', 'important'));
            
            // Ensure layout stability and prevent stretching
            clonedCard.style.setProperty('display', 'flex', 'important');
            clonedCard.style.setProperty('flex-direction', 'column', 'important');
            clonedCard.style.setProperty('width', '320px', 'important'); // Standard card width for consistent capture
            clonedCard.style.setProperty('margin', '0', 'important');
          }
        }
      }).then(canvas => {
        const a = document.createElement('a');
        const title = cards[idx].querySelector('.card-title')?.textContent.trim().replace(/\s+/g, '_') || 'Card';
        a.download = title + '.' + (AppState.dlFmt === 'jpg' ? 'jpg' : 'png');
        a.href = AppState.dlFmt === 'jpg' ? canvas.toDataURL('image/jpeg', quality) : canvas.toDataURL('image/png'); 
        a.click();
        reEnableBtn();
        showFbStatus('✅ Downloaded', 'ok');
      }).catch(err => { 
        console.error('Screenshot error:', err); 
        alert('Failed to capture screenshot: ' + (err.message || 'Unknown error')); 
        reEnableBtn();
        showFbStatus('❌ Failed', 'err');
      });
    }, 400);
  }
};

// Event Delegation for card screenshot buttons (Fix for MED-05 sanitization stripping onclick)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.download-node-btn');
  if (btn && typeof window.openDlModal === 'function') {
    e.preventDefault();
    window.openDlModal(btn);
  }
});
