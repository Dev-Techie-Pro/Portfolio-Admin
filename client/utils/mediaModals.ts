import { $id, escapeHtml } from './dom.js';
import { formatDate, formatFileSize } from './format.js';
import { getMediaKind } from './paMediaCard.js';

const FOLDER_LABELS = {
  general: 'General',
  projects: 'Project Screenshots',
  avatars: 'Avatars & Profile',
  icons: 'Icons & Logos',
  blog: 'Blog Posts',
  testimonials: 'Testimonials',
  contact: 'Contact Attachments',
};

const KIND_ICONS = {
  image: 'ri-image-line',
  video: 'ri-play-circle-line',
  document: 'ri-file-text-line',
  other: 'ri-file-zip-line',
};

function updateBodyLock() {
  const open = $id('paMediaPreviewOverlay')?.classList.contains('visible')
    || $id('paMediaHistoryOverlay')?.classList.contains('visible');
  document.body.classList.toggle('pa-media-modal-open', !!open);
}

function setVisible(overlay, visible) {
  if (!overlay) return;
  overlay.classList.toggle('visible', visible);
  overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
  updateBodyLock();
}

export function closeMediaPreviewModal() {
  setVisible($id('paMediaPreviewOverlay'), false);
}

export function closeMediaHistoryModal() {
  setVisible($id('paMediaHistoryOverlay'), false);
}

export function closeAllMediaModals() {
  closeMediaPreviewModal();
  closeMediaHistoryModal();
}

function renderPreviewContent(item) {
  const kind = getMediaKind(item);
  if (kind === 'image') {
    return `<img class="pa-media-preview-img" src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt || item.name)}" />`;
  }
  if (kind === 'video') {
    return `<video class="pa-media-preview-video" src="${escapeHtml(item.url)}" controls playsinline></video>`;
  }
  const icon = KIND_ICONS[kind] || 'ri-file-line';
  return `<div class="pa-media-preview-fallback">
    <i class="${icon}"></i>
    <p>Preview not available for this file type.</p>
    <a class="pa-btn pa-btn-primary" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Open file</a>
  </div>`;
}

export function openMediaPreviewModal(item) {
  const overlay = $id('paMediaPreviewOverlay');
  const title = $id('paMediaPreviewTitle');
  const sub = $id('paMediaPreviewSub');
  const body = $id('paMediaPreviewBody');
  const meta = $id('paMediaPreviewMeta');
  if (!overlay || !body) return;

  closeMediaHistoryModal();

  const folderLabel = FOLDER_LABELS[item.folder] || item.folder || 'General';
  const kind = getMediaKind(item);
  const typeLabel = (item.type || kind).replace('image/', '').replace('video/', '').toUpperCase() || kind.toUpperCase();

  if (title) title.textContent = item.name || 'Preview';
  if (sub) sub.textContent = `${folderLabel} · ${typeLabel}`;
  body.innerHTML = renderPreviewContent(item);
  if (meta) {
    meta.innerHTML = `
      <span><i class="ri-calendar-line"></i> ${escapeHtml(formatDate(item.uploadedAt))}</span>
      <span><i class="ri-database-2-line"></i> ${escapeHtml(formatFileSize(item.size, item.url))}</span>
      ${item.alt ? `<span><i class="ri-text"></i> ${escapeHtml(item.alt)}</span>` : ''}`;
  }

  setVisible(overlay, true);
  $id('paMediaPreviewClose')?.focus();
}

export function openMediaHistoryModal(item, usageRefs = []) {
  const overlay = $id('paMediaHistoryOverlay');
  const title = $id('paMediaHistoryTitle');
  const sub = $id('paMediaHistorySub');
  const body = $id('paMediaHistoryBody');
  if (!overlay || !body) return;

  closeMediaPreviewModal();

  const folderLabel = FOLDER_LABELS[item.folder] || item.folder || 'General';
  const usageCount = usageRefs.length;

  if (title) title.textContent = 'File History';
  if (sub) sub.textContent = item.name || 'Media file';

  const usageHtml = usageCount > 0
    ? usageRefs.map((ref) => `
      <a class="pa-media-history-usage-item" href="${escapeHtml(ref.path)}">
        <span class="pa-media-history-usage-icon"><i class="${escapeHtml(ref.icon)}"></i></span>
        <span class="pa-media-history-usage-copy">
          <span class="pa-media-history-usage-type">${escapeHtml(ref.type)}</span>
          <span class="pa-media-history-usage-label">${escapeHtml(ref.label)}</span>
          ${ref.detail ? `<span class="pa-media-history-usage-detail">${escapeHtml(ref.detail)}</span>` : ''}
        </span>
        <i class="ri-arrow-right-s-line pa-media-history-usage-arrow" aria-hidden="true"></i>
      </a>`).join('')
    : `<div class="pa-media-history-empty"><i class="ri-links-line"></i><p>This file is not linked to any portfolio content yet.</p></div>`;

  body.innerHTML = `
    <div class="pa-media-history-section">
      <div class="pa-media-history-section-title"><i class="ri-time-line"></i> Upload details</div>
      <div class="pa-media-history-timeline">
        <div class="pa-media-history-event">
          <span class="pa-media-history-event-dot" aria-hidden="true"></span>
          <div class="pa-media-history-event-copy">
            <span class="pa-media-history-event-label">Uploaded</span>
            <span class="pa-media-history-event-value">${escapeHtml(formatDate(item.uploadedAt))}</span>
          </div>
        </div>
        <div class="pa-media-history-event">
          <span class="pa-media-history-event-dot" aria-hidden="true"></span>
          <div class="pa-media-history-event-copy">
            <span class="pa-media-history-event-label">Folder</span>
            <span class="pa-media-history-event-value">${escapeHtml(folderLabel)}</span>
          </div>
        </div>
        <div class="pa-media-history-event">
          <span class="pa-media-history-event-dot" aria-hidden="true"></span>
          <div class="pa-media-history-event-copy">
            <span class="pa-media-history-event-label">File size</span>
            <span class="pa-media-history-event-value">${escapeHtml(formatFileSize(item.size, item.url))}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="pa-media-history-section">
      <div class="pa-media-history-section-title"><i class="ri-links-line"></i> Used in (${usageCount})</div>
      <div class="pa-media-history-usage-list">${usageHtml}</div>
    </div>`;

  setVisible(overlay, true);
  $id('paMediaHistoryClose')?.focus();
}

export function bindMediaModalEvents(handlers = {}) {
  const previewOverlay = $id('paMediaPreviewOverlay');
  const historyOverlay = $id('paMediaHistoryOverlay');

  $id('paMediaPreviewClose')?.addEventListener('click', () => closeMediaPreviewModal());
  $id('paMediaHistoryClose')?.addEventListener('click', () => closeMediaHistoryModal());

  previewOverlay?.addEventListener('click', (e) => {
    if (e.target === previewOverlay) closeMediaPreviewModal();
  });
  historyOverlay?.addEventListener('click', (e) => {
    if (e.target === historyOverlay) closeMediaHistoryModal();
  });

  if (handlers.onEscape) {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!previewOverlay?.classList.contains('visible') && !historyOverlay?.classList.contains('visible')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      closeAllMediaModals();
    }, true);
  }
}
