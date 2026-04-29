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
          <span class="foot-cred-item">DESIGN BY <span class="foot-cred-name">another729</span></span>
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
    let mainDesigner = null;

    credBox.querySelectorAll('.cred-pill').forEach(pill => {
      const lbl = pill.querySelector('.cred-lbl')?.textContent.toUpperCase() || '';
      const nameEl = pill.querySelector('.cred-name');
      const name = nameEl?.textContent || '';
      const color = nameEl?.style.color || '#f5c842';
      
      if (lbl.includes('DESIGN') || lbl === 'AUTHOR' || lbl === 'CREATOR') {
        mainDesigner = { lbl, name, color };
      } else if (name && !name.toLowerCase().includes('anotheruseru')) {
        pills.push({ lbl, name, color });
      }
    });

    section.querySelectorAll('.team-card').forEach(card => {
      const mainTarget = card.querySelector('.card-footer-credits > .foot-cred-item');
      if (mainTarget && mainDesigner) {
        // Update the hardcoded "another729" main credit to match the section's actual main designer
        mainTarget.innerHTML = `${escapeAttr(mainDesigner.lbl)} <span class="foot-cred-name" style="color:${escapeAttr(mainDesigner.color)}">${escapeAttr(mainDesigner.name)}</span>`;
      }

      // We use innerText to ignore hidden elements and get clean text
      const tagText = (card.querySelector('.card-tag')?.innerText || '').trim();
      const titleText = (card.querySelector('.card-title')?.innerText || '').trim();
      if (!tagText && !titleText) return;
      let contributor = null;
      // Prioritize numbers found in the tag over the title based on user request.
      // E.g., "Heros Palace 2" in the tag will dictate the credit even if title has "TEAM 1".
      const tagNums = tagText.toUpperCase().match(/\d+/g) || [];
      const titleNums = titleText.toUpperCase().match(/\d+/g) || [];
      const nums = [...tagNums, ...titleNums];
      
      const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tagUC = tagText.toUpperCase().trim().replace(/\s+/g, ' ');
      const titleUC = titleText.toUpperCase().trim().replace(/\s+/g, ' ');

      // 1. Tag Priority (Exact then Regex)
      if (tagUC.length > 1) {
        contributor = pills.find(p => p.lbl === tagUC);
        if (!contributor) {
          const reg = new RegExp('\\b' + escapeRegex(tagUC) + '\\b', 'i');
          contributor = pills.find(p => reg.test(p.lbl));
        }
      }

      // 2. Title Priority (Exact then Regex) - Only if Tag failed
      if (!contributor && titleUC.length > 1) {
        contributor = pills.find(p => p.lbl === titleUC);
        if (!contributor) {
          const reg = new RegExp('\\b' + escapeRegex(titleUC) + '\\b', 'i');
          contributor = pills.find(p => reg.test(p.lbl));
        }
      }

      // 3. Fallback to Number Match (Strict Context-Aware)
      if (!contributor) {
        const getPrefix = (s) => s.replace(/[\d-]/g, '').replace(/TEAM|CREATOR|BY|GUIDE/g, '').trim().toUpperCase();
        const tagPrefix = getPrefix(tagUC);
        const titlePrefix = getPrefix(titleUC);

        for (const n of nums) {
          const cardNum = parseInt(n);
          const match = pills.find(p => {
            // A. Number/Range Check
            let hasNum = p.lbl.match(new RegExp('\\b' + n + '\\b'));
            if (!hasNum) {
              const rangeMatches = p.lbl.match(/(\d+)\s*-\s*(\d+)/g);
              if (rangeMatches) {
                for (const rangeStr of rangeMatches) {
                  const [start, end] = rangeStr.split('-').map(v => parseInt(v.trim()));
                  if (cardNum >= start && cardNum <= end) { hasNum = true; break; }
                }
              }
            }
            if (!hasNum) return false;

            // B. Strict Context Check
            const pPrefix = getPrefix(p.lbl);
            const tagPrefix = getPrefix(tagUC);
            const titlePrefix = getPrefix(titleUC);

            if (pPrefix) {
              // If pill has a location name, it MUST match the card's location name.
              const isMatch = (tagPrefix && tagPrefix.includes(pPrefix)) || 
                              (pPrefix.includes(tagPrefix) && tagPrefix.length > 2) ||
                              (titlePrefix && titlePrefix.includes(pPrefix));
              if (!isMatch) return false;
            } else if (tagPrefix || titlePrefix) {
              // If pill is generic (just "1") but card is specific ("Slime City 1"),
              // we only allow it if there's no better specific match available.
              // (Step 1 & 2 already check for specific matches).
            }
            return true;
          });
          if (match) { contributor = match; break; }
        }
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
