export function showToast(msg, isErr=false) {
  const t = document.getElementById('myToast');
  if(!t) {
    const el = document.createElement('div');
    el.id = 'myToast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  const el = document.getElementById('myToast');
  el.textContent = msg;
  el.className = isErr ? 'toast err show' : 'toast show';
  
  if (el.timeoutId) clearTimeout(el.timeoutId);
  el.timeoutId = setTimeout(() => {
    el.classList.remove('show');
  }, 2500);
}

export function generateId() {
  return 'id_' + Math.random().toString(36).substr(2, 9);
}

// Modal management utilities
export function showModal(id) {
  const m = document.getElementById(id);
  if(m) m.classList.add('open');
}

export function hideModal(id) {
  const m = document.getElementById(id);
  if(m) m.classList.remove('open');
}

export function appendStyle(css) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

// Global click to close palettes
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (e) => {
    // If click is outside palette and outside color dot
    if(!e.target.closest('.clr-palette') && !e.target.closest('.color-dot')) {
      document.querySelectorAll('.clr-palette.open').forEach(p => p.classList.remove('open'));
    }
  });
});

export function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(str, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'span', 'br'],
      ALLOWED_ATTR: ['href', 'title', 'target', 'class', 'style']
    });
  }
  // Fallback if DOMPurify is not loaded
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

