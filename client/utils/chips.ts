import { escapeHtml } from './dom.js';

export function addChip(chipContainer, text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const existing = Array.from(chipContainer.children).map((c) => c.dataset.value?.toLowerCase());
  if (existing.includes(trimmed.toLowerCase())) return;
  const span = document.createElement('span');
  span.className = 'pa-chip';
  span.dataset.value = trimmed;
  span.innerHTML = `<span>${escapeHtml(trimmed)}</span>`;
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'pa-chip-remove';
  removeBtn.setAttribute('aria-label', `Remove ${trimmed}`);
  removeBtn.innerHTML = '&times;';
  removeBtn.addEventListener('click', () => span.remove());
  span.appendChild(removeBtn);
  chipContainer.appendChild(span);
}

export function getChipValues(container) {
  return Array.from(container.children).map((c) => c.dataset.value);
}

export function populateChips(container, tags) {
  container.innerHTML = '';
  tags.forEach((t) => addChip(container, t));
}
