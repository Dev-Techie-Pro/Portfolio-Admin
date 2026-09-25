import { Module } from '../../core/Module.js';
import { $id, $all, escapeHtml } from '../../utils/dom.js';
import { formatFileSize, formatDate } from '../../utils/format.js';
import { appendCopySuffix } from '../../utils/strings.js';
import { readFileAsDataUrl, handleFileValidation } from '../../utils/files.js';
import { requestDelete, requestBulkAction } from '../../modules/shell/confirm.js';
import { closeAllCardMenus, toggleCardMenu } from '../../modules/shell/cardMenu.js';
import { renderPaMediaCard, getMediaKind } from '../../utils/paMediaCard.js';
import { findMediaUsage } from '../../utils/mediaUsage.js';
import {
  openMediaPreviewModal, openMediaHistoryModal, bindMediaModalEvents,
} from '../../utils/mediaModals.js';
import { openPanel, closePanels, registerPanel } from '../../modules/shell/panels.js';
import { PAGE } from '../../core/router.js';
import { eventBus } from '../../core/EventBus.js';
import { storage } from '../../core/StorageService.js';

export const FOLDER_META = {
  general: { label: 'General', icon: 'ri-folder-line', color: '#9a9aa0', path: '/media-library' },
  projects: { label: 'Project Screenshots', icon: 'ri-apps-line', color: '#60a5fa', path: '/projects' },
  avatars: { label: 'Avatars & Profile', icon: 'ri-user-3-line', color: '#a78bfa', path: '/settings/profile' },
  icons: { label: 'Icons & Logos', icon: 'ri-shapes-line', color: '#34d399', path: '/tools' },
  blog: { label: 'Blog Posts', icon: 'ri-article-line', color: '#fb923c', path: '/blog-post' },
  testimonials: { label: 'Testimonials', icon: 'ri-chat-quote-line', color: '#f472b6', path: '/testimonials' },
  contact: { label: 'Contact Attachments', icon: 'ri-mail-line', color: '#38bdf8', path: '/contact-messages' },
};

export const SEED_MEDIA = [];

const PAGE_SIZE = 12;
const FOLDER_ORDER = ['projects', 'blog', 'contact', 'testimonials', 'avatars', 'icons', 'general'];

function folderRank(folder) {
  const idx = FOLDER_ORDER.indexOf(folder || 'general');
  return idx === -1 ? FOLDER_ORDER.length : idx;
}

function urlKey(url) {
  return String(url || '').trim();
}

function countInMonth(records, monthOffset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
  return records.filter((m) => {
    const t = m.uploadedAt ? new Date(m.uploadedAt).getTime() : NaN;
    return !Number.isNaN(t) && t >= start.getTime() && t < end.getTime();
  }).length;
}

function setStatTrend(elId, records, predicate) {
  const el = $id(elId);
  if (!el) return;
  const filtered = predicate ? records.filter(predicate) : records;
  const current = countInMonth(filtered, 0);
  const previous = countInMonth(filtered, -1);
  let pct = 0;
  if (previous > 0) pct = Math.round(((current - previous) / previous) * 100);
  else if (current > 0) pct = 100;
  if (pct > 0) {
    el.className = 'pa-dash-stat-change up';
    el.innerHTML = `<i class="ri-arrow-up-line"></i> +${pct}%`;
  } else if (pct < 0) {
    el.className = 'pa-dash-stat-change down';
    el.innerHTML = `<i class="ri-arrow-down-line"></i> ${pct}%`;
  } else {
    el.className = 'pa-dash-stat-change neutral';
    el.innerHTML = `<i class="ri-subtract-line"></i> 0%`;
  }
}

export class MediaModule extends Module {
  constructor() {
    super({
      name: 'Media',
      storageKey: 'pa_media_library',
      initialState: {
        records: [], searchQuery: '', folderFilter: 'all', typeFilter: 'all', sortBy: 'newest',
        viewMode: 'grid', page: 1, selectMode: false, selectedIds: new Set(),
      },
    });
    this.nextId = 1;
    this.currentEditId = null;
    this.stagedFiles = [];
    this.editPendingImage = null;
    this.editOriginalImage = null;
    this._entityByUrl = null;
  }

  async load() {
    try {
      await fetch('/api/media/sync', { method: 'POST', credentials: 'same-origin' });
      storage.invalidate('pa_media_library');
    } catch {
      // Non-fatal — still load cached media records.
    }
    const records = await this.loadRecords(() => []);
    this.nextId = Math.max(0, ...records.map((m) => m.id)) + 1;
    this.store.set('records', records);
    this._entityByUrl = null;
  }

  syncFolderSelects() {
    const options = FOLDER_ORDER
      .map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(FOLDER_META[key].label)}</option>`)
      .join('');

    const folderFilter = $id('paFolderFilter');
    if (folderFilter) {
      const current = folderFilter.value || 'all';
      folderFilter.innerHTML = `<option value="all">All Folders</option>${options}`;
      folderFilter.value = [...folderFilter.options].some((opt) => opt.value === current) ? current : 'all';
    }

    const uploadFolder = $id('paUploadFolder');
    if (uploadFolder) {
      const current = uploadFolder.value || 'general';
      uploadFolder.innerHTML = options;
      uploadFolder.value = [...uploadFolder.options].some((opt) => opt.value === current) ? current : 'general';
    }

    const editFolder = $id('paEditFolder');
    if (editFolder) {
      const current = editFolder.value || 'general';
      editFolder.innerHTML = options;
      editFolder.value = [...editFolder.options].some((opt) => opt.value === current) ? current : 'general';
    }
  }

  async persist() {
    await this.saveRecords(this.store.get('records'));
    this._entityByUrl = null;
    await Promise.all([
      storage.get('pa_projects', []),
      storage.get('pa_blog_posts', []),
      storage.get('pa_testimonials', []),
      storage.get('pa_tools', []),
      storage.get('pa_contact_messages', []),
    ].map((promise) => promise.catch(() => [])));
  }

  async ensureEntityIndex() {
    if (this._entityByUrl) return this._entityByUrl;

    const [projects, testimonials, blogPosts, tools, contactMessages] = await Promise.all([
      storage.get('pa_projects', []),
      storage.get('pa_testimonials', []),
      storage.get('pa_blog_posts', []),
      storage.get('pa_tools', []),
      storage.get('pa_contact_messages', []),
    ]);

    const map = new Map();
    const setUrl = (url, entry) => {
      const key = urlKey(url);
      if (!key || map.has(key)) return;
      map.set(key, entry);
    };

    if (Array.isArray(projects)) {
      projects.forEach((p) => {
        const label = p.title || 'Untitled project';
        const base = {
          type: 'Project',
          label,
          folder: 'projects',
          path: '/projects',
          icon: 'ri-apps-line',
        };
        setUrl(p.bannerImgUrl || p.imageUrl, { ...base, detail: 'Featured image' });
        if (Array.isArray(p.gallery)) {
          p.gallery.forEach((g, i) => {
            const gUrl = typeof g === 'string' ? g : g?.url;
            setUrl(gUrl, { ...base, detail: `Gallery image ${i + 1}`, icon: 'ri-gallery-line' });
          });
        }
      });
    }

    if (Array.isArray(blogPosts)) {
      blogPosts.forEach((b) => {
        setUrl(b.imageUrl, {
          type: 'Blog Post',
          label: b.title || 'Untitled post',
          folder: 'blog',
          path: '/blog-post',
          icon: 'ri-article-line',
          detail: 'Cover image',
        });
      });
    }

    if (Array.isArray(testimonials)) {
      testimonials.forEach((t) => {
        setUrl(t.imageUrl, {
          type: 'Testimonial',
          label: t.name || 'Untitled testimonial',
          folder: 'testimonials',
          path: '/testimonials',
          icon: 'ri-chat-quote-line',
          detail: 'Avatar image',
        });
      });
    }

    if (Array.isArray(tools)) {
      tools.forEach((tool) => {
        const label = tool.name || tool.title || 'Untitled tool';
        setUrl(tool.iconUrl || tool.imageUrl, {
          type: 'Tool',
          label,
          folder: 'icons',
          path: '/tools',
          icon: 'ri-tools-line',
          detail: 'Tool icon',
        });
      });
    }

    if (Array.isArray(contactMessages)) {
      contactMessages.forEach((message) => {
        const label = message.name || message.subject || 'Contact message';
        const replies = Array.isArray(message.replies) ? message.replies : [];
        replies.forEach((reply, index) => {
          if (!reply?.attachmentUrl) return;
          setUrl(reply.attachmentUrl, {
            type: 'Contact Reply',
            label,
            folder: 'contact',
            path: '/contact-messages',
            icon: 'ri-mail-line',
            detail: `Reply attachment ${index + 1}`,
          });
        });
      });
    }

    this._entityByUrl = map;
    return map;
  }

  getGroupInfo(item) {
    const folder = item.folder || 'general';
    const folderMeta = FOLDER_META[folder] || FOLDER_META.general;
    const entity = this._entityByUrl?.get(urlKey(item.url));

    if (entity) {
      return {
        key: `${folder}::entity::${entity.type}::${entity.label}`,
        title: entity.label,
        subtitle: folderMeta.label,
        icon: entity.icon || folderMeta.icon,
        path: entity.path || folderMeta.path,
        folder,
      };
    }

    return {
      key: `${folder}::folder`,
      title: folderMeta.label,
      subtitle: null,
      icon: folderMeta.icon,
      path: folderMeta.path,
      folder,
    };
  }

  renderGroupHeading(group, count) {
    const title = escapeHtml(group.title);
    const subtitle = group.subtitle ? `<span class="pa-media-group-heading__sub">${escapeHtml(group.subtitle)}</span>` : '';
    const countLabel = `${count} file${count === 1 ? '' : 's'}`;
    const path = escapeHtml(group.path || '/media-library');
    return `<div class="pa-media-group-heading" data-media-group="${escapeHtml(group.key)}">
      <div class="pa-media-group-heading__main">
        <i class="${escapeHtml(group.icon)}" aria-hidden="true"></i>
        <div class="pa-media-group-heading__copy">
          <h2 class="pa-media-group-heading__title">${title}</h2>
          ${subtitle}
        </div>
        <span class="pa-media-group-heading__count">${escapeHtml(countLabel)}</span>
      </div>
      <a class="pa-media-group-heading__link" href="${path}">
        Open <i class="ri-arrow-right-line"></i>
      </a>
    </div>`;
  }

  renderGroupedCards(pageItems, allFiltered) {
    if (!pageItems.length) return '';

    const countByKey = {};
    allFiltered.forEach((item) => {
      const key = this.getGroupInfo(item).key;
      countByKey[key] = (countByKey[key] || 0) + 1;
    });

    const groups = [];
    for (const item of pageItems) {
      const info = this.getGroupInfo(item);
      const last = groups[groups.length - 1];
      if (last && last.key === info.key) {
        last.items.push(item);
      } else {
        groups.push({ ...info, items: [item] });
      }
    }

    let cardIndex = 0;
    return groups.map((group) => {
      const heading = this.renderGroupHeading(group, countByKey[group.key] || group.items.length);
      const cards = group.items.map((item) => this.buildCard(item, cardIndex++)).join('');
      return `${heading}${cards}`;
    }).join('');
  }

  getFiltered() {
    const { records, searchQuery, folderFilter, typeFilter, sortBy } = this.store._raw;
    let result = records.slice();
    if (folderFilter !== 'all') result = result.filter((m) => m.folder === folderFilter);
    if (typeFilter === 'images') result = result.filter((m) => getMediaKind(m) === 'image');
    else if (typeFilter === 'videos') result = result.filter((m) => getMediaKind(m) === 'video');
    else if (typeFilter === 'documents') result = result.filter((m) => getMediaKind(m) === 'document');
    else if (typeFilter === 'others') result = result.filter((m) => getMediaKind(m) === 'other');
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (m) => m.name.toLowerCase().includes(q) || (m.alt || '').toLowerCase().includes(q) || (FOLDER_META[m.folder]?.label || m.folder).toLowerCase().includes(q),
      );
    }

    const sortByValue = sortBy || 'newest';
    return result.sort((a, b) => {
      const byFolder = folderRank(a.folder) - folderRank(b.folder);
      if (byFolder !== 0) return byFolder;

      if (this._entityByUrl) {
        const groupA = this.getGroupInfo(a);
        const groupB = this.getGroupInfo(b);
        const byGroup = String(groupA.title).localeCompare(String(groupB.title), undefined, { sensitivity: 'base' });
        if (byGroup !== 0) return byGroup;
        if (groupA.key !== groupB.key) return groupA.key.localeCompare(groupB.key);
      }

      switch (sortByValue) {
        case 'oldest':
          return new Date(a.uploadedAt) - new Date(b.uploadedAt);
        case 'name':
          return String(a.name || '').localeCompare(String(b.name || ''));
        case 'size':
          return (b.size || 0) - (a.size || 0);
        default:
          return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      }
    });
  }

  renderStats() {
    const records = this.store.get('records');
    const set = (id, val) => { const el = $id(id); if (el) el.textContent = val; };
    const images = records.filter((m) => getMediaKind(m) === 'image').length;
    const videos = records.filter((m) => getMediaKind(m) === 'video').length;
    const documents = records.filter((m) => getMediaKind(m) === 'document').length;
    const others = records.filter((m) => getMediaKind(m) === 'other').length;
    set('paMediaStatTotal', records.length);
    set('paMediaStatImages', images);
    set('paMediaStatVideos', videos);
    set('paMediaStatDocuments', documents);
    set('paMediaStatOthers', others);
    setStatTrend('paMediaStatTotalTrend', records);
    setStatTrend('paMediaStatImagesTrend', records, (m) => getMediaKind(m) === 'image');
    setStatTrend('paMediaStatVideosTrend', records, (m) => getMediaKind(m) === 'video');
    setStatTrend('paMediaStatDocumentsTrend', records, (m) => getMediaKind(m) === 'document');
    setStatTrend('paMediaStatOthersTrend', records, (m) => getMediaKind(m) === 'other');
  }

  syncTypeFilter() {
    const el = $id('paTypeFilter');
    if (el) el.value = this.store.get('typeFilter') || 'all';
  }

  findById(id) { return this.store.get('records').find((m) => m.id === id); }

  buildCard(item, index) {
    const selectMode = this.store.get('selectMode');
    const isSelected = this.store.get('selectedIds').has(item.id);
    const checkboxHtml = selectMode
      ? `<button type="button" class="pa-media-card__select" data-select-id="${item.id}" role="checkbox" aria-checked="${isSelected}" aria-label="Select ${escapeHtml(item.name)}"><i class="${isSelected ? 'ri-checkbox-fill' : 'ri-checkbox-blank-line'}"></i></button>`
      : '';
    return renderPaMediaCard(item, {
      selectCheckbox: checkboxHtml,
      isSelected,
      animationDelay: Math.min(index, 11) * 35,
    });
  }

  async render() {
    await this.ensureEntityIndex();
    this.renderStats();
    this.syncTypeFilter();

    const sortEl = $id('paMediaSort');
    const sortVal = this.store.get('sortBy') || 'newest';
    if (sortEl && sortEl.value !== sortVal) sortEl.value = sortVal;

    const all = this.getFiltered();
    const totalItems = all.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    let page = this.store.get('page');
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    this.store.set('page', page);

    const start = (page - 1) * PAGE_SIZE;
    const pageItems = all.slice(start, start + PAGE_SIZE);
    const grid = $id('paMediaGrid');
    if (grid) {
      grid.classList.toggle('list-view', this.store.get('viewMode') === 'list');
      if (pageItems.length === 0) {
        const hasFilters = this.store.get('searchQuery').trim() || this.store.get('folderFilter') !== 'all' || this.store.get('typeFilter') !== 'all';
        grid.innerHTML = `<div class="pa-empty-state"><i class="ri-image-line"></i><div class="pa-empty-state-title">${hasFilters ? 'No media matches your filters' : 'No media files yet'}</div><div class="pa-empty-state-text">${hasFilters ? "Try adjusting your search or folder filter to find what you're looking for." : 'Upload your first image to start building your media library.'}</div>${hasFilters ? `<button class="pa-empty-state-btn" id="paMediaEmptyResetBtn">Reset filters</button>` : `<button class="pa-empty-state-btn" id="paMediaEmptyUploadBtn">+ Upload Media</button>`}</div>`;
        this.on($id('paMediaEmptyResetBtn'), 'click', () => this.resetFilters());
        this.on($id('paMediaEmptyUploadBtn'), 'click', () => this.openUploadPanel());
      } else {
        grid.innerHTML = this.renderGroupedCards(pageItems, all);
      }
    }

    this.renderPagination(totalItems, totalPages, page);
    this.attachCardListeners();
    this.updateBulkBar();
    this.setViewModeFromStore();
  }

  setViewModeFromStore() {
    const mode = this.store.get('viewMode') || 'grid';
    
    const gridBtn = $id('paGridViewBtn');
    const listBtn = $id('paListViewBtn');
    
    if (gridBtn) {
      gridBtn.classList.toggle('active', mode === 'grid');
    }
    if (listBtn) {
      listBtn.classList.toggle('active', mode === 'list');
    }
    
    document.querySelectorAll('.pa-view-btn[data-view]').forEach(btn => {
      const view = btn.dataset.view;
      if (view === 'grid') {
        btn.classList.toggle('active', mode === 'grid');
      } else if (view === 'list') {
        btn.classList.toggle('active', mode === 'list');
      }
    });
  }

  renderPagination(totalItems, totalPages, page) {
    const btnsWrap = $id('paMediaPaginationBtns');
    const info = $id('paMediaPaginationInfo');
    if (!btnsWrap || !info) return;
    if (totalItems === 0) { btnsWrap.innerHTML = ''; info.textContent = 'Showing 0 of 0 files'; return; }

    let html = `<div class="pa-page-nav ${page === 1 ? 'disabled' : ''}" id="paMediaPagePrev" role="button" aria-label="Previous page"><i class="ri-arrow-left-s-line"></i></div>`;
    let lastShown = 0;
    for (let p = 1; p <= totalPages; p++) {
      const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
      if (!show) continue;
      if (p - lastShown > 1) html += `<span style="color:var(--pa-text-faint);padding:0 4px;font-size:12px;">…</span>`;
      html += `<button class="pa-page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
      lastShown = p;
    }
    html += `<div class="pa-page-nav ${page === totalPages ? 'disabled' : ''}" id="paMediaPageNext" role="button" aria-label="Next page"><i class="ri-arrow-right-s-line"></i></div>`;
    btnsWrap.innerHTML = html;

    const startN = (page - 1) * PAGE_SIZE + 1;
    const endN = Math.min(page * PAGE_SIZE, totalItems);
    info.textContent = `Showing ${startN} to ${endN} of ${totalItems} files`;

    btnsWrap.querySelectorAll('.pa-page-btn').forEach((btn) => {
      btn.addEventListener('click', () => { this.store.set('page', parseInt(btn.dataset.page, 10)); this.render(); $id('paMediaBody')?.scrollTo({ top: 0, behavior: 'smooth' }); });
    });
    const prev = $id('paMediaPagePrev');
    const next = $id('paMediaPageNext');
    if (prev && !prev.classList.contains('disabled')) prev.addEventListener('click', () => { this.store.set('page', page - 1); this.render(); });
    if (next && !next.classList.contains('disabled')) next.addEventListener('click', () => { this.store.set('page', page + 1); this.render(); });
  }

  resetFilters() {
    this.store.batch(() => {
      this.store.set('searchQuery', '');
      this.store.set('folderFilter', 'all');
      this.store.set('typeFilter', 'all');
      this.store.set('sortBy', 'newest');
      this.store.set('page', 1);
    });
    const searchInput = $id('paSearchInput');
    if (searchInput) { searchInput.value = ''; $id('paSearchWrap')?.classList.remove('has-value'); }
    const folderFilter = $id('paFolderFilter');
    if (folderFilter) folderFilter.value = 'all';
    const typeFilter = $id('paTypeFilter');
    if (typeFilter) typeFilter.value = 'all';
    const sortEl = $id('paMediaSort');
    if (sortEl) sortEl.value = 'newest';
    this.render();
  }

  attachCardListeners() {
    const grid = $id('paMediaGrid');
    if (!grid) return;
    $all('.pa-action-view', grid).forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = this.findById(parseInt(btn.dataset.mediaId, 10));
        if (m) openMediaPreviewModal(m);
      });
    });
    $all('.pa-action-edit', grid).forEach((btn) => btn.addEventListener('click', () => this.openMediaEditPanel(parseInt(btn.dataset.mediaId, 10))));
    $all('.pa-action-delete', grid).forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = this.findById(parseInt(btn.dataset.mediaId, 10));
        if (m) requestDelete(m.id, 'media', m.name);
      });
    });
    $all('.pa-media-card .pa-action-more', grid).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const host = btn.closest('.pa-media-card__thumb-more, .pa-media-card__footer-more, .pa-media-card__list-more');
        const menu = host?.querySelector('.pa-card-menu');
        if (menu) toggleCardMenu(menu, btn);
      });
    });
    $all('.pa-action-history', grid).forEach((btn) => {
      btn.addEventListener('click', () => { void this.openMediaHistory(parseInt(btn.dataset.mediaId, 10)); });
    });
    $all('.pa-card-menu-item', grid).forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        const id = parseInt(item.dataset.mediaId, 10);
        closeAllCardMenus();
        if (action === 'edit') this.openMediaEditPanel(id);
        else if (action === 'delete') { const m = this.findById(id); if (m) requestDelete(id, 'media', m.name); }
        else if (action === 'duplicate') this.duplicateMedia(id);
        else if (action === 'copy-url') this.copyMediaUrl(id);
        else if (action === 'download') this.downloadMedia(id);
      });
    });
    $all('.pa-media-card__select', grid).forEach((box) => {
      box.addEventListener('click', (e) => { e.stopPropagation(); this.toggleSelect(parseInt(box.dataset.selectId, 10)); });
    });
    $all('.pa-media-card', grid).forEach((card) => {
      card.addEventListener('click', (e) => {
        if (!this.store.get('selectMode')) return;
        if (e.target.closest('.pa-media-card__actions, .pa-media-card__list-actions, .pa-media-card__select, .pa-media-card__thumb-more, .pa-media-card__footer-more, .pa-media-card__list-more')) return;
        this.toggleSelect(parseInt(card.dataset.mediaId, 10));
      });
    });
  }

  toggleSelect(id) {
    const set = this.store.get('selectedIds');
    set.has(id) ? set.delete(id) : set.add(id);
    this.render();
  }

  toggleSelectMode() {
    const next = !this.store.get('selectMode');
    this.store.set('selectMode', next);
    $id('paSelectModeBtn')?.classList.toggle('active', next);
    if (!next) {
      this.store.get('selectedIds').clear();
      this.updateBulkBar();
    }
    this.render();
  }

  selectAllVisible() {
    const set = this.store.get('selectedIds');
    const visible = this.getFiltered();
    visible.forEach((m) => set.add(m.id));
    this.updateBulkBar();
    this.render();
    this.toast(`Selected ${set.size} item${set.size === 1 ? '' : 's'}.`, 'info', 1800);
  }

  clearSelection() {
    this.store.get('selectedIds').clear();
    this.updateBulkBar();
    this.render();
    this.toast('Selection cleared.', 'info', 1500);
  }

  updateBulkBar() {
    const bar = $id('paBulkActionBar');
    if (!bar) return;
    const size = this.store.get('selectedIds').size;
    const selectMode = this.store.get('selectMode');
    
    if (selectMode && size > 0) {
      bar.style.display = 'flex';
      const count = $id('paBulkSelectedCount');
      if (count) count.textContent = `${size} selected`;
    } else {
      bar.style.display = 'none';
    }
  }

  requestBulkDelete() {
    const n = this.store.get('selectedIds').size;
    if (n === 0) return;
    requestBulkAction({
      title: `Delete selected file${n > 1 ? 's' : ''}?`,
      message: `This will permanently remove <strong>${n}</strong> selected file${n > 1 ? 's' : ''}. This action cannot be undone.`,
      onConfirm: () => this.performBulkDelete(),
    });
  }

  closeBulkConfirm() {
    $id('paBulkConfirmOverlay')?.classList.remove('visible');
  }

  async performBulkDelete() {
    const ids = this.store.get('selectedIds');
    const n = ids.size;
    if (n === 0) return;
    const prev = this.store.get('records');
    this.store.set('records', prev.filter((m) => !ids.has(m.id)));
    ids.clear();
    try {
      await this.persist();
      this.closeBulkConfirm();
      this.updateBulkBar();
      this.render();
      this.statusToast(`${n} file${n > 1 ? 's' : ''} deleted.`, 'danger');
      this.notify(`${n} media file${n > 1 ? 's' : ''} deleted in bulk.`, 'ri-delete-bin-line');
    } catch {
      this.store.set('records', prev);
      this.statusToast('Could not delete files. Please try again.', 'danger');
    }
  }

  async duplicateMedia(id) {
    const m = this.findById(id);
    if (!m) return;
    const copy = { ...m, id: this.nextId++, name: appendCopySuffix(m.name), uploadedAt: new Date().toISOString(), usageCount: 0 };
    const prev = this.store.get('records');
    this.store.set('records', prev.concat(copy));
    try {
      await this.persist();
      this.render();
      this.statusToast(`Duplicated as "${copy.name}".`, 'info');
    } catch {
      this.store.set('records', prev);
      this.statusToast('Could not duplicate file. Please try again.', 'danger');
    }
  }

  copyMediaUrl(id) {
    const m = this.findById(id);
    if (!m) return;
    navigator.clipboard?.writeText(m.url).then(() => this.toast('URL copied to clipboard.', 'success', 2000), () => this.toast('Clipboard not available.', 'danger'));
  }

  downloadMedia(id) {
    const m = this.findById(id);
    if (!m) return;
    const a = document.createElement('a');
    a.href = m.url;
    a.download = m.name;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    this.toast(`Downloading "${m.name}"…`, 'info', 1800);
  }

  async deleteById(id) {
    const m = this.findById(id);
    if (!m) return;
    const prev = this.store.get('records');
    this.store.set('records', prev.filter((x) => x.id !== id));
    try {
      await this.persist();
      closePanels();
      this.render();
      this.statusToast(`"${m.name}" was deleted.`, 'danger');
      this.notify(`"${m.name}" was deleted.`, 'ri-delete-bin-line');
    } catch {
      this.store.set('records', prev);
      this.statusToast('Could not delete file. Please try again.', 'danger');
    }
  }

  async openMediaHistory(id) {
    const m = this.findById(id);
    if (!m) return;
    const usageRefs = await findMediaUsage(m.url);
    openMediaHistoryModal(m, usageRefs);
  }

  openUploadPanel() {
    if (PAGE !== 'media') return;
    this.stagedFiles = [];
    this.renderStagedGrid();
    $id('paUploadFolder').value = 'general';
    $id('paUploadAlt').value = '';
    $id('paUploadFilesError').classList.remove('visible');
    $id('paUploadDropzone').classList.remove('error');
    openPanel('paUploadPanel', ['paEditDetailsPanel']);
    setTimeout(() => $id('paUploadDropzone')?.focus(), 320);
  }

  renderStagedGrid() {
    const grid = $id('paUploadStagedGrid');
    if (!grid) return;
    grid.innerHTML = this.stagedFiles
      .map((sf, i) => `<div class="pa-gallery-thumb"><img src="${sf.dataUrl}" alt="${escapeHtml(sf.name)}" /><div class="pa-gallery-thumb-remove" data-i="${i}" role="button" aria-label="Remove ${escapeHtml(sf.name)}"><i class="ri-close-line"></i></div></div>`)
      .join('');
    grid.querySelectorAll('.pa-gallery-thumb-remove').forEach((btn) => {
      btn.addEventListener('click', () => { this.stagedFiles.splice(parseInt(btn.dataset.i, 10), 1); this.renderStagedGrid(); });
    });
    if (this.stagedFiles.length > 0) {
      $id('paUploadFilesError')?.classList.remove('visible');
      $id('paUploadDropzone')?.classList.remove('error');
    }
  }

  async stageFiles(fileList) {
    const files = Array.from(fileList || []);
    let accepted = 0;
    for (const file of files) {
      if (!handleFileValidation(file)) continue;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        this.stagedFiles.push({ file, dataUrl, name: file.name, size: file.size, type: file.type });
        accepted++;
      } catch {
        this.toast(`Could not read "${file.name}".`, 'danger');
      }
    }
    this.renderStagedGrid();
    if (accepted > 0) this.toast(`${accepted} file${accepted > 1 ? 's' : ''} ready to upload.`, 'success', 2000);
  }

  setupEditImageDropzone() {
    const dropzone = $id('paEditImageDropzone');
    const fileInput = $id('paEditImageFileInput');
    if (!dropzone || !fileInput) return;

    this.on(dropzone, 'click', () => fileInput.click());
    this.on(dropzone, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
    dropzone.setAttribute('tabindex', '0');
    dropzone.setAttribute('role', 'button');

    this.on(fileInput, 'change', async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) await this.stageEditImage(file);
    });

    ['dragenter', 'dragover'].forEach((evt) => {
      this.on(dropzone, evt, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      this.on(dropzone, evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });
    this.on(dropzone, 'drop', async (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) await this.stageEditImage(file);
    });
  }

  async stageEditImage(file) {
    if (!handleFileValidation(file)) {
      $id('paEditImageError')?.classList.add('visible');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      this.editPendingImage = {
        dataUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
      $id('paEditImageError')?.classList.remove('visible');
      this.updateEditPreview();
      this.toast('New image selected. Save to apply changes.', 'info', 2200);
    } catch {
      $id('paEditImageError')?.classList.add('visible');
      this.toast(`Could not read "${file.name}".`, 'danger');
    }
  }

  updateEditPreview() {
    const img = $id('paEditPreviewImg');
    const revertBtn = $id('paEditRevertImageBtn');
    const sizeEl = $id('paEditFileSize');
    const pending = this.editPendingImage;
    const original = this.editOriginalImage;

    if (img) {
      const src = pending?.dataUrl || original?.url || '';
      img.src = src;
      const alt = $id('paEditAlt')?.value.trim() || $id('paEditFileName')?.value.trim() || '';
      img.alt = alt;
    }

    if (revertBtn) {
      revertBtn.style.display = pending ? '' : 'none';
    }

    if (sizeEl) {
      const size = pending?.size ?? original?.size;
      const url = pending?.dataUrl || original?.url;
      sizeEl.textContent = size != null || url
        ? formatFileSize(size, url)
        : '—';
    }
  }

  revertEditImage() {
    this.editPendingImage = null;
    $id('paEditImageError')?.classList.remove('visible');
    this.updateEditPreview();
    this.toast('Reverted to original image.', 'info', 1800);
  }

  resetEditImageState(m) {
    this.editPendingImage = null;
    this.editOriginalImage = m
      ? { url: m.url, size: m.size, type: m.type, name: m.name }
      : null;
    $id('paEditImageError')?.classList.remove('visible');
    const editFileInput = $id('paEditImageFileInput');
    if (editFileInput) editFileInput.value = '';
    this.updateEditPreview();
  }

  setupUploadDropzone() {
    const dropzone = $id('paUploadDropzone');
    const fileInput = $id('paUploadFileInput');
    if (!dropzone || !fileInput) return;
    this.on(dropzone, 'click', () => fileInput.click());
    this.on(dropzone, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
    dropzone.setAttribute('tabindex', '0');
    dropzone.setAttribute('role', 'button');
    this.on(fileInput, 'change', async () => { await this.stageFiles(fileInput.files); fileInput.value = ''; });
    ['dragenter', 'dragover'].forEach((evt) => this.on(dropzone, evt, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach((evt) => this.on(dropzone, evt, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
    this.on(dropzone, 'drop', async (e) => { const files = e.dataTransfer?.files; if (files && files.length) await this.stageFiles(files); });
  }

  async handleUploadSubmit() {
    if (PAGE !== 'media' || this.stagedFiles.length === 0) {
      $id('paUploadFilesError')?.classList.add('visible');
      $id('paUploadDropzone')?.classList.add('error');
      this.toast('Please select at least one file to upload.', 'danger');
      return;
    }
    const folder = $id('paUploadFolder').value;
    const altBase = $id('paUploadAlt').value.trim();
    const uploadedNames = [];
    const newRecords = this.stagedFiles.map((sf) => {
      const record = { id: this.nextId++, name: sf.name, url: sf.dataUrl, alt: altBase, folder, size: sf.size, type: sf.type, uploadedAt: new Date().toISOString(), usageCount: 0 };
      uploadedNames.push(record.name);
      return record;
    });
    const prev = this.store.get('records');
    this.store.set('records', prev.concat(newRecords));
    try {
      await this.persist();
      closePanels();
      this.resetFilters();
      this.render();
      const count = uploadedNames.length;
      this.statusToast(`${count} file${count > 1 ? 's' : ''} uploaded successfully!`, 'success');
      this.notify(count === 1 ? `"${uploadedNames[0]}" was uploaded.` : `${count} files were uploaded.`, 'ri-upload-cloud-2-line');
    } catch {
      this.store.set('records', prev);
      this.statusToast('Could not upload files. Please try again.', 'danger');
    }
  }

  openMediaEditPanel(id) {
    if (PAGE !== 'media') return;
    const m = this.findById(id);
    if (!m) return;
    this.currentEditId = id;
    this.resetEditImageState(m);
    $id('paEditFileName').value = m.name;
    $id('paEditAlt').value = m.alt || '';
    $id('paEditFolder').value = m.folder;
    $id('paEditFileDate').textContent = formatDate(m.uploadedAt);
    $id('paEditFileUsage').textContent = m.usageCount > 0 ? `${m.usageCount} place${m.usageCount > 1 ? 's' : ''}` : 'Not currently used';
    $id('paEditFileNameError').classList.remove('visible');
    $id('paEditFileName').classList.remove('error');
    openPanel('paEditDetailsPanel', ['paUploadPanel']);
    setTimeout(() => $id('paEditFileName')?.focus(), 320);
  }

  async handleMediaEditSubmit() {
    if (PAGE !== 'media' || this.currentEditId == null) return;
    const name = $id('paEditFileName').value.trim();
    if (!name) {
      $id('paEditFileName').classList.add('error');
      $id('paEditFileNameError').classList.add('visible');
      this.toast('Please fill in all required fields.', 'danger');
      return;
    }
    $id('paEditFileName').classList.remove('error');
    $id('paEditFileNameError').classList.remove('visible');
    const m = this.findById(this.currentEditId);
    if (!m) return;
    const snapshot = { ...m };
    m.name = name;
    m.alt = $id('paEditAlt').value.trim();
    m.folder = $id('paEditFolder').value;
    if (this.editPendingImage) {
      m.url = this.editPendingImage.dataUrl;
      m.size = this.editPendingImage.size;
      m.type = this.editPendingImage.type;
    }
    try {
      await this.persist();
      closePanels();
      this.editPendingImage = null;
      this.editOriginalImage = null;
      this.render();
      this.statusToast(`"${m.name}" updated successfully!`, 'success');
      this.notify(`"${m.name}" details were updated.`, 'ri-pencil-line');
    } catch {
      Object.assign(m, snapshot);
      this.statusToast('Could not save changes. Please try again.', 'danger');
    }
  }

  bindEvents() {
    this.syncFolderSelects();
    registerPanel('paUploadPanel');
    registerPanel('paEditDetailsPanel');
    bindMediaModalEvents({ onEscape: true });
    this.setupUploadDropzone();
    this.setupEditImageDropzone();

    this.on($id('paUploadNewBtn') || $id('paMediaAddNewBtn'), 'click', () => this.openUploadPanel());
    this.on($id('paUploadPanelClose'), 'click', () => closePanels());
    this.on($id('paEditDetailsPanelClose'), 'click', () => closePanels());
    this.on($id('paUploadCancel'), 'click', () => closePanels());
    this.on($id('paEditDetailsCancel'), 'click', () => closePanels());
    this.on($id('paEditRevertImageBtn'), 'click', () => this.revertEditImage());
    this.on($id('paUploadSubmit'), 'click', () => { void this.handleUploadSubmit(); });
    this.on($id('paEditDetailsSubmit'), 'click', () => { void this.handleMediaEditSubmit(); });
    this.on($id('paEditDetailsDelete'), 'click', () => {
      const m = this.findById(this.currentEditId);
      if (m) requestDelete(m.id, 'media', m.name);
    });

    const searchInput = $id('paSearchInput');
    if (searchInput) {
      this.on(searchInput, 'input', () => {
        this.store.set('searchQuery', searchInput.value);
        this.store.set('page', 1);
        $id('paSearchWrap')?.classList.toggle('has-value', !!searchInput.value);
        this.render();
      });
    }
    this.on($id('paSearchClear'), 'click', () => { if (searchInput) { searchInput.value = ''; this.store.set('searchQuery', ''); this.render(); } });
    this.on($id('paFolderFilter'), 'change', (e) => { this.store.update({ folderFilter: e.target.value, page: 1 }); this.render(); });
    this.on($id('paTypeFilter'), 'change', (e) => { this.store.update({ typeFilter: e.target.value, page: 1 }); this.render(); });
    this.on($id('paMediaSort'), 'change', (e) => { this.store.update({ sortBy: e.target.value, page: 1 }); this.render(); });

    const gridBtn = $id('paGridViewBtn');
    const listBtn = $id('paListViewBtn');
    
    if (gridBtn) {
      const parent = gridBtn.parentNode;
      const newGridBtn = gridBtn.cloneNode(true);
      parent.replaceChild(newGridBtn, gridBtn);
      this.on(newGridBtn, 'click', () => {
        this.store.set('viewMode', 'grid');
        this.setViewModeFromStore();
        this.render();
      });
    }
    
    if (listBtn) {
      const parent = listBtn.parentNode;
      const newListBtn = listBtn.cloneNode(true);
      parent.replaceChild(newListBtn, listBtn);
      this.on(newListBtn, 'click', () => {
        this.store.set('viewMode', 'list');
        this.setViewModeFromStore();
        this.render();
      });
    }

    const selectModeBtn = $id('paSelectModeBtn');
    if (selectModeBtn) {
      this.on(selectModeBtn, 'click', () => this.toggleSelectMode());
    }

    const selectAllBtn = $id('paBulkSelectAllBtn');
    if (selectAllBtn) {
      this.on(selectAllBtn, 'click', () => this.selectAllVisible());
    }

    const clearBtn = $id('paBulkClearBtn');
    if (clearBtn) {
      this.on(clearBtn, 'click', () => this.clearSelection());
    }

    const bulkDeleteBtn = $id('paBulkDeleteBtn');
    if (bulkDeleteBtn) {
      bulkDeleteBtn.type = 'button';
      this.on(bulkDeleteBtn, 'click', () => this.requestBulkDelete());
    }

    this.onBus('bulk-confirm:close', () => this.closeBulkConfirm());
    this.onBus('confirm:confirmed', ({ id, type }) => { if (type === 'media') this.deleteById(id); });
    this.onBus('shortcut:new-item', ({ page }) => { if (page === PAGE) this.openUploadPanel(); });
  }
}