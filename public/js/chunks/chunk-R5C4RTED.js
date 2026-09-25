import {
  formatDate,
  formatFileSize
} from "./chunk-3FVVIY3E.js";
import {
  escapeHtml
} from "./chunk-R5CPOL4O.js";

// client/utils/paMediaCard.ts
var FOLDER_LABELS = {
  general: "General",
  projects: "Project Screenshots",
  avatars: "Avatars & Profile",
  icons: "Icons & Logos",
  blog: "Blog Posts",
  testimonials: "Testimonials",
  contact: "Contact Attachments"
};
function getMediaKind(item) {
  const type = (item.type || "").toLowerCase();
  const name = (item.name || "").toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.includes("pdf") || type.includes("document") || type.includes("msword") || type.includes("spreadsheet") || type.includes("text/") || /\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx)$/i.test(name)) return "document";
  return "other";
}
var KIND_META = {
  image: { label: "Image", icon: "ri-image-line", class: "image" },
  video: { label: "Video", icon: "ri-play-circle-line", class: "video" },
  document: { label: "PDF", icon: "ri-file-pdf-line", class: "document" },
  other: { label: "Other", icon: "ri-file-zip-line", class: "other" }
};
function kindMeta(item) {
  const kind = getMediaKind(item);
  const meta = KIND_META[kind];
  if (kind === "document" && !(item.type || "").includes("pdf") && !/\.pdf$/i.test(item.name || "")) {
    return { ...meta, label: "Document", icon: "ri-file-text-line" };
  }
  if (kind === "other" && /\.(zip|rar|7z)$/i.test(item.name || "")) {
    return { ...meta, label: "ZIP", icon: "ri-file-zip-line" };
  }
  return meta;
}
function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
function videoDuration(item) {
  if (typeof item.duration === "number" && item.duration > 0) return formatDuration(item.duration);
  const seed = (Number(item.id) || 1) * 13 % 300;
  return formatDuration(seed + 45);
}
function isFeatured(item) {
  return item.featured === true || item.folder === "projects";
}
function renderThumb(item) {
  const kind = getMediaKind(item);
  if (kind === "image" || kind === "video" && item.url) {
    return `<img class="pa-media-card__img" src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt || item.name)}" loading="lazy" />`;
  }
  const meta = kindMeta(item);
  return `<div class="pa-media-card__placeholder pa-media-card__placeholder--${meta.class}"><i class="${meta.icon}"></i></div>`;
}
function renderCardMenu(item) {
  const id = item.id;
  return `<div class="pa-card-menu" data-media-id="${id}">
    <div class="pa-card-menu-item" data-action="copy-url" data-media-id="${id}"><i class="ri-links-line"></i> Copy URL</div>
    <div class="pa-card-menu-item" data-action="download" data-media-id="${id}"><i class="ri-download-2-line"></i> Download</div>
    <div class="pa-card-menu-item" data-action="duplicate" data-media-id="${id}"><i class="ri-file-copy-line"></i> Duplicate entry</div>
  </div>`;
}
function renderActions(item) {
  const id = item.id;
  const title = escapeHtml(item.name);
  return `<button type="button" class="pa-action-btn pa-action-view" data-media-id="${id}" title="Preview" aria-label="Preview ${title}"><i class="ri-eye-line"></i></button>
    <button type="button" class="pa-action-btn pa-action-edit" data-media-id="${id}" title="Edit details" aria-label="Edit ${title}"><i class="ri-pencil-line"></i></button>
    <button type="button" class="pa-action-btn pa-action-history" data-media-id="${id}" title="File history" aria-label="History for ${title}"><i class="ri-time-line"></i></button>
    <button type="button" class="pa-action-btn pa-action-delete" data-media-id="${id}" title="Delete" aria-label="Delete ${title}"><i class="ri-delete-bin-line"></i></button>`;
}
function renderMetaRow(item) {
  const uploaded = formatDate(item.uploadedAt);
  const size = formatFileSize(item.size, item.url);
  return `<div class="pa-media-card__meta-item"><i class="ri-calendar-line" aria-hidden="true"></i><span>${escapeHtml(uploaded)}</span></div>
    <div class="pa-media-card__meta-item"><i class="ri-download-2-line" aria-hidden="true"></i><span>${escapeHtml(size)}</span></div>`;
}
function renderListMeta(item) {
  const folderLabel = FOLDER_LABELS[item.folder] || item.folder || "General";
  const kind = kindMeta(item);
  const uploaded = formatDate(item.uploadedAt);
  const size = formatFileSize(item.size, item.url);
  const usage = item.usageCount > 0 ? `Used \xD7${item.usageCount}` : "Unused";
  return `<div class="pa-media-card__list-meta-item">
      <i class="ri-calendar-line" aria-hidden="true"></i>
      <span class="pa-media-card__meta-label">Uploaded</span>
      <span class="pa-media-card__meta-value">${escapeHtml(uploaded)}</span>
    </div>
    <div class="pa-media-card__list-meta-item">
      <i class="ri-database-2-line" aria-hidden="true"></i>
      <span class="pa-media-card__meta-label">Size</span>
      <span class="pa-media-card__meta-value">${escapeHtml(size)}</span>
    </div>
    <div class="pa-media-card__list-meta-item">
      <i class="${kind.icon}" aria-hidden="true"></i>
      <span class="pa-media-card__meta-label">Type</span>
      <span class="pa-media-card__meta-value">${escapeHtml(kind.label)}</span>
    </div>
    <div class="pa-media-card__list-meta-item">
      <i class="ri-links-line" aria-hidden="true"></i>
      <span class="pa-media-card__meta-label">Usage</span>
      <span class="pa-media-card__meta-value">${escapeHtml(usage)}</span>
    </div>`;
}
function renderPaMediaCard(item, opts = {}) {
  const {
    selectCheckbox = "",
    cardClass = "",
    animationDelay = 0,
    isSelected = false
  } = opts;
  const id = item.id;
  const title = escapeHtml(item.name);
  const folderLabel = FOLDER_LABELS[item.folder] || item.folder || "General";
  const kind = kindMeta(item);
  const thumbHtml = renderThumb(item);
  const menuHtml = renderCardMenu(item);
  const actionsHtml = renderActions(item);
  const metaRowHtml = renderMetaRow(item);
  const listMetaHtml = renderListMeta(item);
  const featuredBadge = isFeatured(item) ? '<span class="pa-media-card__featured"><i class="ri-star-fill"></i> FEATURED</span>' : "";
  const durationBadge = getMediaKind(item) === "video" ? `<span class="pa-media-card__duration">${videoDuration(item)}</span>` : "";
  const typeBadge = `<span class="pa-media-card__type-badge pa-media-card__type-badge--${kind.class}"><i class="${kind.icon}"></i> ${escapeHtml(kind.label)}</span>`;
  const altHtml = item.alt ? escapeHtml(item.alt) : '<em class="pa-media-card__desc-empty">No alt text set</em>';
  const selectedStyle = isSelected ? " pa-media-card--selected" : "";
  return `<div class="pa-card pa-media-card${selectedStyle}${cardClass}" data-media-id="${id}" style="animation-delay:${animationDelay}ms;">
    ${selectCheckbox}
    <div class="pa-media-card__grid">
      <div class="pa-media-card__thumb">
        <div class="pa-media-card__thumb-inner">${thumbHtml}</div>
        ${typeBadge}
        ${durationBadge}
        ${featuredBadge}
        <div class="pa-media-card__thumb-more">
          <button type="button" class="pa-action-btn pa-action-more" data-media-id="${id}" title="More options" aria-label="More options for ${title}"><i class="ri-more-2-fill"></i></button>
          ${menuHtml}
        </div>
      </div>
      <div class="pa-media-card__body">
        <h3 class="pa-media-card__name" title="${title}">${title}</h3>
        <div class="pa-media-card__meta-row">${metaRowHtml}</div>
        <div class="pa-media-card__footer">
          <div class="pa-media-card__actions">${actionsHtml}</div>
          <div class="pa-media-card__footer-more">
            <button type="button" class="pa-action-btn pa-action-more" data-media-id="${id}" title="More options" aria-label="More options for ${title}"><i class="ri-more-2-fill"></i></button>
            ${menuHtml}
          </div>
        </div>
      </div>
    </div>
    <div class="pa-media-card__list">
      <div class="pa-media-card__list-thumb">
        <div class="pa-media-card__thumb-inner">${thumbHtml}</div>
        ${featuredBadge}
      </div>
      <div class="pa-media-card__list-main">
        <div class="pa-media-card__list-top">
          <div class="pa-media-card__title-block">
            <h3 class="pa-media-card__name" title="${title}">${title}</h3>
            <div class="pa-media-card__folder"><i class="ri-folder-line"></i> ${escapeHtml(folderLabel)}</div>
          </div>
          <div class="pa-media-card__list-more">
            <button type="button" class="pa-action-btn pa-action-more" data-media-id="${id}" title="More options" aria-label="More options for ${title}"><i class="ri-more-2-fill"></i></button>
            ${menuHtml}
          </div>
        </div>
        <p class="pa-media-card__desc">${altHtml}</p>
        <div class="pa-media-card__tags">
          <span class="pa-media-card__tag pa-media-card__tag--${kind.class}">${escapeHtml(kind.label)}</span>
          <span class="pa-media-card__tag">${escapeHtml(formatFileSize(item.size, item.url))}</span>
        </div>
      </div>
      <div class="pa-media-card__list-meta">${listMetaHtml}</div>
      <div class="pa-media-card__list-actions">${actionsHtml}</div>
    </div>
  </div>`;
}

export {
  getMediaKind,
  renderPaMediaCard
};
