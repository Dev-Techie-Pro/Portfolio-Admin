import { escapeHtml } from './dom.js';
import { formatDate } from './format.js';
import { normalizeCategoryKey } from './categoryClassOptions.js';

export function getBlogStatusClass(status) {
  return (status || 'Draft') === 'Published' ? 'published' : 'draft';
}

function blogTagsHtml(tags, maxVisible = 4) {
  const list = Array.isArray(tags) ? tags : [];
  const visible = list.slice(0, maxVisible);
  const extra = list.length - visible.length;
  let html = visible.map((t) => `<span class="pa-proj-tech pa-proj-tech--blue">${escapeHtml(t)}</span>`).join('');
  if (extra > 0) html += `<span class="pa-proj-tech pa-proj-tech--more">+${extra}</span>`;
  return html;
}

function renderCardMenu(p, idAttr) {
  const id = p.id;
  const title = escapeHtml(p.title);
  return `<div class="pa-card-menu" ${idAttr}="${id}">
    <div class="pa-card-menu-item" data-action="duplicate" ${idAttr}="${id}"><i class="ri-file-copy-line"></i> Duplicate</div>
    <div class="pa-card-menu-item" data-action="copy-slug" ${idAttr}="${id}"><i class="ri-links-line"></i> Copy slug URL</div>
  </div>`;
}

function renderActions(p, idAttr) {
  const id = p.id;
  const title = escapeHtml(p.title);
  return `<button type="button" class="pa-action-btn pa-action-edit" title="Edit post" ${idAttr}="${id}" aria-label="Edit ${title}"><i class="ri-pencil-line"></i></button>
    <button type="button" class="pa-action-btn pa-action-delete" title="Delete post" ${idAttr}="${id}" aria-label="Delete ${title}"><i class="ri-delete-bin-line"></i></button>`;
}

function renderMeta(p) {
  const published = formatDate(p.publishedAt || p.createdAt);
  const slug = escapeHtml(p.slug || '—');
  const tagCount = Array.isArray(p.tags) ? p.tags.length : 0;
  return `<div class="pa-proj-card__meta-item">
      <i class="ri-calendar-line" aria-hidden="true"></i>
      <span class="pa-proj-card__meta-label">Published</span>
      <span class="pa-proj-card__meta-value">${escapeHtml(published)}</span>
    </div>
    <div class="pa-proj-card__meta-item">
      <i class="ri-link" aria-hidden="true"></i>
      <span class="pa-proj-card__meta-label">Slug</span>
      <span class="pa-proj-card__meta-value">${slug}</span>
    </div>
    <div class="pa-proj-card__meta-item">
      <i class="ri-price-tag-3-line" aria-hidden="true"></i>
      <span class="pa-proj-card__meta-label">Tags</span>
      <span class="pa-proj-card__meta-value">${tagCount}</span>
    </div>
    <div class="pa-proj-card__meta-item pa-proj-card__meta-item--demo">
      <i class="ri-article-line" aria-hidden="true"></i>
      <span class="pa-proj-card__meta-label">Status</span>
      <span class="pa-proj-card__meta-value">${escapeHtml(p.status || 'Draft')}</span>
    </div>`;
}

export function renderPaBlogCard(p, opts = {}) {
  const {
    meta = { label: p.category, cls: '' },
    thumbHtml,
    bulkCheckbox = '',
    cardClass = '',
    animationDelay = 0,
    idAttr = 'data-blog-id',
  } = opts;

  const id = p.id;
  const title = escapeHtml(p.title);
  const category = escapeHtml(meta.label || p.category || '—');
  const desc = escapeHtml(p.excerpt || '');
  const statusClass = getBlogStatusClass(p.status);
  const statusLabel = p.status || 'Draft';
  const featuredBadge = p.featured
    ? '<span class="pa-proj-card__featured"><i class="ri-star-fill"></i> FEATURED</span>'
    : '';
  const statusBadge = `<span class="pa-proj-card__status pa-proj-card__status--${statusClass}"><span class="pa-proj-card__status-dot" aria-hidden="true"></span>${escapeHtml(statusLabel)}</span>`;
  const tagsHtml = blogTagsHtml(p.tags);
  const metaHtml = renderMeta(p);
  const actionsHtml = renderActions(p, idAttr);
  const menuHtml = renderCardMenu(p, idAttr);
  const catKey = escapeHtml(normalizeCategoryKey(meta.catKey || p.category));

  return `<div class="pa-card pa-proj-card pa-blog-card${cardClass}" ${idAttr}="${id}" data-cat-key="${catKey}" style="animation-delay:${animationDelay}ms;">
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
            <span class="pa-proj-card__type-icon" aria-hidden="true"><i class="ri-article-line"></i></span>
            <div class="pa-proj-card__title-block">
              <h3 class="pa-proj-card__title" title="${title}">${title}</h3>
              <div class="pa-proj-card__category"><i class="ri-price-tag-3-line"></i> ${category}</div>
            </div>
          </div>
          <div class="pa-proj-card__head-more">
            <button type="button" class="pa-action-btn pa-action-more" ${idAttr}="${id}" title="More options" aria-label="More options for ${title}"><i class="ri-more-2-fill"></i></button>
            ${menuHtml}
          </div>
        </div>
        <p class="pa-proj-card__desc">${desc}</p>
        <div class="pa-proj-card__tags">${tagsHtml}</div>
        <div class="pa-proj-card__meta">${metaHtml}</div>
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
              <button type="button" class="pa-action-btn pa-action-more" ${idAttr}="${id}" title="More options" aria-label="More options for ${title}"><i class="ri-more-2-fill"></i></button>
              ${menuHtml}
            </div>
          </div>
        </div>
        <p class="pa-proj-card__desc">${desc}</p>
        <div class="pa-proj-card__tags">${tagsHtml}</div>
      </div>
      <div class="pa-proj-card__list-meta">${metaHtml}</div>
      <div class="pa-proj-card__list-actions">${actionsHtml}</div>
    </div>
  </div>`;
}
