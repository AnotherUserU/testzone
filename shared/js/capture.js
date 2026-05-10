/**
 * Unified Screenshot Capture Engine
 * Centralizes html2canvas logic for Guest and Admin modes.
 * Ensures consistent UI cleanup and layout stabilization.
 */
(function (global) {
  const ScreenshotEngine = {
    // Selectors for elements to hide during capture
    HIDE_SELECTORS: [
      '.edit-btn', '.delete-mem', '.delete-team-btn', '.delete-box',
      '.add-point-btn', '.card-drag-handle', '.color-dot', '.clr-palette',
      '.block-handle', '.cred-edit-btn', '.float-xl', '.add-banner-btn',
      '.add-banner-bar', '.save-bar', '#downloadBtn', '#dlBtnWrapper',
      '[data-block="save-local"]', '[data-block="download"]', '#themeToggle',
      '.del-section-btn', '.team-section-actions', '.add-section-btn',
      '.download-node-btn', '.nav-header', '.admin-link', '#roleBadge',
      '#fbStatus', '#scrollProgress'
    ].join(','),

    /**
     * Captures a screenshot based on options.
     * @param {Object} options 
     * @param {string} options.mode - 'fullscreen' or 'node'
     * @param {string} options.format - 'png' or 'jpg'
     * @param {number} options.quality - 0 to 1
     * @param {boolean} options.isLight - theme status
     * @param {HTMLElement} [options.target] - target element for 'node' mode
     * @param {Function} [options.onStart]
     * @param {Function} [options.onSuccess]
     * @param {Function} [options.onError]
     */
    capture: function (options) {
      const { mode, format, quality, isLight, target, onStart, onSuccess, onError } = options;

      if (onStart) onStart();

      setTimeout(() => {
        try {
          if (mode === 'fullscreen') {
            this.captureFullscreen(options);
          } else {
            this.captureNode(options);
          }
        } catch (err) {
          console.error('ScreenshotEngine Error:', err);
          if (onError) onError(err);
        }
      }, 400); // Buffer for UI transitions (e.g. closing modals)
    },

    captureFullscreen: function (options) {
      const { format, quality, isLight, onSuccess, onError } = options;
      const pageBodyElement = document.getElementById('pageBody') || document.body;
      const origMaxWidth = pageBodyElement.style.maxWidth;
      const origMargin = pageBodyElement.style.margin;

      // Stabilize layout for capture
      pageBodyElement.style.maxWidth = '1440px';
      pageBodyElement.style.margin = '0 auto';

      html2canvas(pageBodyElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: isLight ? '#ffffff' : '#0f0f17',
        logging: false,
        ignoreElements: (el) => el.hasAttribute('data-html2canvas-ignore') || el.id === 'scrollProgress',
        onclone: (clonedDoc) => {
          this.prepareClone(clonedDoc, isLight, true);
        }
      }).then(canvas => {
        // Restore layout
        pageBodyElement.style.maxWidth = origMaxWidth;
        pageBodyElement.style.margin = origMargin;
        
        this.downloadCanvas(canvas, format, quality, 'Team_Composition_Guide');
        if (onSuccess) onSuccess();
      }).catch(err => {
        pageBodyElement.style.maxWidth = origMaxWidth;
        pageBodyElement.style.margin = origMargin;
        if (onError) onError(err);
      });
    },

    captureNode: function (options) {
      const { target, format, quality, isLight, onSuccess, onError } = options;
      if (!target) throw new Error('Target node required for node capture');

      // Tag target for reliable cloning
      const origId = target.id;
      target.setAttribute('data-capture-target', 'true');

      html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: isLight ? '#ffffff' : '#13131f',
        logging: false,
        onclone: (clonedDoc) => {
          this.prepareClone(clonedDoc, isLight, false);
          const clonedCard = clonedDoc.querySelector('[data-capture-target="true"]');
          if (clonedCard) {
            // RESTORE STYLES: Keep card width consistent (320px) to maintain premium look.
            clonedCard.style.setProperty('display', 'flex', 'important');
            clonedCard.style.setProperty('flex-direction', 'column', 'important');
            clonedCard.style.setProperty('width', '320px', 'important');
            clonedCard.style.setProperty('height', 'auto', 'important');
            clonedCard.style.setProperty('min-height', 'min-content', 'important');
            clonedCard.style.setProperty('margin', '0', 'important');
            
            // CRITICAL: Must use overflow:hidden to keep rounded corners at the top!
            const inner = clonedCard.querySelector('.team-card-inner');
            if (inner) {
              inner.style.setProperty('width', '100%', 'important');
              inner.style.setProperty('height', 'auto', 'important');
              inner.style.setProperty('min-height', 'min-content', 'important');
              inner.style.setProperty('overflow', 'hidden', 'important');
              inner.style.setProperty('display', 'flex', 'important');
              inner.style.setProperty('flex-direction', 'column', 'important');
            }
            
            // Show and stabilize credits explicitly in card mode
            clonedCard.querySelectorAll('.card-footer-credits').forEach(el => {
              el.style.setProperty('display', 'flex', 'important');
              el.style.setProperty('width', '100%', 'important');
              el.style.setProperty('word-break', 'break-word', 'important');
              el.style.setProperty('overflow-wrap', 'break-word', 'important');
            });
          }
        }
      }).then(canvas => {
        target.removeAttribute('data-capture-target');
        const title = target.querySelector('.card-title')?.textContent.trim().replace(/\s+/g, '_') || 'Card';
        this.downloadCanvas(canvas, format, quality, title);
        if (onSuccess) onSuccess();
      }).catch(err => {
        target.removeAttribute('data-capture-target');
        if (onError) onError(err);
      });
    },

    prepareClone: function (clonedDoc, isLight, isFullscreen) {
      // 1. Remove UI Chrome
      clonedDoc.querySelectorAll(this.HIDE_SELECTORS).forEach(el => el.remove());

      // 2. Stabilize Wrappers
      clonedDoc.querySelectorAll('.grid-wrap, .alert-wrap').forEach(el => {
        el.style.setProperty('padding-left', '0', 'important');
        el.style.setProperty('padding-right', '0', 'important');
      });

      // 3. Fix Gradient Crash (html2canvas bug with 0px dimensions)
      clonedDoc.querySelectorAll('.card-accent-bar').forEach(el => {
        const tc = el.style.getPropertyValue('--tc') || '#f5c842';
        el.style.setProperty('background', tc, 'important');
        el.style.setProperty('min-width', '20px', 'important');
        el.style.setProperty('min-height', '3px', 'important');
      });

      if (isFullscreen) {
        // 4. Tighten Titles
        clonedDoc.querySelectorAll('.mode-section.active .main-title').forEach(el => {
          el.style.setProperty('padding-top', '12px', 'important');
          el.style.setProperty('margin-top', '0', 'important');
        });
      }
    },

    downloadCanvas: function (canvas, format, quality, filename) {
      const a = document.createElement('a');
      a.download = `${filename}.${format === 'jpg' ? 'jpg' : 'png'}`;
      a.href = format === 'jpg' ? canvas.toDataURL('image/jpeg', quality) : canvas.toDataURL('image/png');
      a.click();
    }
  };

  global.ScreenshotEngine = ScreenshotEngine;
})(typeof window !== 'undefined' ? window : this);
