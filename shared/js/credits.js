/* 
  Unified Credit Matching Logic
  This file is loaded as a classic script in index.html and admin.html
  to avoid code duplication without requiring module loaders in index.html.
*/
(function (global) {
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
        } else if (name && !name.toLowerCase().includes('anotheruseru')) {
          pills.push({ lbl, name, color });
        }
      });

      section.querySelectorAll('.team-card').forEach(card => {
        const mainTarget = card.querySelector('.card-footer-credits > .foot-cred-item');
        if (mainTarget && mainDesigner) {
          mainTarget.innerHTML = escapeAttr(mainDesigner.lbl) + ' <span class="foot-cred-name" style="color:' + escapeAttr(mainDesigner.color) + '">' + escapeAttr(mainDesigner.name) + '</span>';
        }

        const footer = card.querySelector('.card-foot');
        if (!card.querySelector('.card-footer-credits') && footer) {
          const credContainer = document.createElement('div');
          credContainer.className = 'card-footer-credits';
          credContainer.innerHTML = '<span class="foot-cred-item">DESIGN BY <span class="foot-cred-name">AnotherUseru</span></span><span class="foot-cred-contributor"></span>';
          footer.appendChild(credContainer);
        }

        const tagText = (card.querySelector('.card-tag')?.innerText || '').trim();
        const titleText = (card.querySelector('.card-title')?.innerText || '').trim();
        if (!tagText && !titleText) return;
        let contributor = null;

        const tagNums = tagText.toUpperCase().match(/\d+/g) || [];
        const titleNums = titleText.toUpperCase().match(/\d+/g) || [];
        const nums = [...tagNums, ...titleNums];

        const escapeRegex = function(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
        const tagUC = tagText.toUpperCase().trim().replace(/\s+/g, ' ');
        const titleUC = titleText.toUpperCase().trim().replace(/\s+/g, ' ');

        // 1. Tag Priority (Exact then Regex)
        if (tagUC.length > 1) {
          contributor = pills.find(function(p) { return p.lbl === tagUC; });
          if (!contributor) {
            const reg = new RegExp('\\b' + escapeRegex(tagUC) + '\\b', 'i');
            contributor = pills.find(function(p) { return reg.test(p.lbl); });
          }
        }

        // 2. Title Priority (Exact then Regex) - Only if Tag failed
        if (!contributor && titleUC.length > 1) {
          contributor = pills.find(function(p) { return p.lbl === titleUC; });
          if (!contributor) {
            const reg2 = new RegExp('\\b' + escapeRegex(titleUC) + '\\b', 'i');
            contributor = pills.find(function(p) { return reg2.test(p.lbl); });
          }
        }

        // 3. Fallback to Number Match (Strict Context-Aware)
        if (!contributor) {
          const getPrefix = function(s) { return s.replace(/[\d-]/g, '').replace(/TEAM|CREATOR|BY|GUIDE/g, '').trim().toUpperCase(); };
          const tagPrefix = getPrefix(tagUC);
          const titlePrefix = getPrefix(titleUC);

          for (let ni = 0; ni < nums.length; ni++) {
            const n = nums[ni];
            const cardNum = parseInt(n, 10);
            const match = pills.find(function(p) {
              let hasNum = p.lbl.match(new RegExp('\\b' + n + '\\b'));
              if (!hasNum) {
                const rangeMatches = p.lbl.match(/(\d+)\s*-\s*(\d+)/g);
                if (rangeMatches) {
                  for (let ri = 0; ri < rangeMatches.length; ri++) {
                    const parts = rangeMatches[ri].split('-').map(function(v) { return parseInt(v.trim(), 10); });
                    if (cardNum >= parts[0] && cardNum <= parts[1]) { hasNum = true; break; }
                  }
                }
              }
              if (!hasNum) return false;

              const pPrefix = getPrefix(p.lbl);
              if (pPrefix) {
                const isMatch = (tagPrefix && tagPrefix.includes(pPrefix)) || 
                                (pPrefix.includes(tagPrefix) && tagPrefix.length > 2) ||
                                (titlePrefix && titlePrefix.includes(pPrefix));
                if (!isMatch) return false;
              }
              return true;
            });
            if (match) { contributor = match; break; }
          }
        }

        const contributorTarget = card.querySelector('.foot-cred-contributor');
        if (contributorTarget) {
          if (contributor) {
            contributorTarget.innerHTML = '<span class="foot-cred-sep">|</span> <span class="foot-cred-item">UNIT BY <span class="foot-cred-name" style="color:' + escapeAttr(contributor.color) + '">' + escapeAttr(contributor.name) + '</span></span>';
          } else {
            contributorTarget.innerHTML = '';
          }
        }
      });
    });
  };
})(typeof window !== 'undefined' ? window : this);
