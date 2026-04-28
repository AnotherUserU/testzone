/*
  Utility Functions
*/
import { SECURITY } from './config.js';

export function showToast(msg, isErr) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (isErr ? ' err' : '');
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2800);
}

export function showFbStatus(msg, type) {
  const el = document.getElementById('fbStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show ' + (type || 'ok');
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.className = '';
    el.textContent = '';
  }, 3500);
}

export function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  return DOMPurify.sanitize(str, {
    ALLOWED_TAGS: SECURITY.ALLOWED_TAGS || ['b', 'i', 'em', 'strong', 'a', 'span', 'br'],
    ALLOWED_ATTR: SECURITY.ALLOWED_ATTR || ['href', 'title', 'target', 'class', 'style']
  });
}

export function escapeAttr(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/"/g, '&quot;');
}

export function rgbToHex(color) {
  if (!color) return '#f5c842';
  if (color.startsWith('#')) return color;
  const r = color.match(/\d+/g);
  if (!r || r.length < 3) return '#f5c842';
  return '#' + r.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
}

export function selectAll(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}
