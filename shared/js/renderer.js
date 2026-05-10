/*
  Rendering Logic for Team Cards and UI Elements
*/
import { TEAM_COLORS, PAGE_MAP, CRED_MAP } from './config.js';
import { AppState } from './state.js';
import { sanitizeHTML, escapeAttr } from './utils.js';

export function nextColor() {
  return TEAM_COLORS[AppState.colorIdx++ % TEAM_COLORS.length];
}

import { Components } from './components.js';

export function buildCard(t, isAdmin = true) {
  const color = sanitizeHTML(t.color) || nextColor();
  const id = t.id || 'card_' + Date.now();
  const card = document.createElement('div');
  card.className = 'team-card';
  card.style.setProperty('--tc', escapeAttr(color));
  
  card.innerHTML = `
    ${isAdmin ? '<div class="card-drag-handle" title="Drag card">⠿⠿</div>' : ''}
    ${isAdmin ? `<div class="color-dot" style="background:${escapeAttr(color)}" title="Change color"></div>` : ''}
    <div class="team-card-inner">
      <div class="card-accent-bar" style="background:linear-gradient(90deg,${escapeAttr(color)},transparent)"></div>
      <div class="card-head">
        <div class="card-tag" ${isAdmin ? 'contenteditable="true"' : ''} style="color:${escapeAttr(color)}">${sanitizeHTML(t.tag) || 'TEAM TAG'}</div>
        <div class="card-title" ${isAdmin ? 'contenteditable="true"' : ''} style="color:${escapeAttr(color)}">${sanitizeHTML(t.title) || 'Team Name'}</div>
        <div class="card-desc" ${isAdmin ? 'contenteditable="true"' : ''}>${sanitizeHTML(t.desc) || (isAdmin ? 'Click to edit...' : '')}</div>
      </div>
      <div class="card-body">
        <div class="card-members">
          ${(t.members || []).map((m, i) => Components.MemberRow(m, i, color, isAdmin)).join('')}
        </div>
        <div class="card-img-right" id="panel-${id}" ${isAdmin ? `onclick="openModal('${id}')"` : ''}>
          <img src="" alt="Team composition screenshot">
          <div class="img-right-overlay"><div class="ov-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><div>No image</div></div>
        </div>
      </div>
      <div class="card-foot">
        <div class="foot-content">
          ${(t.footerBlocks || []).map(b => Components.FooterBlock(b, isAdmin)).join('')}
        </div>
        <div class="card-footer-credits">
          <span class="foot-cred-item">DESIGN BY <span class="foot-cred-name">another729</span></span>
          <span class="foot-cred-contributor"></span>
        </div>
        ${isAdmin ? `
        <div class="card-admin-actions" style="text-align:center;margin-top:10px;border-top:1px solid rgba(255,255,255,.05);padding-top:10px">
          <button class="edit-btn" onclick="addModBox(this)">➕ Require Box</button>
          <button class="edit-btn" onclick="addTipsBox(this)">➕ Tips Box</button>
          <button class="edit-btn" onclick="addWarnBox(this)">➕ Danger Box</button>
          <button class="edit-btn" onclick="openH1Modal(this)">➕ Heading</button>
          <button class="edit-btn" onclick="addMember(this)">➕ Unit</button>
        </div>` : ''}
      </div>
    </div>
    ${isAdmin ? `<button class="delete-team-btn" onclick="this.closest('.team-card').remove()">🗑 Delete</button>` : ''}
    <button class="download-node-btn" onclick="openDlModal(this)" aria-label="Screenshot this card"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Screenshot</button>
`;

  // Card logic like dot listener and drag enablement will be wired in rewireAll
  return card;
}

export function refreshAllCardCredits() {
  if (typeof window.refreshAllCardCreditsCore === 'function') {
    window.refreshAllCardCreditsCore(PAGE_MAP, escapeAttr);
  }
}
