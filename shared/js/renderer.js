/*
  Rendering Logic for Team Cards and UI Elements
*/
import { TEAM_COLORS, PAGE_MAP, CRED_MAP } from './config.js';
import { AppState } from './state.js';
import { sanitizeHTML, escapeAttr } from './utils.js';

export function nextColor() {
  return TEAM_COLORS[AppState.colorIdx++ % TEAM_COLORS.length];
}

export function buildCard(t) {
  const color = sanitizeHTML(t.color) || nextColor();
  const id = t.id || 'card_' + Date.now();
  const card = document.createElement('div');
  card.className = 'team-card';
  card.style.setProperty('--tc', escapeAttr(color));
  
  card.innerHTML = `
    <div class="card-drag-handle" title="Drag card">⠿⠿</div>
    <div class="color-dot" style="background:${escapeAttr(color)}" title="Change color"></div>
    <div class="team-card-inner">
      <div class="card-accent-bar" style="background:linear-gradient(90deg,${escapeAttr(color)},transparent)"></div>
      <div class="card-head">
        <div class="card-tag" contenteditable="true" style="color:${escapeAttr(color)}">${sanitizeHTML(t.tag) || 'TEAM TAG'}</div>
        <div class="card-title" contenteditable="true" style="color:${escapeAttr(color)}">${sanitizeHTML(t.title) || 'Team Name'}</div>
        <div class="card-desc" contenteditable="true">${sanitizeHTML(t.desc) || 'Click to edit...'}</div>
      </div>
      <div class="card-body">
        <div class="card-members">
          ${(t.members || []).map((m, i) => `
            <div class="mem-row">
              <div class="mem-num" style="color:${color}">${i + 1}</div>
              <div style="flex:1">
                <div class="mem-name" contenteditable="true">${sanitizeHTML(m.name)}</div>
                <div class="mem-bind" contenteditable="true">${sanitizeHTML(m.bind)}</div>
              </div>
            </div>`).join('')}
        </div>
        <div class="card-img-right" id="panel-${id}" onclick="openModal('${id}')">
          <img src="" alt="Team composition screenshot">
          <div class="img-right-overlay"><div class="ov-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><div>No image</div></div>
        </div>
      </div>
      <div class="card-foot">
        <div class="foot-content"></div>
        <div class="card-footer-credits">
          <span class="foot-cred-item">DESIGN BY <span class="foot-cred-name">AnotherUseru</span></span>
          <span class="foot-cred-contributor"></span>
        </div>
        <div style="text-align:center;margin-top:10px;border-top:1px solid rgba(255,255,255,.05);padding-top:10px">
          <button class="edit-btn" onclick="addModBox(this)">➕ Require Box</button>
          <button class="edit-btn" onclick="addTipsBox(this)">➕ Tips Box</button>
          <button class="edit-btn" onclick="addWarnBox(this)">➕ Danger Box</button>
          <button class="edit-btn" onclick="openH1Modal(this)">➕ Heading</button>
          <button class="edit-btn" onclick="addMember(this)">➕ Unit</button>
        </div>
      </div>
    </div>
    <button class="delete-team-btn" onclick="this.closest('.team-card').remove()">🗑 Delete</button>
    <button class="download-node-btn" onclick="openDlModal(this)">Screenshot</button>`;

  // Card logic like dot listener and drag enablement will be wired in rewireAll
  return card;
}

export function refreshAllCardCredits() {
  const modes = ['dungeon', 'story', 'raid', 'storyTowers', 'battleTowers', 'celestialTower', 'worldBoss'];
  modes.forEach(mode => {
    const section = document.getElementById(PAGE_MAP[mode]);
    if (!section) return;
    const credBox = section.querySelector('.cred-display');
    if (!credBox) return;

    const pills = [];
    credBox.querySelectorAll('.cred-pill').forEach(pill => {
      const lbl = pill.querySelector('.cred-lbl')?.textContent.toUpperCase() || '';
      const nameEl = pill.querySelector('.cred-name');
      const name = nameEl?.textContent || '';
      const color = nameEl?.style.color || '#f5c842';
      if (name && !name.toLowerCase().includes('anotheruseru')) {
        pills.push({ lbl, name, color });
      }
    });

    section.querySelectorAll('.team-card').forEach(card => {
      const tagText = card.querySelector('.card-tag')?.textContent || '';
      const titleText = card.querySelector('.card-title')?.textContent || '';
      const combined = (tagText + ' ' + titleText).toUpperCase();
      const nums = combined.match(/\d+/g) || [];
      let contributor = null;

      for (const n of nums) {
        const cardNum = parseInt(n);
        const match = pills.find(p => {
          if (p.lbl.match(new RegExp('\\b' + n + '\\b'))) return true;
          const rangeMatches = p.lbl.match(/(\d+)\s*-\s*(\d+)/g);
          if (rangeMatches) {
            for (const rangeStr of rangeMatches) {
              const [start, end] = rangeStr.split('-').map(v => parseInt(v.trim()));
              if (cardNum >= start && cardNum <= end) return true;
            }
          }
          return false;
        });
        if (match) { contributor = match; break; }
      }

      const contributorTarget = card.querySelector('.foot-cred-contributor');
      if (contributorTarget) {
        if (contributor) {
          contributorTarget.innerHTML = `<span class="foot-cred-sep">|</span> <span class="foot-cred-item">UNIT BY <span class="foot-cred-name" style="color:${escapeAttr(contributor.color)}">${escapeAttr(contributor.name)}</span></span>`;
        } else {
          contributorTarget.innerHTML = '';
        }
      }
    });
  });
}
