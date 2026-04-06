import { AppState } from './state.js';
import { sanitizeHTML } from './utils.js';

export function renderApp() {
  const isReadOnly = AppState.currentRole !== 'admin';
  const data = AppState.data;
  
  // Dungeon Section
  if (data.pageVisibility.dungeon) {
    document.getElementById('dungeonMode').style.display = 'block';
    
    // ... basic logic to update DOM based on data
    // Update main title
    document.querySelector('#dungeonMode .main-title').textContent = data.dungeon.title;
    
    // Core Teams
    const coreGrid = document.querySelector('#dungeonMode .core-grid');
    coreGrid.innerHTML = '';
    data.dungeon.coreTeams.forEach(t => {
      coreGrid.appendChild(buildCard(t, isReadOnly));
    });
    
    // New Teams
    const newGrid = document.querySelector('#dungeonMode .new-grid');
    newGrid.innerHTML = '';
    data.dungeon.newTeams.forEach(t => {
      newGrid.appendChild(buildCard(t, isReadOnly));
    });
  } else {
    document.getElementById('dungeonMode').style.display = 'none';
  }

  // Story Section
  if (data.pageVisibility.story) {
    document.getElementById('storyMode').style.display = 'block';
    document.querySelector('#storyMode .main-title').textContent = data.story.title;
    
    const sCoreGrid = document.querySelector('#storyMode .core-grid');
    sCoreGrid.innerHTML = '';
    data.story.coreTeams.forEach(t => sCoreGrid.appendChild(buildCard(t, isReadOnly)));
    
    const sNewGrid = document.querySelector('#storyMode .new-grid');
    sNewGrid.innerHTML = '';
    data.story.newTeams.forEach(t => sNewGrid.appendChild(buildCard(t, isReadOnly)));
  } else {
    document.getElementById('storyMode').style.display = 'none';
  }

  // Rewire Dragging logic on Admin side
  if (!isReadOnly && window.rewireAll) {
    window.rewireAll();
  }
}

function buildCard(team, isReadOnly) {
  const wrap = document.createElement('div');
  wrap.className = 'team-card';
  wrap.dataset.cardId = team.id;
  wrap.style.setProperty('--tc', team.color);

  // Instead of re-inventing the wheel right now, I'll use the existing HTML structure 
  // and interpolate the team JSON state into it.

  let html = `
    <!-- Top Bar -->
    <div class="card-accent-bar" style="background: linear-gradient(90deg, ${team.color}, transparent);"></div>
    <div class="card-head">
      ${!isReadOnly ? `<div class="card-drag-handle">☰</div>` : ''}
      <div class="card-tag" ${!isReadOnly ? 'contenteditable="true"' : ''}>${sanitizeHTML(team.tag)}</div>
      <div class="card-title" ${!isReadOnly ? 'contenteditable="true"' : ''}>${sanitizeHTML(team.title)}</div>
      <div class="card-desc" ${!isReadOnly ? 'contenteditable="true"' : ''}>${sanitizeHTML(team.desc)}</div>
      
      ${!isReadOnly ? `
        <button class="delete-team-btn" title="Delete Team">🗑</button>
        <div class="color-dot" style="background:${team.color}" title="Change Color"></div>
        <div class="clr-palette">` + 
          ['#f5c842', '#c36bff', '#00d4ff', '#00e87a', '#ff8c42', '#ff5fa0', '#4488ff', '#ff3355'].map(c => 
            `<div class="cp-sw" style="background:${c}" data-c="${c}"></div>`
          ).join('') +
        `</div>
      ` : ''}
    </div>

    <!-- Body area -->
    <div class="card-body">
      <!-- Members List -->
      <div class="card-members">
        ${team.members.map((m, idx) => `
          <div class="mem-row" data-index="${idx}">
            <div class="mem-num">${idx + 1}</div>
            <div class="mem-info">
              <span class="mem-name" ${!isReadOnly ? 'contenteditable="true"' : ''}>${sanitizeHTML(m.name)}</span>
              <span class="mem-bind" ${!isReadOnly ? 'contenteditable="true"' : ''}>${sanitizeHTML(m.bind)}</span>
            </div>
            ${!isReadOnly ? `<span class="delete-mem" title="Delete Member">✕</span>` : ''}
          </div>
        `).join('')}
        ${!isReadOnly ? `<div><button class="add-point-btn" data-action="add-member">+ Add Member</button></div>` : ''}
      </div>

      <!-- Image Area -->
      <div class="card-img-right ${team.image ? 'loaded' : ''}">
        <img class="main-shot" src="${team.image || ''}">
        <div class="img-right-overlay">
          <div class="ov-icon">🖼️</div>
          <div>No image</div>
          ${!isReadOnly ? `<div style="font-size:0.6rem;opacity:0.6;margin-top:2px">(Click to Add)</div>` : ''}
        </div>
        ${!isReadOnly ? `<div class="delete-box">✕</div>` : ''}
      </div>
    </div>
    
    <!-- Footer for Modifiers / Alerts -->
    <div class="card-foot" ${!team.footContent && isReadOnly ? 'style="display:none"' : ''}>
      <div class="foot-content">
        <!-- Render modifiers, warnings, etc here from team.footContent array -->
      </div>
      ${!isReadOnly ? `
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:10px;">
          <button class="edit-btn" data-action="add-mod-box">+ 🔶 Modifiers</button>
          <button class="edit-btn" data-action="add-tips-box">+ 💡 Tips/Replace</button>
          <button class="edit-btn" data-action="add-warn-box">+ ⚠️ Warning</button>
          <button class="edit-btn" data-action="add-h1">+ H1 Header</button>
          <button class="edit-btn" data-action="clear-foot">Clear</button>
        </div>
      ` : ''}
    </div>
    <div class="download-node-btn" title="Download Card as Image">📸</div>
  `;
  
  wrap.innerHTML = html;
  return wrap;
}
