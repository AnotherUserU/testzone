/* 
  Unified Credit Matching Logic
  This file is loaded as a classic script in index.html and admin.html
  to avoid code duplication without requiring module loaders in index.html.
*/
(function (global) {
  /**
   * Helper to escape HTML attributes for safety.
   */
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /**
   * Extracts specific prefix from text (removes numbers and common keywords).
   */
  const getCleanPrefix = (text) => {
    return text.replace(/[\d-]/g, '')
               .replace(/TEAM|CREATOR|BY|GUIDE|AUTHOR|DESIGN/g, '')
               .trim().toUpperCase();
  };

  /**
   * Matches a card to a contributor based on tag and title text.
   */
  const findMatch = (pills, tagText, titleText) => {
    const tagUC = tagText.toUpperCase().trim();
    const titleUC = titleText.toUpperCase().trim();
    const nums = [...(tagUC.match(/\d+/g) || []), ...(titleUC.match(/\d+/g) || [])];

    // 1. Try exact or word match on Tag
    if (tagUC.length > 1) {
      let match = pills.find(p => p.lbl === tagUC);
      if (!match) {
        const reg = new RegExp('\\b' + escapeRegex(tagUC) + '\\b', 'i');
        match = pills.find(p => reg.test(p.lbl));
      }
      if (match) return match;
    }

    // 2. Try exact or word match on Title
    if (titleUC.length > 1) {
      let match = pills.find(p => p.lbl === titleUC);
      if (!match) {
        const reg = new RegExp('\\b' + escapeRegex(titleUC) + '\\b', 'i');
        match = pills.find(p => reg.test(p.lbl));
      }
      if (match) return match;
    }

    // 3. Fallback to Numeric Match with Prefix Validation
    const tagPrefix = getCleanPrefix(tagUC);
    const titlePrefix = getCleanPrefix(titleUC);

    for (const n of nums) {
      const cardNum = parseInt(n, 10);
      const match = pills.find(p => {
        let hasNum = p.lbl.match(new RegExp('\\b' + n + '\\b'));
        if (!hasNum) {
          const rangeMatches = p.lbl.match(/(\d+)\s*-\s*(\d+)/g);
          if (rangeMatches) {
            for (const rm of rangeMatches) {
              const parts = rm.split('-').map(v => parseInt(v.trim(), 10));
              if (cardNum >= parts[0] && cardNum <= parts[1]) { hasNum = true; break; }
            }
          }
        }
        if (!hasNum) return false;

        const pPrefix = getCleanPrefix(p.lbl);
        if (pPrefix) {
          return (tagPrefix && tagPrefix.includes(pPrefix)) || 
                 (pPrefix.includes(tagPrefix) && tagPrefix.length > 2) ||
                 (titlePrefix && titlePrefix.includes(pPrefix));
        }
        return true;
      });
      if (match) return match;
    }

    return null;
  };

  global.refreshAllCardCreditsCore = function (PAGE_MAP, escapeAttr) {
    const modes = ['dungeon', 'story', 'raid', 'storyTowers', 'battleTowers', 'celestialTower', 'worldBoss'];
    modes.forEach(mode => {
      const section = document.getElementById(PAGE_MAP[mode]);
      if (!section) return;
      const credBox = section.querySelector('.cred-display');
      if (!credBox) return;

      const pills = [];
      let mainDesigner = null;

      credBox.querySelectorAll('.cred-pill').forEach(pill => {
        const lbl = pill.querySelector('.cred-lbl')?.textContent.toUpperCase().trim() || '';
        const nameEl = pill.querySelector('.cred-name');
        const name = nameEl?.textContent || '';
        const color = nameEl?.style.color || '#f5c842';
        
        if (lbl.includes('DESIGN') || lbl === 'AUTHOR' || lbl === 'CREATOR') {
          mainDesigner = { lbl, name, color };
        } else if (name && !name.toLowerCase().includes('another729')) {
          pills.push({ lbl, name, color });
        }
      });

      section.querySelectorAll('.team-card').forEach(card => {
        // Update Main Designer
        const mainTarget = card.querySelector('.card-footer-credits > .foot-cred-item');
        if (mainTarget && mainDesigner) {
          mainTarget.innerHTML = `${escapeAttr(mainDesigner.lbl)} <span class="foot-cred-name" style="color:${escapeAttr(mainDesigner.color)}">${escapeAttr(mainDesigner.name)}</span>`;
        }

        // Ensure credit container exists
        if (!card.querySelector('.card-footer-credits')) {
          const footer = card.querySelector('.card-foot');
          if (footer) {
            const credContainer = document.createElement('div');
            credContainer.className = 'card-footer-credits';
            credContainer.innerHTML = '<span class="foot-cred-item">DESIGN BY <span class="foot-cred-name">another729</span></span><span class="foot-cred-contributor"></span>';
            footer.appendChild(credContainer);
          }
        }

        // Find Contributor
        const tagText = (card.querySelector('.card-tag')?.innerText || '').trim();
        const titleText = (card.querySelector('.card-title')?.innerText || '').trim();
        const contributor = findMatch(pills, tagText, titleText);

        const contributorTarget = card.querySelector('.foot-cred-contributor');
        if (contributorTarget) {
          contributorTarget.innerHTML = contributor 
            ? `<span class="foot-cred-sep">|</span> <span class="foot-cred-item">UNIT BY <span class="foot-cred-name" style="color:${escapeAttr(contributor.color)}">${escapeAttr(contributor.name)}</span></span>`
            : '';
        }
      });
    });
  };
})(typeof window !== 'undefined' ? window : this);
