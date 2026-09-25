import { escapeHtml } from './dom.js';
import { normalizeCategoryKey } from './categoryClassOptions.js';

/**
 * Shared dual grid/list card layout (Categories-style).
 * Accent colours come from [data-cat-key] + :root CSS variables in globals.css.
 */
export function renderPaCatCard(opts) {
  const {
    idAttr,
    id,
    catKey = '',
    cardClass = '',
    bulkCheckbox = '',
    iconHtml,
    badge = '',
    title,
    slug,
    desc = '',
    countIcon = 'ri-file-list-line',
    countLabel,
    status = 'Active',
    dateLabel = 'Created',
    dateValue = '—',
    viewBtn = null,
    menuHtml,
  } = opts;

  const safeId = escapeHtml(String(id));
  const safeTitle = escapeHtml(title);
  const safeSlug = escapeHtml(slug);
  const safeCatKey = escapeHtml(normalizeCategoryKey(catKey));
  const descHtml = desc
    ? escapeHtml(desc)
    : '<em class="pa-cat-card__desc-empty">No description</em>';
  const safeCount = escapeHtml(countLabel);
  const safeStatus = escapeHtml(status);
  const safeDateLabel = escapeHtml(dateLabel);
  const safeDateValue = escapeHtml(dateValue);

  const viewBtnHtml = viewBtn
    ? `<button type="button" class="pa-cat-card__view-btn" ${idAttr}="${safeId}" aria-label="${escapeHtml(viewBtn.ariaLabel || viewBtn.label)}"><span>${escapeHtml(viewBtn.label)}</span><i class="ri-arrow-right-line"></i></button>`
    : '';

  const chevronHtml = viewBtn
    ? `<button type="button" class="pa-cat-card__chevron" ${idAttr}="${safeId}" aria-label="${escapeHtml(viewBtn.ariaLabel || viewBtn.label)}"><i class="ri-arrow-right-s-line"></i></button>`
    : '';

  const classes = ['pa-card', 'pa-cat-card', cardClass].filter(Boolean).join(' ');
  const catKeyAttr = safeCatKey ? ` data-cat-key="${safeCatKey}"` : '';

  return `<div class="${classes}" ${idAttr}="${safeId}"${catKeyAttr}>
    ${bulkCheckbox}
    <div class="pa-cat-card__bg" aria-hidden="true"></div>
    <div class="pa-cat-card__grid">
      <div class="pa-cat-card__top">
        <div class="pa-cat-card__icon">${iconHtml}</div>
        ${badge}
      </div>
      <h3 class="pa-cat-card__title" title="${safeTitle}">${safeTitle}</h3>
      <div class="pa-cat-card__slug"><span class="pa-cat-card__slug-mark" aria-hidden="true">◆</span>${safeSlug}</div>
      <p class="pa-cat-card__desc">${descHtml}</p>
      <div class="pa-cat-card__count"><i class="${countIcon}"></i><span>${safeCount}</span></div>
      <div class="pa-cat-card__footer${viewBtn ? '' : ' pa-cat-card__footer--solo'}">
        ${viewBtnHtml}
        <div class="pa-cat-card__footer-more">
          <button type="button" class="pa-action-btn pa-action-edit" ${idAttr}="${safeId}" title="Edit" aria-label="Edit ${safeTitle}"><i class="ri-pencil-line"></i></button>
          <button type="button" class="pa-action-btn pa-action-delete" ${idAttr}="${safeId}" title="Delete" aria-label="Delete ${safeTitle}"><i class="ri-delete-bin-line"></i></button>
          <button type="button" class="pa-action-btn pa-action-more" ${idAttr}="${safeId}" title="More options" aria-label="More options for ${safeTitle}"><i class="ri-more-2-fill"></i></button>
          ${menuHtml}
        </div>
      </div>
    </div>
    <div class="pa-cat-card__list">
      <div class="pa-cat-card__icon">${iconHtml}</div>
      <div class="pa-cat-card__list-main">
        <div class="pa-cat-card__title" title="${safeTitle}">${safeTitle}</div>
        <div class="pa-cat-card__slug"><span class="pa-cat-card__slug-mark" aria-hidden="true">◆</span>${safeSlug}</div>
        <div class="pa-cat-card__desc">${descHtml}</div>
      </div>
      <div class="pa-cat-card__count"><i class="${countIcon}"></i><span>${safeCount}</span></div>
      <div class="pa-cat-card__status">${safeStatus}</div>
      <div class="pa-cat-card__date">
        <i class="ri-calendar-line"></i>
        <div class="pa-cat-card__date-copy">
          <span class="pa-cat-card__date-label">${safeDateLabel}</span>
          <span class="pa-cat-card__date-value">${safeDateValue}</span>
        </div>
      </div>
      <div class="pa-cat-card__list-actions">
        <button type="button" class="pa-action-btn pa-action-edit" ${idAttr}="${safeId}" title="Edit" aria-label="Edit ${safeTitle}"><i class="ri-pencil-line"></i></button>
        <button type="button" class="pa-action-btn pa-action-delete" ${idAttr}="${safeId}" title="Delete" aria-label="Delete ${safeTitle}"><i class="ri-delete-bin-line"></i></button>
        <button type="button" class="pa-action-btn pa-action-more" ${idAttr}="${safeId}" title="More options" aria-label="More options for ${safeTitle}"><i class="ri-more-2-fill"></i></button>
        ${menuHtml}
      </div>
      ${chevronHtml}
    </div>
  </div>`;
}

export function attachPaCatCardViewListeners(grid, idAttr, onView) {
  if (!grid || !onView) return;
  grid.querySelectorAll('.pa-cat-card__view-btn, .pa-cat-card__chevron').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute(idAttr);
      if (id != null && id !== '') onView(id);
    });
  });
}
