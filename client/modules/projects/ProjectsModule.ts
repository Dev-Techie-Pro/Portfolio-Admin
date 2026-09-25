import { Module } from '../../core/Module.js';
import { $id, $all, escapeHtml } from '../../utils/dom.js';
import { isValidUrl } from '../../utils/strings.js';
import { handleFileValidation } from '../../utils/files.js';
import { uploadCmsFileWithPreview } from '../../utils/media-upload.js';
import { setupRte } from '../../utils/rte.js';
import { storage } from '../../core/StorageService.js';
import { addChip, getChipValues, populateChips } from '../../utils/chips.js';
import { requestDelete } from '../../modules/shell/confirm.js';
import { closeAllCardMenus, toggleCardMenu } from '../../modules/shell/cardMenu.js';
import { openPanel, closePanels, activateTab, registerPanel } from '../../modules/shell/panels.js';
import { PAGE } from '../../core/router.js';
import { BulkSelectController } from '../../core/BulkSelectController.js';
import { renderPaProjCard, getProjectBucket } from '../../utils/paProjCard.js';
import { sortByNewestFirst } from '../../utils/format.js';
import * as mediaPicker from '../../utils/MediaPicker.js';

export const CATEGORY_META_PROJECTS = {
  enterprise: { label: 'Enterprise Platform', cls: 'pa-cat-enterprise' },
  educational: { label: 'Educational Platform', cls: 'pa-cat-educational' },
  desktop: { label: 'Desktop Application', cls: 'pa-cat-desktop' },
  medical: { label: 'Medical System', cls: 'pa-cat-medical' },
  ecommerce: { label: 'E-Commerce', cls: 'pa-cat-ecommerce' },
  travel: { label: 'Travel Platform', cls: 'pa-cat-travel' },
  web: { label: 'Web Application', cls: 'pa-cat-web' },
  nonprofit: { label: 'Non Profit Organization', cls: 'pa-cat-nonprofit' },
};

const SCENES = {
  enterprise: { bg: 'linear-gradient(135deg,#10202e 0%,#16314a 60%,#0c1722 100%)', accent: '#ff6600', chrome: '#1c2733' },
  educational: { bg: 'linear-gradient(135deg,#1c1230 0%,#2d1b4d 55%,#160f26 100%)', accent: '#a78bfa', chrome: '#211a30' },
  desktop: { bg: 'linear-gradient(135deg,#3a0f63 0%,#7b2ff7 50%,#1d0b38 100%)', accent: '#38bdf8', chrome: '#241338' },
  medical: { bg: 'linear-gradient(135deg,#241016 0%,#3a0f1f 55%,#160a0e 100%)', accent: '#f472b6', chrome: '#241319' },
  ecommerce1: { bg: 'linear-gradient(135deg,#0d1f1a 0%,#0f2e22 60%,#081410 100%)', accent: '#34d399', chrome: '#11211b' },
  ecommerce2: { bg: 'linear-gradient(135deg,#1a1006 0%,#2a1c08 55%,#120a04 100%)', accent: '#fb923c', chrome: '#1e1409' },
  travel: { bg: 'linear-gradient(135deg,#0a0a0c 0%,#181818 55%,#050505 100%)', accent: '#facc15', chrome: '#161616' },
  web: { bg: 'linear-gradient(135deg,#0e1a3a 0%,#16275c 55%,#0a1226 100%)', accent: '#60a5fa', chrome: '#121d3a' },
  nonprofit: { bg: 'linear-gradient(135deg,#16140d 0%,#241f12 55%,#0e0c08 100%)', accent: '#facc15', chrome: '#1c180f' },
};

export const SEED_PROJECTS = [];

export function pickSceneForCategory(catKey) {
  if (catKey === 'ecommerce') return Math.random() > 0.5 ? 'ecommerce1' : 'ecommerce2';
  return SCENES[catKey] ? catKey : 'web';
}

function buildDeviceScene(scene) {
  const a = scene.accent;
  const id = a.replace('#', '');
  return `<svg viewBox="0 0 248 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="g1-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}" stop-opacity="0.9"/><stop offset="1" stop-color="${a}" stop-opacity="0.45"/></linearGradient></defs><g transform="translate(18,14)"><rect x="0" y="0" width="148" height="92" rx="6" fill="#0d0d10" stroke="rgba(255,255,255,0.12)" stroke-width="1"/><rect x="5" y="5" width="138" height="82" rx="2" fill="#15151a"/><rect x="5" y="5" width="138" height="11" fill="rgba(255,255,255,0.06)"/><circle cx="10" cy="10.5" r="1.6" fill="#e55"/><circle cx="15" cy="10.5" r="1.6" fill="#ea0"/><circle cx="20" cy="10.5" r="1.6" fill="#3c3"/><rect x="12" y="22" width="70" height="6" rx="2" fill="url(#g1-${id})"/><rect x="12" y="32" width="100" height="3.2" rx="1.6" fill="#ffffff" opacity="0.22"/><rect x="12" y="38" width="80" height="3.2" rx="1.6" fill="#ffffff" opacity="0.14"/><rect x="12" y="47" width="32" height="10" rx="2.5" fill="${a}" opacity="0.85"/><rect x="12" y="63" width="38" height="20" rx="3" fill="#ffffff" opacity="0.08"/><rect x="54" y="63" width="38" height="20" rx="3" fill="#ffffff" opacity="0.08"/><rect x="96" y="63" width="38" height="20" rx="3" fill="#ffffff" opacity="0.08"/><rect x="16" y="67" width="14" height="3" rx="1.5" fill="${a}" opacity="0.7"/><rect x="58" y="67" width="14" height="3" rx="1.5" fill="${a}" opacity="0.5"/><rect x="100" y="67" width="14" height="3" rx="1.5" fill="${a}" opacity="0.6"/><path d="M -6 92 L 154 92 L 144 99 L 4 99 Z" fill="#1a1a1f"/></g><g transform="translate(180,4)"><rect x="0" y="0" width="44" height="92" rx="7" fill="#101013" stroke="rgba(255,255,255,0.14)" stroke-width="1"/><rect x="3" y="6" width="38" height="80" rx="2" fill="#16161b"/><rect x="3" y="6" width="38" height="13" fill="rgba(255,255,255,0.07)"/><circle cx="22" cy="12" r="2" fill="${a}" opacity="0.7"/><rect x="8" y="24" width="28" height="16" rx="2.5" fill="${a}" opacity="0.55"/><rect x="8" y="44" width="28" height="3" rx="1.5" fill="#fff" opacity="0.2"/><rect x="8" y="50" width="20" height="3" rx="1.5" fill="#fff" opacity="0.14"/><rect x="8" y="60" width="28" height="9" rx="2" fill="#fff" opacity="0.08"/><rect x="8" y="72" width="28" height="9" rx="2" fill="#fff" opacity="0.08"/></g></svg>`;
}

function buildBrowserMockup(p) {
  const scene = SCENES[p.scene] || SCENES.web;
  if (p.bannerImgUrl) {
    return `<div class="pa-thumb-frame" style="background:${scene.bg};">
      <img src="${escapeHtml(p.bannerImgUrl)}" 
           alt="${escapeHtml(p.title)} screenshot" 
           class="pa-thumb-img" 
           onerror="this.style.display='none'; this.parentElement.innerHTML = '<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;padding:20px;text-align:center;\\'>URL not found</div>';" />
    </div>`;
  }
  return `<div class="pa-thumb-frame" style="background:${scene.bg};">${buildDeviceScene(scene)}</div>`;
}

const PAGE_SIZE = 9;

function countInMonth(records, monthOffset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
  return records.filter((p) => {
    const t = p.createdAt ? new Date(p.createdAt).getTime() : NaN;
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
const ADD_STEPS = ['general', 'media', 'additional'];
const ADD_STEP_LABELS = {
  general: 'Next: Media & Images →',
  media: 'Next: Additional Info →',
  additional: 'Add Project',
};

export class ProjectsModule extends Module {
  constructor() {
    super({
      name: 'Projects',
      storageKey: 'pa_projects',
      initialState: { records: [], searchQuery: '', categoryFilter: 'all', statusFilter: 'all', viewMode: 'grid', page: 1 },
    });
    this.nextId = 1;
    this.currentEditId = null;
    this.addGalleryImages = [];
    this.editGalleryImages = [];
    this.addFeaturedImage = null;
    this.editFeaturedImage = null;
    this.addStep = ADD_STEPS[0];
    this.bulkSelect = new BulkSelectController(this, {
      containerId: 'paProjectGrid',
      itemSelector: '.pa-card',
      idAttr: 'data-id',
      label: 'project',
      getVisibleIds: () => this.getFiltered().map((p) => p.id),
      onBulkDelete: (ids) => this.bulkDelete(ids),
    });
  }

  async bulkDelete(ids) {
    const n = ids.size;
    if (n === 0) return;
    const prev = this.store.get('records');
    this.store.set('records', prev.filter((p) => !ids.has(String(p.id))));
    try {
      await this.persist();
      this.render();
      this.statusToast(`${n} project${n > 1 ? 's' : ''} deleted.`, 'danger');
      this.notify(`${n} project${n > 1 ? 's' : ''} deleted in bulk.`, 'ri-delete-bin-line');
    } catch {
      this.store.set('records', prev);
      this.statusToast('Could not delete projects. Please try again.', 'danger');
    }
  }

  async load() {
    const records = await this.loadRecords(() => []);
    this.nextId = Math.max(0, ...records.map((p) => p.id)) + 1;
    this.store.set('records', records);
    try {
      const pendingCat = sessionStorage.getItem('pa_projects_cat_filter');
      if (pendingCat) {
        sessionStorage.removeItem('pa_projects_cat_filter');
        this.store.set('categoryFilter', pendingCat);
      }
    } catch { /* ignore */ }
  }

  async persist() {
    await this.saveRecords(this.store.get('records'));
    await storage.get('pa_media_library', []).catch(() => {});
  }

  findById(id) { return this.store.get('records').find((p) => p.id === id); }

  getFiltered() {
    const { records, searchQuery, categoryFilter, statusFilter } = this.store._raw;
    let results = sortByNewestFirst(records);
    if (categoryFilter !== 'all') results = results.filter((p) => p.catKey === categoryFilter);
    if (statusFilter === 'featured') results = results.filter((p) => p.featured);
    else if (statusFilter === 'published') results = results.filter((p) => getProjectBucket(p.status) === 'published');
    else if (statusFilter === 'drafts') results = results.filter((p) => getProjectBucket(p.status) === 'draft');
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      results = results.filter(
        (p) => p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || (p.fullDesc && p.fullDesc.toLowerCase().includes(q)) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q)) || (CATEGORY_META_PROJECTS[p.catKey] && CATEGORY_META_PROJECTS[p.catKey].label.toLowerCase().includes(q)),
      );
    }
    return results;
  }

  renderStats() {
    const records = this.store.get('records');
    const set = (id, val) => { const el = $id(id); if (el) el.textContent = val; };
    set('paProjStatTotal', records.length);
    set('paProjStatPublished', records.filter((p) => getProjectBucket(p.status) === 'published').length);
    set('paProjStatDrafts', records.filter((p) => getProjectBucket(p.status) === 'draft').length);
    set('paProjStatArchived', records.filter((p) => getProjectBucket(p.status) === 'archived').length);
    setStatTrend('paProjStatTotalTrend', records);
    setStatTrend('paProjStatPublishedTrend', records, (p) => getProjectBucket(p.status) === 'published');
    setStatTrend('paProjStatDraftsTrend', records, (p) => getProjectBucket(p.status) === 'draft');
    setStatTrend('paProjStatArchivedTrend', records, (p) => getProjectBucket(p.status) === 'archived');
  }

  syncStatusTabs() {
    const filter = this.store.get('statusFilter') || 'all';
    $all('#paProjStatusTabs .pa-status-tab').forEach((tab) => {
      const active = tab.dataset.projFilter === filter;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  renderCard(p, index = 0) {
    const meta = CATEGORY_META_PROJECTS[p.catKey] || { label: p.catKey, cls: '' };
    return renderPaProjCard(p, {
      meta,
      thumbHtml: buildBrowserMockup(p),
      bulkCheckbox: this.bulkSelect.checkboxHtml(p.id, `Select ${escapeHtml(p.title)}`),
      cardClass: this.bulkSelect.cardClass(p.id),
      animationDelay: Math.min(index, 8) * 35,
    });
  }

  render() {
    this.renderStats();
    this.syncStatusTabs();

    const catFilterEl = $id('paCategoryFilter');
    const catFilterVal = this.store.get('categoryFilter') || 'all';
    if (catFilterEl && catFilterEl.value !== catFilterVal) catFilterEl.value = catFilterVal;

    const all = this.getFiltered();
    const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    let page = this.store.get('page');
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    this.store.set('page', page);

    const start = (page - 1) * PAGE_SIZE;
    const pageItems = all.slice(start, start + PAGE_SIZE);
    const grid = $id('paProjectGrid');
    if (grid) {
      grid.classList.toggle('list-view', this.store.get('viewMode') === 'list');
      if (pageItems.length === 0) {
        const hasFilters = this.store.get('searchQuery').trim() || this.store.get('categoryFilter') !== 'all' || this.store.get('statusFilter') !== 'all';
        grid.innerHTML = `<div class="pa-empty-state"><i class="ri-folder-open-line"></i><div class="pa-empty-state-title">${hasFilters ? 'No projects match your filters' : 'No projects yet'}</div><div class="pa-empty-state-text">${hasFilters ? "Try adjusting your search or category filter to find what you're looking for." : 'Get started by adding your first portfolio project.'}</div>${hasFilters ? `<button class="pa-empty-state-btn" id="paEmptyResetBtn">Reset filters</button>` : `<button class="pa-empty-state-btn" id="paEmptyAddBtn">+ Add New Project</button>`}</div>`;
        this.on($id('paEmptyResetBtn'), 'click', () => this.resetFilters());
        this.on($id('paEmptyAddBtn'), 'click', () => this.openAddPanel());
      } else {
        grid.innerHTML = pageItems.map((p, i) => this.renderCard(p, i)).join('');
      }
    }

    this.renderPagination(all.length, totalPages, page);
    this.attachCardListeners();
    this.bulkSelect.onRender();
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
    const btnsWrap = $id('paPaginationBtns');
    const info = $id('paPaginationInfo');
    if (!btnsWrap || !info) return;
    if (totalItems === 0) { btnsWrap.innerHTML = ''; info.textContent = 'Showing 0 of 0 projects'; return; }

    let html = `<div class="pa-page-nav ${page === 1 ? 'disabled' : ''}" id="paPagePrev" role="button" aria-label="Previous page"><i class="ri-arrow-left-s-line"></i></div>`;
    let lastShown = 0;
    for (let p = 1; p <= totalPages; p++) {
      const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
      if (!show) continue;
      if (p - lastShown > 1) html += `<span style="color:var(--pa-text-faint); padding:0 4px; font-size:12px;">…</span>`;
      html += `<button class="pa-page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
      lastShown = p;
    }
    html += `<div class="pa-page-nav ${page === totalPages ? 'disabled' : ''}" id="paPageNext" role="button" aria-label="Next page"><i class="ri-arrow-right-s-line"></i></div>`;
    btnsWrap.innerHTML = html;

    const startN = (page - 1) * PAGE_SIZE + 1;
    const endN = Math.min(page * PAGE_SIZE, totalItems);
    info.textContent = `Showing ${startN} to ${endN} of ${totalItems} projects`;

    btnsWrap.querySelectorAll('.pa-page-btn').forEach((btn) => {
      btn.addEventListener('click', () => { this.store.set('page', parseInt(btn.dataset.page, 10)); this.render(); $id('paBody')?.scrollTo({ top: 0, behavior: 'smooth' }); });
    });
    const prevBtn = $id('paPagePrev');
    const nextBtn = $id('paPageNext');
    if (prevBtn && !prevBtn.classList.contains('disabled')) prevBtn.addEventListener('click', () => { this.store.set('page', page - 1); this.render(); });
    if (nextBtn && !nextBtn.classList.contains('disabled')) nextBtn.addEventListener('click', () => { this.store.set('page', page + 1); this.render(); });
  }

  resetFilters() {
    this.store.batch(() => {
      this.store.set('searchQuery', '');
      this.store.set('categoryFilter', 'all');
      this.store.set('statusFilter', 'all');
      this.store.set('page', 1);
    });
    const searchInput = $id('paSearchInput');
    if (searchInput) { searchInput.value = ''; $id('paSearchWrap')?.classList.remove('has-value'); }
    const catFilter = $id('paCategoryFilter');
    if (catFilter) catFilter.value = 'all';
    this.render();
  }

  attachCardListeners() {
    $all('.pa-action-edit').forEach((btn) => btn.addEventListener('click', () => this.openEditPanel(parseInt(btn.dataset.id, 10))));
    $all('.pa-action-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = this.findById(parseInt(btn.dataset.id, 10));
        if (p) requestDelete(p.id, 'project', p.title);
      });
    });
    $all('.pa-action-view').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = this.findById(parseInt(btn.dataset.id, 10));
        if (!p) return;
        if (p.liveUrl) { this.toast(`Opening "${p.title}" in a new tab…`, 'info'); window.open(p.liveUrl, '_blank', 'noopener'); }
        else this.toast(`"${p.title}" has no live URL set yet`, 'info');
      });
    });
    $all('.pa-proj-card .pa-action-more').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const host = btn.closest('.pa-proj-card__head-more, .pa-proj-card__list-more, .pa-card-actions');
        const menu = host?.querySelector('.pa-card-menu');
        if (menu) toggleCardMenu(menu, btn);
      });
    });
  
    $all('.pa-action-duplicate').forEach((btn) => {
      btn.addEventListener('click', () => this.duplicateProject(parseInt(btn.dataset.id, 10)));
    });
    $all('.pa-proj-card__demo-link').forEach((link) => {
      link.addEventListener('click', (e) => e.stopPropagation());
    });
    $all('.pa-card-menu-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(item.dataset.id, 10);
        const action = item.dataset.action;
        closeAllCardMenus();
        if (action === 'edit') this.openEditPanel(id);
        else if (action === 'duplicate') this.duplicateProject(id);
        else if (action === 'copy-link') this.copyLiveUrl(id);
        else if (action === 'delete') { const p = this.findById(id); if (p) requestDelete(id, 'project', p.title); }
      });
    });
  }

  async duplicateProject(id) {
    const p = this.findById(id);
    if (!p) return;
    const copy = { ...p, id: this.nextId++, title: `${p.title} (Copy)`, featured: false, sortOrder: this.store.get('records').length + 1, tags: [...(p.tags || [])] };
    const prev = this.store.get('records');
    this.store.set('records', prev.concat(copy));
    try {
      await this.persist();
      this.render();
      this.statusToast(`Duplicated "${p.title}"`, 'success');
      this.notify(`"${p.title}" was duplicated.`, 'ri-file-copy-line');
    } catch {
      this.store.set('records', prev);
      this.statusToast('Could not duplicate project. Please try again.', 'danger');
    }
  }

  copyLiveUrl(id) {
    const p = this.findById(id);
    if (!p) return;
    if (!p.liveUrl) { this.toast('This project has no live URL set', 'info'); return; }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(p.liveUrl).then(() => this.toast('Live URL copied to clipboard', 'success'));
    else this.toast('Live URL copied to clipboard', 'success');
  }

  async deleteById(id) {
    const p = this.findById(id);
    if (!p) return;
    const prev = this.store.get('records');
    this.store.set('records', prev.filter((x) => x.id !== id));
    try {
      await this.persist();
      closePanels();
      this.render();
      this.statusToast(`"${p.title}" was deleted.`, 'danger');
      this.notify(`"${p.title}" was deleted.`, 'ri-delete-bin-line');
    } catch {
      this.store.set('records', prev);
      this.statusToast('Could not delete project. Please try again.', 'danger');
    }
  }

  clearFormErrors(prefix) {
    ['Title', 'Category', 'ShortDesc', 'FullDesc', 'Tech'].forEach((field) => {
      $id(`${prefix}${field}Error`)?.classList.remove('visible');
      const inputId = field === 'FullDesc' ? `${prefix}RteWrap` : `${prefix}${field}`;
      $id(inputId)?.classList.remove('error');
    });
  }

  showFieldError(prefix, field, isRte) {
    $id(`${prefix}${field}Error`)?.classList.add('visible');
    $id(isRte ? `${prefix}RteWrap` : `${prefix}${field}`)?.classList.add('error');
  }

  resetAddForm() {
    const safeSetText = (id, text) => {
      const el = $id(id);
      if (el) el.textContent = text;
    };
    
    ['addTitle', 'addCategory', 'addShortDesc', 'addImageUrl', 'addLiveUrl', 'addRepoUrl', 'addSortOrder'].forEach((id) => { 
      const el = $id(id); 
      if (el) el.value = ''; 
    });
    
    safeSetText('addShortDescCount', '0');
    
    const shortDescParent = $id('addShortDescCount')?.parentElement;
    if (shortDescParent) {
      shortDescParent.classList.remove('warn', 'max');
    }
    
    const fullDesc = $id('addFullDesc');
    if (fullDesc) fullDesc.innerHTML = '';
    
    const techChips = $id('addTechChips');
    if (techChips) techChips.innerHTML = '';
    
    const techInput = $id('addTechInput');
    if (techInput) techInput.value = '';
    
    const status = $id('addStatus');
    if (status) status.value = 'Completed';
    
    const featured = $id('addFeatured');
    if (featured) featured.value = '0';
    
    const featuredPreview = $id('addFeaturedPreviewWrap');
    if (featuredPreview) featuredPreview.innerHTML = '';
    
    const galleryGrid = $id('addGalleryGrid');
    if (galleryGrid) galleryGrid.innerHTML = '';
    
    const mediaUpload = $id('addMediaUpload');
    if (mediaUpload) mediaUpload.style.display = '';
    
    this.addGalleryImages = [];
    this.addFeaturedImage = null;
    this.addStep = ADD_STEPS[0];
    this.clearFormErrors('add');
    this.updateAddStepUi();
  }

  updateAddStepUi() {
    activateTab('add', this.addStep);
    const label = $id('paAddSubmitLabel');
    if (label) label.textContent = ADD_STEP_LABELS[this.addStep] || 'Add Project';
  }

  validateAddStep(step) {
    this.clearFormErrors('add');
    if (step === 'general') {
      let valid = true;
      const titleEl = $id('addTitle');
      const title = titleEl ? titleEl.value.trim() : '';
      if (!title) { this.showFieldError('add', 'Title'); valid = false; }

      const categoryEl = $id('addCategory');
      const category = categoryEl ? categoryEl.value : '';
      if (!category) { this.showFieldError('add', 'Category'); valid = false; }

      const shortDescEl = $id('addShortDesc');
      const shortDesc = shortDescEl ? shortDescEl.value.trim() : '';
      if (!shortDesc) { this.showFieldError('add', 'ShortDesc'); valid = false; }

      const fullDescEl = $id('addFullDesc');
      const fullDesc = fullDescEl ? fullDescEl.textContent.trim() : '';
      if (!fullDesc) { this.showFieldError('add', 'FullDesc', true); valid = false; }

      const techChipsEl = $id('addTechChips');
      const tags = techChipsEl ? getChipValues(techChipsEl) : [];
      if (tags.length === 0) { this.showFieldError('add', 'Tech'); valid = false; }

      if (!valid) this.toast('Please fill in all required fields', 'danger');
      return valid;
    }

    if (step === 'media') return true;

    if (step === 'additional') {
      const liveUrl = $id('addLiveUrl')?.value.trim() || '';
      const repoUrl = $id('addRepoUrl')?.value.trim() || '';
      if (liveUrl && !isValidUrl(liveUrl)) {
        this.toast('Live URL is not valid — include https://', 'danger');
        return false;
      }
      if (repoUrl && !isValidUrl(repoUrl)) {
        this.toast('GitHub Repository URL is not valid — include https://', 'danger');
        return false;
      }
    }

    return true;
  }

  async onAddPrimary() {
    if (PAGE !== 'projects') return;
    const idx = ADD_STEPS.indexOf(this.addStep);
    if (idx < ADD_STEPS.length - 1) {
      if (!this.validateAddStep(this.addStep)) return;
      this.addStep = ADD_STEPS[idx + 1];
      this.updateAddStepUi();
      return;
    }
    await this.handleAddSubmit();
  }

  openAddPanel() {
    if (PAGE !== 'projects') return;
    this.resetAddForm();
    openPanel('paAddPanel', ['paEditPanel']);
    this.updateAddStepUi();
    const titleEl = $id('addTitle');
    if (titleEl) setTimeout(() => titleEl.focus(), 320);
  }

  openEditPanel(id) {
    if (PAGE !== 'projects') return;
    const project = this.findById(id);
    if (!project) return;
    this.currentEditId = id;
    this.clearFormErrors('edit');

    const editTitle = $id('editTitle');
    if (editTitle) editTitle.value = project.title;
    
    const editCategory = $id('editCategory');
    if (editCategory) editCategory.value = project.catKey;
    
    const editShortDesc = $id('editShortDesc');
    if (editShortDesc) editShortDesc.value = project.desc;
    
    const editShortDescCount = $id('editShortDescCount');
    if (editShortDescCount) editShortDescCount.textContent = project.desc.length;
    
    const editFullDesc = $id('editFullDesc');
    if (editFullDesc) editFullDesc.innerHTML = escapeHtml(project.fullDesc || '');
    
    const editTechChips = $id('editTechChips');
    if (editTechChips) populateChips(editTechChips, project.tags);
    
    const editImageUrl = $id('editImageUrl');
    if (editImageUrl) editImageUrl.value = project.imageUrl || '';
    
    const editLiveUrl = $id('editLiveUrl');
    if (editLiveUrl) editLiveUrl.value = project.liveUrl || '';
    
    const editRepoUrl = $id('editRepoUrl');
    if (editRepoUrl) editRepoUrl.value = project.repoUrl || '';
    
    const editStatus = $id('editStatus');
    if (editStatus) editStatus.value = project.status || 'Completed';
    
    const editFeatured = $id('editFeatured');
    if (editFeatured) editFeatured.value = project.featured ? '1' : '0';
    
    const editSortOrder = $id('editSortOrder');
    if (editSortOrder) editSortOrder.value = project.sortOrder || '';

    this.editGalleryImages = (project.gallery || []).slice();
    this.renderGalleryGrid('edit');
    this.editFeaturedImage = project.imageUrl ? { url: project.imageUrl, name: 'Current image' } : null;
    this.renderFeaturedPreview('edit');

    openPanel('paEditPanel', ['paAddPanel']);
    activateTab('edit', 'general');
  }

  renderFeaturedPreview(prefix) {
    const wrap = $id(`${prefix}FeaturedPreviewWrap`);
    const uploadBox = $id(`${prefix}MediaUpload`);
    const image = prefix === 'add' ? this.addFeaturedImage : this.editFeaturedImage;
    if (!image) { 
      if (wrap) wrap.innerHTML = ''; 
      if (uploadBox) uploadBox.style.display = ''; 
      return; 
    }
    if (uploadBox) uploadBox.style.display = 'none';
    if (wrap) {
      wrap.innerHTML = `<div class="pa-media-preview"><img src="${image.url}" alt="${escapeHtml(image.name)}" /><button type="button" class="pa-media-preview-remove" aria-label="Remove image"><i class="ri-close-line"></i></button></div>`;
      const removeBtn = wrap.querySelector('.pa-media-preview-remove');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          if (prefix === 'add') this.addFeaturedImage = null; else this.editFeaturedImage = null;
          this.renderFeaturedPreview(prefix);
        });
      }
    }
  }

  renderGalleryGrid(prefix) {
    const grid = $id(`${prefix}GalleryGrid`);
    const images = prefix === 'add' ? this.addGalleryImages : this.editGalleryImages;
    if (!grid) return;
    grid.innerHTML = images.map((img, i) => `<div class="pa-gallery-thumb"><img src="${img.url}" alt="${escapeHtml(img.name || 'Gallery image')}" /><div class="pa-gallery-thumb-remove" data-i="${i}" role="button" aria-label="Remove image"><i class="ri-close-line"></i></div></div>`).join('');
    grid.querySelectorAll('.pa-gallery-thumb-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.i, 10);
        if (prefix === 'add') this.addGalleryImages.splice(i, 1); else this.editGalleryImages.splice(i, 1);
        this.renderGalleryGrid(prefix);
      });
    });
  }

  setupMediaUpload(prefix) {
    const uploadBox = $id(`${prefix}MediaUpload`);
    const fileInput = $id(`${prefix}FeaturedFile`);
    if (!uploadBox || !fileInput) return;
    this.on(uploadBox, 'click', () => fileInput.click());
    this.on(uploadBox, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
    uploadBox.setAttribute('tabindex', '0');
    uploadBox.setAttribute('role', 'button');

    const acceptFile = async (file) => {
      if (!handleFileValidation(file)) return;
      try {
        const uploaded = await uploadCmsFileWithPreview(file, {
          folder: 'projects',
          optimize: { maxWidth: 1920, maxHeight: 1080, quality: 0.88 },
          onPreview: (previewUrl) => {
            const entry = { url: previewUrl, name: file.name };
            if (prefix === 'add') this.addFeaturedImage = entry;
            else this.editFeaturedImage = entry;
            this.renderFeaturedPreview(prefix);
          },
        });
        const entry = { url: uploaded.url, name: uploaded.fileName || file.name };
        if (prefix === 'add') this.addFeaturedImage = entry;
        else this.editFeaturedImage = entry;
        this.renderFeaturedPreview(prefix);
        this.toast('Image uploaded', 'success');
      } catch {
        this.toast('Could not upload that image', 'danger');
      }
    };

    this.on(fileInput, 'change', async () => {
      const file = fileInput.files[0];
      fileInput.value = '';
      if (file) await acceptFile(file);
    });
    ['dragenter', 'dragover'].forEach((evt) => this.on(uploadBox, evt, (e) => { e.preventDefault(); uploadBox.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach((evt) => this.on(uploadBox, evt, (e) => { e.preventDefault(); uploadBox.classList.remove('dragover'); }));
    this.on(uploadBox, 'drop', async (e) => { const file = e.dataTransfer.files?.[0]; if (file) await acceptFile(file); });
  }

  setupMediaPicker(prefix, target) {
    const btnId = `${prefix}${target === 'gallery' ? 'Gallery' : 'Featured'}PickBtn`;
    const btn = $id(btnId);
    if (!btn) return;

    this.on(btn, 'click', () => {
      mediaPicker.open({
        mode: target,
        folder: 'projects',
        returnFocus: btn,
        onSelect: (item) => {
          const entry = { url: item.url, name: item.name || 'Selected image' };
          if (target === 'gallery') {
            if (prefix === 'add') this.addGalleryImages.push(entry);
            else this.editGalleryImages.push(entry);
            this.renderGalleryGrid(prefix);
            this.toast('Gallery image added from media library', 'success');
            return;
          }

          if (prefix === 'add') this.addFeaturedImage = entry;
          else this.editFeaturedImage = entry;

          const imageUrlEl = $id(`${prefix}ImageUrl`);
          if (imageUrlEl) imageUrlEl.value = item.url;
          this.renderFeaturedPreview(prefix);
          this.toast('Featured image selected from media library', 'success');
        },
      });
    });
  }

  setupGalleryUpload(prefix) {
    const uploadBox = $id(`${prefix}GalleryUpload`);
    const fileInput = $id(`${prefix}GalleryFile`);
    if (!uploadBox || !fileInput) return;
    this.on(uploadBox, 'click', () => fileInput.click());
    this.on(fileInput, 'change', async () => {
      const files = Array.from(fileInput.files || []);
      for (const file of files) {
        if (!handleFileValidation(file)) continue;
        try {
          const uploaded = await uploadCmsFileWithPreview(file, {
            folder: 'projects',
            optimize: { maxWidth: 1920, maxHeight: 1080, quality: 0.88 },
          });
          const entry = { url: uploaded.url, name: uploaded.fileName || file.name };
          if (prefix === 'add') this.addGalleryImages.push(entry);
          else this.editGalleryImages.push(entry);
        } catch { /* skip failed upload */ }
      }
      this.renderGalleryGrid(prefix);
      if (files.length) this.toast(`${files.length} image${files.length > 1 ? 's' : ''} added to gallery`, 'success');
      fileInput.value = '';
    });
  }

  validateForm(prefix) {
    this.clearFormErrors(prefix);
    let valid = true;

    const titleEl = $id(`${prefix}Title`);
    const title = titleEl ? titleEl.value.trim() : '';
    if (!title) { this.showFieldError(prefix, 'Title'); valid = false; }

    const categoryEl = $id(`${prefix}Category`);
    const category = categoryEl ? categoryEl.value : '';
    if (!category) { this.showFieldError(prefix, 'Category'); valid = false; }

    const shortDescEl = $id(`${prefix}ShortDesc`);
    const shortDesc = shortDescEl ? shortDescEl.value.trim() : '';
    if (!shortDesc) { this.showFieldError(prefix, 'ShortDesc'); valid = false; }

    const fullDescEl = $id(`${prefix}FullDesc`);
    const fullDesc = fullDescEl ? fullDescEl.textContent.trim() : '';
    if (!fullDesc) { this.showFieldError(prefix, 'FullDesc', true); valid = false; }

    const techChipsEl = $id(`${prefix}TechChips`);
    const tags = techChipsEl ? getChipValues(techChipsEl) : [];
    if (tags.length === 0) { this.showFieldError(prefix, 'Tech'); valid = false; }

    const liveUrlEl = $id(`${prefix}LiveUrl`);
    const liveUrl = liveUrlEl ? liveUrlEl.value.trim() : '';
    const repoUrlEl = $id(`${prefix}RepoUrl`);
    const repoUrl = repoUrlEl ? repoUrlEl.value.trim() : '';
    if (liveUrl && !isValidUrl(liveUrl)) { this.toast('Live URL is not valid — include https://', 'danger'); valid = false; }
    if (repoUrl && !isValidUrl(repoUrl)) { this.toast('GitHub Repository URL is not valid — include https://', 'danger'); valid = false; }

    if (!valid) {
      const generalFieldsInvalid = !title || !category || !shortDesc || !fullDesc || tags.length === 0;
      if (generalFieldsInvalid) activateTab(prefix, 'general');
    }

    return { valid, title, category, shortDesc, fullDesc, tags, liveUrl, repoUrl };
  }

  async handleAddSubmit() {
    if (PAGE !== 'projects') return;
    const result = this.validateForm('add');
    if (!result.valid) {
      this.toast('Please fill in all required fields', 'danger');
      const generalIncomplete = !result.title || !result.category || !result.shortDesc || !result.fullDesc || result.tags.length === 0;
      this.addStep = generalIncomplete ? 'general' : 'additional';
      this.updateAddStepUi();
      return;
    }

    const statusEl = $id('addStatus');
    const status = statusEl ? statusEl.value : 'Completed';
    const featuredEl = $id('addFeatured');
    const featured = featuredEl ? featuredEl.value === '1' : false;
    const sortOrderRawEl = $id('addSortOrder');
    const sortOrderRaw = sortOrderRawEl ? sortOrderRawEl.value : '';
    const categoryEl = $id('addCategory');
    const category = categoryEl ? categoryEl.value : '';
    const imageUrlEl = $id('addImageUrl');
    const imageUrl = imageUrlEl ? imageUrlEl.value.trim() : '';

    const newProject = {
      id: this.nextId++, title: result.title, catKey: category, desc: result.shortDesc, fullDesc: result.fullDesc,
      tags: result.tags, featured, scene: pickSceneForCategory(category), liveUrl: result.liveUrl, repoUrl: result.repoUrl,
      status, sortOrder: sortOrderRaw ? parseInt(sortOrderRaw, 10) : this.store.get('records').length + 1,
      imageUrl: (this.addFeaturedImage && this.addFeaturedImage.url) || imageUrl || '',
      bannerImgUrl: (this.addFeaturedImage && this.addFeaturedImage.url) || imageUrl || '',
      gallery: this.addGalleryImages.slice(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const prev = this.store.get('records');
    this.store.set('records', prev.concat(newProject));
    try {
      await this.persist();
      closePanels();
      this.resetFilters();
      this.render();
      this.statusToast(`"${newProject.title}" added successfully!`, 'success');
      this.notify(`New project "${newProject.title}" was added.`, 'ri-add-circle-line');
    } catch {
      this.store.set('records', prev);
      this.statusToast('Could not save project. Please try again.', 'danger');
    }
  }

  async handleEditSubmit() {
    if (PAGE !== 'projects' || this.currentEditId == null) return;
    const result = this.validateForm('edit');
    if (!result.valid) { this.toast('Please fill in all required fields', 'danger'); return; }

    const p = this.findById(this.currentEditId);
    if (!p) return;

    const snapshot = { ...p, tags: [...(p.tags || [])], gallery: [...(p.gallery || [])] };
    p.title = result.title;
    const catKeyEl = $id('editCategory');
    p.catKey = catKeyEl ? catKeyEl.value : p.catKey;
    p.desc = result.shortDesc;
    p.fullDesc = result.fullDesc;
    p.tags = result.tags;
    p.liveUrl = result.liveUrl;
    p.repoUrl = result.repoUrl;
    const statusEl = $id('editStatus');
    p.status = statusEl ? statusEl.value : p.status;
    const featuredEl = $id('editFeatured');
    p.featured = featuredEl ? featuredEl.value === '1' : p.featured;
    const sortOrderRawEl = $id('editSortOrder');
    const sortOrderRaw = sortOrderRawEl ? sortOrderRawEl.value : '';
    p.sortOrder = sortOrderRaw ? parseInt(sortOrderRaw, 10) : p.sortOrder;
    const imageUrlEl = $id('editImageUrl');
    const img = (this.editFeaturedImage && this.editFeaturedImage.url) || (imageUrlEl ? imageUrlEl.value.trim() : '') || '';
    p.imageUrl = img;
    p.bannerImgUrl = img;
    p.gallery = this.editGalleryImages.slice();
    if (!SCENES[p.scene]) p.scene = pickSceneForCategory(p.catKey);
    p.updatedAt = new Date().toISOString();

    try {
      await this.persist();
      closePanels();
      this.render();
      this.statusToast(`"${p.title}" updated successfully!`, 'success');
      this.notify(`"${p.title}" was updated.`, 'ri-pencil-line');
    } catch {
      Object.assign(p, snapshot);
      p.tags = snapshot.tags;
      p.gallery = snapshot.gallery;
      this.statusToast('Could not save project. Please try again.', 'danger');
    }
  }

  bindEvents() {
    registerPanel('paAddPanel');
    registerPanel('paEditPanel');

    this.setupMediaUpload('add');
    this.setupMediaUpload('edit');
    this.setupGalleryUpload('add');
    this.setupGalleryUpload('edit');
    this.setupMediaPicker('add', 'featured');
    this.setupMediaPicker('add', 'gallery');
    this.setupMediaPicker('edit', 'featured');
    this.setupMediaPicker('edit', 'gallery');
    setupRte('addRteWrap', 'addFullDesc');
    setupRte('editRteWrap', 'editFullDesc');

    const addNewBtn = $id('paAddNewBtn');
    if (addNewBtn) this.on(addNewBtn, 'click', () => this.openAddPanel());
    
    const addPanelClose = $id('paAddPanelClose');
    if (addPanelClose) this.on(addPanelClose, 'click', () => closePanels());
    
    const editPanelClose = $id('paEditPanelClose');
    if (editPanelClose) this.on(editPanelClose, 'click', () => closePanels());
    
    const addCancel = $id('paAddCancel');
    if (addCancel) this.on(addCancel, 'click', () => closePanels());
    
    const editCancel = $id('paEditCancel');
    if (editCancel) this.on(editCancel, 'click', () => closePanels());
    
    const addSubmit = $id('paAddSubmit');
    if (addSubmit) this.on(addSubmit, 'click', () => { void this.onAddPrimary(); });

    document.querySelectorAll('.pa-panel-tab[data-panel="add"]').forEach((btn) => {
      this.on(btn, 'click', () => {
        this.addStep = btn.dataset.tab;
        this.updateAddStepUi();
      });
    });

    const editSubmit = $id('paEditSubmit');
    if (editSubmit) this.on(editSubmit, 'click', () => { void this.handleEditSubmit(); });
    
    const editDelete = $id('paEditDelete');
    if (editDelete) {
      this.on(editDelete, 'click', () => {
        const p = this.findById(this.currentEditId);
        if (p) requestDelete(p.id, 'project', p.title);
      });
    }

    const addTechFromInput = (prefix) => {
      const input = $id(`${prefix}TechInput`);
      const chips = $id(`${prefix}TechChips`);
      if (!input || !chips) return;
      addChip(chips, input.value);
      input.value = '';
      input.focus();
    };

    const addTechInput = $id('addTechInput');
    if (addTechInput) {
      this.on(addTechInput, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          addTechFromInput('add');
        }
      });
    }

    const addTechAddBtn = $id('addTechAddBtn');
    if (addTechAddBtn) this.on(addTechAddBtn, 'click', () => addTechFromInput('add'));

    const editTechInput = $id('editTechInput');
    if (editTechInput) {
      this.on(editTechInput, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          addTechFromInput('edit');
        }
      });
    }

    const editTechAddBtn = $id('editTechAddBtn');
    if (editTechAddBtn) this.on(editTechAddBtn, 'click', () => addTechFromInput('edit'));

    ['addShortDesc', 'editShortDesc'].forEach((id) => {
      const el = $id(id);
      if (el) {
        this.on(el, 'input', (e) => {
          const counter = $id(`${id}Count`);
          if (counter) counter.textContent = e.target.value.length;
        });
      }
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
    
    const searchClear = $id('paSearchClear');
    if (searchClear) {
      this.on(searchClear, 'click', () => {
        if (!searchInput) return;
        searchInput.value = '';
        this.store.set('searchQuery', '');
        $id('paSearchWrap')?.classList.remove('has-value');
        this.render();
      });
    }
    
    const categoryFilter = $id('paCategoryFilter');
    if (categoryFilter) {
      this.on(categoryFilter, 'change', (e) => { 
        this.store.update({ categoryFilter: e.target.value, page: 1 }); 
        this.render(); 
      });
    }

    $all('#paProjStatusTabs .pa-status-tab').forEach((tab) => {
      this.on(tab, 'click', () => {
        this.store.update({ statusFilter: tab.dataset.projFilter || 'all', page: 1 });
        this.render();
      });
    });
    
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

    this.onBus('confirm:confirmed', ({ id, type }) => { 
      if (type === 'project') this.deleteById(id); 
    });
    this.onBus('shortcut:new-item', ({ page }) => { 
      if (page === PAGE) this.openAddPanel(); 
    });
  }
}