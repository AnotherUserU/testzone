/**
 * Shared UI Components for Team Composition Guide
 * Centralizes HTML generation to ensure consistency between Admin and Guest modes.
 */
import { sanitizeHTML, escapeAttr } from './utils.js';

export const Components = {
  /**
   * Generates HTML for a member row.
   */
  MemberRow: (member, index, color, isAdmin = false) => {
    return `
      <div class="mem-row">
        <div class="mem-num" style="color:${color}">${index + 1}</div>
        <div style="flex:1">
          <div class="mem-name" ${isAdmin ? 'contenteditable="true"' : ''}>${sanitizeHTML(member.name)}</div>
          <div class="mem-bind" ${isAdmin ? 'contenteditable="true"' : ''}>${sanitizeHTML(member.bind)}</div>
        </div>
        ${isAdmin ? '<span class="delete-mem" onclick="this.closest(\'.mem-row\').remove(); renumMembers(this.closest(\'.card-members\'))">✕</span>' : ''}
      </div>`;
  },

  /**
   * Generates HTML for a card footer content block (Mod, Tips, Warn, H1).
   */
  FooterBlock: (block, isAdmin = false) => {
    const type = block.type || 'mod'; // mod, tips, warn, h1
    const content = sanitizeHTML(block.content || '');
    const title = sanitizeHTML(block.title || '');
    const color = block.color || '#f5c842';

    if (type === 'h1') {
      return `
        <div class="h1-block">
          <h1 ${isAdmin ? 'contenteditable="true"' : ''} style="color:${color};text-shadow:0 0 14px ${color}66">${content || 'Heading'}</h1>
          ${isAdmin ? '<span class="delete-box" onclick="this.closest(\'.h1-block\').remove()">✕</span>' : ''}
        </div>`;
    }

    if (type === 'warn') {
      return `
        <div class="warn-box">
          <span ${isAdmin ? 'contenteditable="true"' : ''} style="cursor: text;">${content || '⚠️ DANGER: High level required.'}</span>
          ${isAdmin ? '<span class="delete-box" onclick="this.closest(\'.warn-box\').remove()">✕</span>' : ''}
        </div>`;
    }

    // Mod and Tips follow similar structure
    const config = {
      mod: { class: 'mod-box', titleClass: 'mod-title', itemClass: 'mod-item', defTitle: '🔶 REQUIRED' },
      tips: { class: 'tips-box', titleClass: 'tips-title', itemClass: 'tips-item', defTitle: '💡 TIPS' }
    }[type] || config.mod;

    const items = Array.isArray(block.items) ? block.items : [content];
    
    return `
      <div class="${config.class}">
        <div class="${config.titleClass}" ${isAdmin ? 'contenteditable="true"' : ''} style="cursor: text;">${title || config.defTitle}</div>
        ${items.map(item => `<div class="${config.itemClass}" ${isAdmin ? 'contenteditable="true"' : ''}>${sanitizeHTML(item)}</div>`).join('')}
        ${isAdmin ? `<button class="add-point-btn" onclick="addBoxItem(this, '${config.itemClass}')">+ Add Point</button>` : ''}
        ${isAdmin ? '<span class="delete-box" onclick="this.closest(\'.' + config.class + '\').remove()">✕</span>' : ''}
      </div>`;
  }
};
