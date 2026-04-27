/*
  Drag and Drop logic for Cards, Blocks, and Members
*/
import { AppState } from './state.js';

export function wireBlockDrag(block) {
  const h = block.querySelector(':scope > .block-handle');
  if (!h) return;
  h.addEventListener('mousedown', () => block.setAttribute('draggable', 'true'));
  block.addEventListener('dragstart', e => {
    if (document.body.classList.contains('readonly')) { e.preventDefault(); return; }
    AppState.dragBlock = block;
    block.classList.add('dragging-block');
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  });
  block.addEventListener('dragend', () => {
    block.setAttribute('draggable', 'false');
    block.classList.remove('dragging-block');
    document.querySelectorAll('.block-drag-over').forEach(b => b.classList.remove('block-drag-over'));
    AppState.dragBlock = null;
  });
}

export function enableCardDrag(card) {
  const handle = card.querySelector('.card-drag-handle');
  if (handle) {
    handle.addEventListener('mousedown', () => {
      if (!document.body.classList.contains('readonly')) card.setAttribute('draggable', 'true');
    });
  }
  card.addEventListener('dragstart', e => {
    if (document.body.classList.contains('readonly')) { e.preventDefault(); return; }
    AppState.dragCard = card;
    card.classList.add('dragging-card');
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  });
  card.addEventListener('dragend', () => {
    card.setAttribute('draggable', 'false');
    card.classList.remove('dragging-card');
    document.querySelectorAll('.drag-over-card').forEach(c => c.classList.remove('drag-over-card'));
    AppState.dragCard = null;
  });
  card.addEventListener('dragover', e => {
    e.preventDefault(); e.stopPropagation();
    if (AppState.dragCard && AppState.dragCard !== card) card.classList.add('drag-over-card');
  });
  card.addEventListener('dragleave', () => card.classList.remove('drag-over-card'));
  card.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    card.classList.remove('drag-over-card');
    if (AppState.dragCard && AppState.dragCard !== card) {
      const dg = card.parentNode;
      const cards = [...dg.children];
      dg.insertBefore(AppState.dragCard, cards[cards.indexOf(card)]);
    }
  });
}

export function wireGridDrop(grid) {
  grid.addEventListener('dragover', e => {
    e.preventDefault();
    if (!document.body.classList.contains('readonly')) grid.classList.add('drag-over');
  });
  grid.addEventListener('dragleave', () => grid.classList.remove('drag-over'));
  grid.addEventListener('drop', e => {
    e.preventDefault();
    grid.classList.remove('drag-over');
    if (AppState.dragCard && AppState.dragCard.parentNode !== grid && !document.body.classList.contains('readonly')) {
      grid.appendChild(AppState.dragCard);
    }
  });
}

export function enableMemDrag(row) {
  row.setAttribute('draggable', 'true');
  row.addEventListener('dragstart', e => {
    if (document.body.classList.contains('readonly')) { e.preventDefault(); return; }
    AppState.dragMem = row;
    row.classList.add('dragging-mem');
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
  });
  row.addEventListener('dragend', () => {
    row.classList.remove('dragging-mem');
    document.querySelectorAll('.over-mem').forEach(r => r.classList.remove('over-mem'));
    AppState.dragMem = null;
  });
  row.addEventListener('dragover', e => {
    e.preventDefault(); e.stopPropagation();
    if (AppState.dragMem && AppState.dragMem !== row) row.classList.add('over-mem');
  });
  row.addEventListener('dragleave', () => row.classList.remove('over-mem'));
  row.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    row.classList.remove('over-mem');
    if (AppState.dragMem && AppState.dragMem !== row) {
      const c = row.parentNode;
      const rows = [...c.querySelectorAll('.mem-row')];
      c.insertBefore(AppState.dragMem, rows[rows.indexOf(row)]);
      renumMembers(c);
    }
  });
}

export function renumMembers(container) {
  container.querySelectorAll('.mem-row').forEach((r, i) => {
    const n = r.querySelector('.mem-num');
    if (n) n.textContent = i + 1;
  });
}
