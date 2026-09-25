import { $id } from './dom.js';
import {
  loadRegistry,
  filterRegistryIcons,
  getRegistryCategories,
} from './remix-icon-registry.js';
import { resolveIconKey, renderIconPreviewHtml } from './icon-utils.js';

const OVERLAY_ID = 'paIconPickerOverlay';
const BATCH_SIZE = 120;
const MAX_PREFILL = 480;

let modalReady = false;
let overlay = null;
let grid = null;
let searchInput = null;
let categorySelect = null;
let countEl = null;
let loadingEl = null;
let errorEl = null;
let emptyEl = null;
let onSelectCb = null;
let currentIcon = '';
let defaultIcon = 'ri-tools-line';
let currentCategory = 'all';
let renderToken = 0;
let allIcons = [];
let filteredIcons = [];
let renderedCount = 0;
let scrollBound = false;
let returnFocusEl = null;

function setLoading(loading) {
  loadingEl?.classList.toggle('visible', loading);
}

function setError(message) {
  if (!errorEl) return;
  const text = $id('paIconPickerErrorText');
  if (text) text.textContent = message;
  errorEl.hidden = !message;
  if (message) {
    grid.innerHTML = '';
    emptyEl.hidden = true;
  }
}

function populateCategoryFilter() {
  if (!categorySelect) return;
  const categories = getRegistryCategories(allIcons);
  const previous = currentCategory;
  categorySelect.innerHTML = `<option value="all">All categories (${allIcons.length.toLocaleString()})</option>`;
  categories.forEach(({ name, count }) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = `${name} (${count.toLocaleString()})`;
    categorySelect.appendChild(option);
  });
  categorySelect.value = categories.some((cat) => cat.name === previous) ? previous : 'all';
  currentCategory = categorySelect.value;
}

function ensureModal() {
  if (modalReady) return;

  overlay = $id(OVERLAY_ID);
  if (!overlay) {
    throw new Error('Icon picker modal markup is missing from the page.');
  }

  grid = $id('paIconPickerGrid');
  searchInput = $id('paIconPickerSearch');
  categorySelect = $id('paIconPickerCategory');
  countEl = $id('paIconPickerCount');
  loadingEl = $id('paIconPickerLoading');
  errorEl = $id('paIconPickerError');
  emptyEl = $id('paIconPickerEmpty');

  $id('paIconPickerClose')?.addEventListener('click', close);
  $id('paIconPickerCancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  $id('paIconPickerModal')?.addEventListener('click', (e) => e.stopPropagation());

  searchInput?.addEventListener('input', () => {
    resetGrid();
  });
  categorySelect?.addEventListener('change', () => {
    currentCategory = categorySelect.value || 'all';
    resetGrid();
  });
  document.addEventListener('keydown', onDocumentKeydown);

  if (!scrollBound && grid) {
    grid.addEventListener('scroll', onGridScroll);
    scrollBound = true;
  }

  modalReady = true;
}

function onDocumentKeydown(e) {
  if (!overlay?.classList.contains('visible')) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
  }
}

function restoreFocus() {
  const target = returnFocusEl;
  returnFocusEl = null;
  if (target && typeof target.focus === 'function' && document.contains(target)) {
    target.focus();
    return;
  }
  const active = document.activeElement;
  if (active && overlay?.contains(active) && typeof active.blur === 'function') {
    active.blur();
  }
}

function openModal() {
  if (!overlay) return;
  overlay.removeAttribute('inert');
  overlay.removeAttribute('aria-hidden');
  overlay.classList.add('visible');
}

function closeModal() {
  if (!overlay) return;
  overlay.classList.remove('visible');
  restoreFocus();
  requestAnimationFrame(() => {
    if (!overlay.classList.contains('visible')) {
      overlay.setAttribute('inert', '');
    }
  });
}

function updateCount() {
  if (!countEl) return;
  const query = searchInput?.value?.trim() || '';
  const categoryLabel = currentCategory === 'all' ? 'all categories' : currentCategory;

  if (!allIcons.length) {
    countEl.textContent = '';
    return;
  }

  const total = filteredIcons.length;
  const shown = Math.min(renderedCount, total);
  const parts = [`Showing ${shown.toLocaleString()} of ${total.toLocaleString()} icon${total === 1 ? '' : 's'}`];
  if (query) parts.push(`matching "${query}"`);
  if (currentCategory !== 'all') parts.push(`in ${categoryLabel}`);
  if (shown < total) parts.push('— scroll for more');
  countEl.textContent = parts.join(' ');
}

function createIconButton(icon) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pa-icon-picker-item';
  btn.dataset.icon = icon.slug;
  btn.title = icon.title;
  btn.setAttribute('role', 'option');
  btn.setAttribute('aria-label', icon.title);
  btn.innerHTML = `<i class="${icon.slug}" aria-hidden="true"></i>`;
  btn.addEventListener('click', () => selectIcon(icon.slug));
  return btn;
}

function highlightCurrent() {
  if (!grid) return;
  grid.querySelectorAll('.pa-icon-picker-item').forEach((btn) => {
    const active = btn.dataset.icon === currentIcon;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  const activeBtn = grid.querySelector(`.pa-icon-picker-item[data-icon="${CSS.escape(currentIcon)}"]`);
  if (activeBtn) activeBtn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function appendBatch(token) {
  if (token !== renderToken || !grid) return false;

  const frag = document.createDocumentFragment();
  const start = renderedCount;
  const end = Math.min(renderedCount + BATCH_SIZE, filteredIcons.length);
  for (; renderedCount < end; renderedCount += 1) {
    frag.appendChild(createIconButton(filteredIcons[renderedCount]));
  }
  if (start === renderedCount) return false;
  grid.appendChild(frag);

  emptyEl.hidden = filteredIcons.length > 0;
  updateCount();
  highlightCurrent();
  return renderedCount < filteredIcons.length;
}

function gridNeedsMoreIcons() {
  if (!grid || renderedCount >= filteredIcons.length) return false;
  if (renderedCount >= MAX_PREFILL) return false;
  return grid.scrollHeight <= grid.clientHeight + 16;
}

function fillGridUntilScrollable(token) {
  if (token !== renderToken || !grid) return;
  if (!gridNeedsMoreIcons()) return;

  appendBatch(token);
  requestAnimationFrame(() => fillGridUntilScrollable(token));
}

function onGridScroll() {
  if (!grid) return;
  if (renderedCount >= filteredIcons.length) return;
  if (grid.scrollTop + grid.clientHeight < grid.scrollHeight - 80) return;
  appendBatch(renderToken);
}

function resetGrid() {
  const token = ++renderToken;
  if (!grid) return;

  grid.innerHTML = '';
  renderedCount = 0;
  filteredIcons = filterRegistryIcons(allIcons, {
    query: searchInput?.value || '',
    category: currentCategory,
  });

  if (!filteredIcons.length) {
    emptyEl.hidden = false;
    updateCount();
    return;
  }

  emptyEl.hidden = true;
  grid.scrollTop = 0;
  appendBatch(token);
  requestAnimationFrame(() => fillGridUntilScrollable(token));
}

async function loadIcons() {
  setLoading(true);
  setError('');
  try {
    allIcons = await loadRegistry();
    populateCategoryFilter();
    resetGrid();
  } catch {
    setError('Could not load Remix Icon library. Check your connection and try again.');
    if (countEl) countEl.textContent = '';
  } finally {
    setLoading(false);
  }
}

function selectIcon(slug) {
  currentIcon = slug;
  onSelectCb?.(slug);
  close();
}

export function close() {
  if (!overlay) return;
  closeModal();
  onSelectCb = null;
}

export function open({ current, defaultIcon: fallback, onSelect, returnFocus } = {}) {
  ensureModal();
  defaultIcon = fallback || 'ri-tools-line';
  currentIcon = resolveIconKey(current, defaultIcon);
  onSelectCb = onSelect;
  currentCategory = 'all';
  returnFocusEl = returnFocus || document.activeElement;

  if (searchInput) searchInput.value = '';
  if (categorySelect) categorySelect.value = 'all';

  openModal();
  setTimeout(() => {
    searchInput?.focus();
    fillGridUntilScrollable(renderToken);
  }, 120);

  if (!allIcons.length) {
    void loadIcons();
  } else {
    populateCategoryFilter();
    resetGrid();
  }
}

export function updateIconTrigger(prefix, iconKey, fallback = 'ri-tools-line') {
  const key = resolveIconKey(iconKey, fallback);
  const hidden = document.getElementById(`${prefix}Icon`);
  if (hidden) hidden.value = key;

  const preview = document.getElementById(`${prefix}IconPreview`);
  if (preview) preview.innerHTML = renderIconPreviewHtml(key, fallback);

  const label = document.getElementById(`${prefix}IconLabel`);
  if (label) label.textContent = key;
}
