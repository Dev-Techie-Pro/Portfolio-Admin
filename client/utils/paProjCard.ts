import { escapeHtml } from './dom.js';
import { normalizeCategoryKey } from './categoryClassOptions.js';
import { formatDate } from './format.js';

const TECH_COLORS = {
  html: 'orange',
  css: 'blue',
  javascript: 'yellow',
  js: 'yellow',
  typescript: 'blue',
  ts: 'blue',
  react: 'purple',
  vue: 'green',
  angular: 'red',
  node: 'green',
  'node.js': 'green',
  next: 'white',
  'next.js': 'white',
  tailwind: 'teal',
  bootstrap: 'purple',
  sass: 'pink',
  scss: 'pink',
  python: 'yellow',
  django: 'green',
  php: 'purple',
  laravel: 'red',
  mysql: 'blue',
  postgresql: 'blue',
  mongodb: 'green',
  firebase: 'yellow',
  figma: 'purple',
  wordpress: 'blue',
};

const TECH_COLOR_CYCLE = ['orange', 'blue', 'yellow', 'purple', 'teal', 'green', 'pink'];

export function getProjectBucket(status) {
  const s = (status || 'Completed').trim();
  if (s === 'Completed') return 'published';
  if (s === 'On Hold' || s === 'Cancelled') return 'archived';
  return 'draft';
}

export function getProjectStatusLabel(status) {
  const bucket = getProjectBucket(status);
  if (bucket === 'published') return 'Published';
  if (bucket === 'archived') return 'Archived';
  return 'Draft';
}

export function getProjectStatusClass(status) {
  const bucket = getProjectBucket(status);
  if (bucket === 'published') return 'published';
  if (bucket === 'archived') return 'archived';
  return 'draft';
}

function techColorClass(tag, index) {
  const key = (tag || '').trim().toLowerCase();
  const color = TECH_COLORS[key] || TECH_COLOR_CYCLE[index % TECH_COLOR_CYCLE.length];
  return `pa-proj-tech--${color}`;
}

export const PROJECT_TAGS_VISIBLE = 3;

export function projectTechTagsHtml(tags, maxVisible = PROJECT_TAGS_VISIBLE) {
  const list = Array.isArray(tags) ? tags.filter(Boolean) : [];
  const visible = list.slice(0, maxVisible);
  const hidden = list.slice(maxVisible);
  let html = visible.map((t, i) => `<span class="pa-proj-tech ${techColorClass(t, i)}">${escapeHtml(t)}</span>`).join('');
  if (hidden.length > 0) {
    const moreTitle = escapeHtml(hidden.join(', '));
    html += `<span class="pa-proj-tech pa-proj-tech--more" title="${moreTitle}">+${hidden.length}</span>`;
  }
  return html;
}

function projectUpdatedAt(p) {
  return p.updatedAt || p.createdAt;
}

function renderCardMenu(p) {
  const id = p.id;
  return `<div class="pa-card-menu" data-id="${id}">
    <div class="pa-card-menu-item" data-action="duplicate" data-id="${id}"><i class="ri-file-copy-line"></i> Duplicate</div>
    <div class="pa-card-menu-item" data-action="copy-link" data-id="${id}"><i class="ri-link"></i> Copy live URL</div>
  </div>`;
}

function renderActions(p) {
  const id = p.id;
  const title = escapeHtml(p.title);
  return `<button type="button" class="pa-action-btn pa-action-view" title="View project" data-id="${id}" aria-label="View ${title}"><i class="ri-eye-line"></i></button>
    <button type="button" class="pa-action-btn pa-action-edit" title="Edit project" data-id="${id}" aria-label="Edit ${title}"><i class="ri-pencil-line"></i></button>
    <button type="button" class="pa-action-btn pa-action-duplicate" title="Duplicate project" data-id="${id}" aria-label="Duplicate ${title}"><i class="ri-file-copy-line"></i></button>
    <button type="button" class="pa-action-btn pa-action-delete" title="Delete project" data-id="${id}" aria-label="Delete ${title}"><i class="ri-delete-bin-line"></i></button>`;
}

function renderMeta(p) {
  const created = formatDate(p.createdAt);
  const updated = formatDate(projectUpdatedAt(p));

  return `<div class="pa-proj-card__meta-item">
      <div class="pa-proj-card__meta-item-head">
        <i class="ri-calendar-line" aria-hidden="true"></i>
        <span class="pa-proj-card__meta-label">Created</span>
      </div>
      <span class="pa-proj-card__meta-value">${escapeHtml(created)}</span>
    </div>
    <div class="pa-proj-card__meta-item">
      <div class="pa-proj-card__meta-item-head">
        <i class="ri-time-line" aria-hidden="true"></i>
        <span class="pa-proj-card__meta-label">Updated</span>
      </div>
      <span class="pa-proj-card__meta-value">${escapeHtml(updated)}</span>
    </div>`;
}

export function renderPaProjCard(p, opts = {}) {
  const {
    meta = { label: p.catKey, cls: '' },
    thumbHtml,
    bulkCheckbox = '',
    cardClass = '',
    animationDelay = 0,
  } = opts;

  const id = p.id;
  const title = escapeHtml(p.title);
  const category = escapeHtml(meta.label);
  const desc = escapeHtml(p.desc || '');
  const statusLabel = getProjectStatusLabel(p.status);
  const statusClass = getProjectStatusClass(p.status);
  const featuredBadge = p.featured
    ? '<span class="pa-proj-card__featured"><i class="ri-star-fill"></i> FEATURED</span>'
    : '';
  const statusBadge = `<span class="pa-proj-card__status pa-proj-card__status--${statusClass}"><span class="pa-proj-card__status-dot" aria-hidden="true"></span>${escapeHtml(statusLabel)}</span>`;
  const tagsHtml = projectTechTagsHtml(p.tags);
  const metaHtml = renderMeta(p);
  const actionsHtml = renderActions(p);
  const menuHtml = renderCardMenu(p);
  const catKey = escapeHtml(normalizeCategoryKey(p.catKey));

  return `<div class="pa-card pa-proj-card${cardClass}" data-id="${id}" data-cat-key="${catKey}" style="animation-delay:${animationDelay}ms;">
    ${bulkCheckbox}
    <div class="pa-proj-card__grid">
      <div class="pa-proj-card__thumb">
        <div class="pa-proj-card__thumb-inner">${thumbHtml}</div>
        ${featuredBadge}
        ${statusBadge}
      </div>
      <div class="pa-proj-card__body">
        <div class="pa-proj-card__head">
          <div class="pa-proj-card__title-wrap">
            <span class="pa-proj-card__type-icon" aria-hidden="true"><i class="ri-window-line"></i></span>
            <div class="pa-proj-card__title-block">
              <h3 class="pa-proj-card__title" title="${title}">${title}</h3>
              <div class="pa-proj-card__category"><i class="ri-price-tag-3-line"></i> ${category}</div>
            </div>
          </div>
          <div class="pa-proj-card__head-more">
            <button type="button" class="pa-action-btn pa-action-more" data-id="${id}" title="More options" aria-label="More options for ${title}"><i class="ri-more-2-fill"></i></button>
            ${menuHtml}
          </div>
        </div>
        <p class="pa-proj-card__desc">${desc}</p>
        <div class="pa-proj-card__tags">${tagsHtml}</div>
        <div class="pa-proj-card__meta fr-2">${metaHtml}</div>
        <div class="pa-proj-card__footer">
          <div class="pa-proj-card__actions">${actionsHtml}</div>
        </div>
      </div>
    </div>
    <div class="pa-proj-card__list">
      <div class="pa-proj-card__list-thumb">
        <div class="pa-proj-card__thumb-inner">${thumbHtml}</div>
        ${featuredBadge}
      </div>
      <div class="pa-proj-card__list-main">
        <div class="pa-proj-card__list-top">
          <div class="pa-proj-card__title-block">
            <h3 class="pa-proj-card__title" title="${title}">${title}</h3>
            <div class="pa-proj-card__category"><i class="ri-price-tag-3-line"></i> ${category}</div>
          </div>
          <div class="pa-proj-card__list-status-wrap">
            ${statusBadge}
            <div class="pa-proj-card__list-more">
              <button type="button" class="pa-action-btn pa-action-more" data-id="${id}" title="More options" aria-label="More options for ${title}"><i class="ri-more-2-fill"></i></button>
              ${menuHtml}
            </div>
          </div>
        </div>
        <p class="pa-proj-card__desc">${desc}</p>
        <div class="pa-proj-card__tags">${tagsHtml}</div>
      </div>
      <div class="pa-proj-card__list-meta fr-2">${metaHtml}</div>
      <div class="pa-proj-card__list-actions">${actionsHtml}</div>
    </div>
  </div>`;
}
