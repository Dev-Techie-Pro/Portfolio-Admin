import { Module } from './Module.js';
import { $id, $all } from '../utils/dom.js';
import { sortByNewestFirst } from '../utils/format.js';
import { requestDelete } from '../modules/shell/confirm.js';
import { closeAllCardMenus, toggleCardMenu } from '../modules/shell/cardMenu.js';
import { openPanel, closePanels, activateTab, registerPanel } from '../modules/shell/panels.js';
import { PAGE } from './router.js';
import { BulkSelectController } from './BulkSelectController.js';

/**
 * CrudCardModule — generic engine behind every "grid of cards with
 * search/filter/pagination + Add/Edit slide-over panel" feature module.
 *
 * Categories, Technologies, Testimonials, Blog Posts, and Experience are
 * all instances of exactly this pattern (this is the duplication the
 * refactor's `attach*CardListeners` / `duplicate*` / `copy*Field` /
 * pagination consolidation targets). Projects and Media extend it too but
 * override/add pieces (rich media uploads, gallery, bulk-select) on top.
 *
 * A concrete module supplies a declarative `config` (see constructor JSDoc)
 * plus a handful of small override methods; this class supplies:
 *  - load/save via {@link Module#loadRecords}/{@link Module#saveRecords}
 *  - filtering + sorting + pagination
 *  - grid rendering + empty states
 *  - card action wiring (edit / delete / duplicate / copy-field / more-menu)
 *  - Add/Edit panel open/close, tab reset, focus management
 *  - submit handling with validation, simulated latency, toast + notification
 *  - delete confirmation via the shared confirm dialog (event-bus wired)
 *
 * Subclasses MUST override: `seedData()`, `renderCard()`, `resetAddForm()`,
 * `populateEditForm()`, `validateForm()`, `buildNewRecord()`, `applyEditToRecord()`.
 * Subclasses MAY override: `matchesSearch()`, `matchesFilters()`, `sortRecords()`,
 * `getDeleteName()`, `getDeleteExtraInfo()`, `onAfterRender()`.
 */
export class CrudCardModule extends Module {
  /**
   * @param {object} config
   * @param {string} config.name
   * @param {string} config.storageKey
   * @param {string} config.deleteType Matches the `type` passed to `requestDelete`.
   * @param {string} config.idField Primary key field name (default "id").
   * @param {number} [config.pageSize=9]
   * @param {object} config.ids DOM id map — see individual modules for the full set:
   *   { grid, resultCount, paginationBtns, paginationInfo, pagePrev, pageNext, bodyScroll,
   *     emptyResetBtn, emptyAddBtn, addPanel, editPanel, addSubmit, editSubmit, editDelete,
   *     addNewBtn, addPanelClose, editPanelClose, addCancel, editCancel }
   */
  constructor(config) {
    super({
      name: config.name,
      storageKey: config.storageKey,
      initialState: {
        records: [],
        searchQuery: '',
        filters: { ...(config.defaultFilters || {}) },
        page: 1,
        viewMode: 'grid',
      },
    });
    this.config = { idField: 'id', pageSize: 9, ...config };
    this.currentEditId = null;
    this.nextId = 1;

    this.bulkSelect = config.bulkSelect === false ? null : new BulkSelectController(this, {
      containerId: this.config.ids.grid,
      itemSelector: '.pa-card',
      idAttr: this.config.cardIdAttr || 'data-id',
      label: config.bulkLabel || 'item',
      getVisibleIds: () => this.getFiltered().map((r) => r[this.config.idField]),
      onBulkDelete: (ids) => this.bulkDelete(ids),
    });
  }

  async bulkDelete(ids) {
    const n = ids.size;
    if (n === 0) return;
    const records = this.store.get('records');
    const removed = records.filter((r) => ids.has(String(r[this.config.idField])));
    const prev = records;
    this.store.set('records', records.filter((r) => !ids.has(String(r[this.config.idField]))));
    try {
      await this.persist();
      this.render();
      const label = this.config.bulkLabel || 'item';
      this.statusToast(`${n} ${label}${n > 1 ? 's' : ''} deleted.`, 'danger');
      this.notify(`${n} ${label}${n > 1 ? 's' : ''} deleted in bulk.`, 'ri-delete-bin-line');
    } catch {
      this.store.set('records', prev);
      this.render();
      this.statusToast('Could not delete items. Please try again.', 'danger');
    }
    return removed;
  }


  /** @returns {Array<object>} fresh seed/demo records. */
  seedData() { throw new Error(`${this.name}: seedData() not implemented`); }
  /** @returns {string} HTML for one card. */
  renderCard(/* record, index */) { throw new Error(`${this.name}: renderCard() not implemented`); }
  resetAddForm() { throw new Error(`${this.name}: resetAddForm() not implemented`); }
  populateEditForm(/* record */) { throw new Error(`${this.name}: populateEditForm() not implemented`); }
  /** @returns {{valid:boolean, [field:string]: any}} */
  validateForm(/* prefix */) { throw new Error(`${this.name}: validateForm() not implemented`); }
  buildNewRecord(/* validatedFields */) { throw new Error(`${this.name}: buildNewRecord() not implemented`); }
  applyEditToRecord(/* record, validatedFields */) { throw new Error(`${this.name}: applyEditToRecord() not implemented`); }


  matchesSearch(record, query) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return JSON.stringify(record).toLowerCase().includes(q);
  }

  matchesFilters(/* record, filters */) { return true; }

  sortRecords(records) { return sortByNewestFirst(records); }

  getDeleteName(record) { return record.title || record.name || record.label || ''; }

  getDeleteExtraInfo(/* record */) { return ''; }

  onAfterRender() {}


  async load() {
    const records = await this.loadRecords(() => this.seedData());
    const maxId = Math.max(0, ...records.map((r) => Number(r[this.config.idField]) || 0));
    this.nextId = maxId + 1;
    this.store.set('records', records);
  }

  async persist() {
    await this.saveRecords(this.store.get('records'));
  }

  bindEvents() {
    const { ids } = this.config;
    registerPanel(ids.addPanel);
    registerPanel(ids.editPanel);

    this.on($id(ids.addNewBtn), 'click', () => this.openAddPanel());
    this.on($id(ids.addPanelClose), 'click', () => closePanels());
    this.on($id(ids.editPanelClose), 'click', () => closePanels());
    this.on($id(ids.addCancel), 'click', () => closePanels());
    this.on($id(ids.editCancel), 'click', () => closePanels());
    this.on($id(ids.addSubmit), 'click', () => { void this.handleAddSubmit(); });
    this.on($id(ids.editSubmit), 'click', () => { void this.handleEditSubmit(); });
    if (ids.editDelete) {
      this.on($id(ids.editDelete), 'click', () => {
        const record = this.findById(this.currentEditId);
        if (record) requestDelete(record[this.config.idField], this.config.deleteType, this.getDeleteName(record), this.getDeleteExtraInfo(record));
      });
    }

    const searchInput = $id('paSearchInput');
    if (searchInput) {
      this.on(searchInput, 'input', () => {
        this.store.set('searchQuery', searchInput.value);
        this.store.set('page', 1);
        $id('paSearchWrap')?.classList.toggle('has-value', !!searchInput.value);
        this.render();
      });
    }
    this.on($id('paSearchClear'), 'click', () => {
      if (!searchInput) return;
      searchInput.value = '';
      this.store.set('searchQuery', '');
      $id('paSearchWrap')?.classList.remove('has-value');
      this.render();
    });

    (this.config.filterSelectIds || []).forEach((filterId) => {
      const el = $id(filterId.id);
      if (!el) return;
      this.on(el, 'change', () => {
        this.store.update({ filters: { ...this.store.get('filters'), [filterId.key]: el.value }, page: 1 });
        this.render();
      });
    });

    const gridBtn = $id('paGridViewBtn');
    const listBtn = $id('paListViewBtn');
    
    if (gridBtn) {
      const parent = gridBtn.parentNode;
      const newGridBtn = gridBtn.cloneNode(true);
      parent.replaceChild(newGridBtn, gridBtn);
      this.on(newGridBtn, 'click', () => this._setViewMode('grid'));
    }
    
    if (listBtn) {
      const parent = listBtn.parentNode;
      const newListBtn = listBtn.cloneNode(true);
      parent.replaceChild(newListBtn, listBtn);
      this.on(newListBtn, 'click', () => this._setViewMode('list'));
    }

    this.onBus('confirm:confirmed', ({ id, type }) => {
      if (type !== this.config.deleteType) return;
      void this.deleteById(id);
    });
    this.onBus('shortcut:new-item', ({ page }) => {
      if (page === PAGE) this.openAddPanel();
    });
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

  _setViewMode(mode) {
    this.store.set('viewMode', mode);
    
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
    
    this.render();
  }


  getFiltered() {
    const { records, searchQuery, filters } = this.store._raw;
    let results = this.sortRecords(records.slice());
    results = results.filter((r) => this.matchesFilters(r, filters));
    if (searchQuery && searchQuery.trim()) {
      results = results.filter((r) => this.matchesSearch(r, searchQuery));
    }
    return results;
  }

  findById(id) {
    return this.store.get('records').find((r) => String(r[this.config.idField]) === String(id));
  }


  renderStats() {}

  render() {
    this.renderStats();
    const { ids, pageSize } = this.config;
    const all = this.getFiltered();
    const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
    let page = this.store.get('page');
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    if (page !== this.store.get('page')) this.store.set('page', page);

    const start = (page - 1) * pageSize;
    const pageItems = all.slice(start, start + pageSize);

    const grid = $id(ids.grid);
    if (grid) {
      grid.classList.toggle('list-view', this.store.get('viewMode') === 'list');
      if (pageItems.length === 0) {
        grid.innerHTML = this._emptyStateHtml();
        this.on($id(ids.emptyResetBtn), 'click', () => this.resetFilters());
        this.on($id(ids.emptyAddBtn), 'click', () => this.openAddPanel());
      } else {
        grid.innerHTML = pageItems.map((r, i) => this.renderCard(r, i)).join('');
      }
    }

    const resultCount = $id(ids.resultCount);
    const total = this.store.get('records').length;
    if (resultCount) {
      resultCount.textContent = all.length === total ? `${total} total` : `${all.length} of ${total}`;
    }

    this.renderPagination(all.length, totalPages, page);
    this.attachCardListeners();
    this.bulkSelect?.onRender();
    this.onAfterRender();
    this.setViewModeFromStore();
  }

  _emptyStateHtml() {
    const hasFilters = !!(this.store.get('searchQuery') || '').trim() || Object.values(this.store.get('filters')).some((v) => v && v !== 'all');
    return `<div class="pa-empty-state"><i class="ri-folder-open-line"></i><div class="pa-empty-state-title">${hasFilters ? 'No results match your filters' : 'Nothing here yet'}</div><div class="pa-empty-state-text">${hasFilters ? "Try adjusting your search or filters to find what you're looking for." : 'Get started by adding your first item.'}</div>${hasFilters ? `<button class="pa-empty-state-btn" id="${this.config.ids.emptyResetBtn}">Reset filters</button>` : `<button class="pa-empty-state-btn" id="${this.config.ids.emptyAddBtn}">+ Add New</button>`}</div>`;
  }

  renderPagination(totalItems, totalPages, page) {
    const { ids, pageSize } = this.config;
    const btnsWrap = $id(ids.paginationBtns);
    const info = $id(ids.paginationInfo);
    if (!btnsWrap || !info) return;

    if (totalItems === 0) {
      btnsWrap.innerHTML = '';
      info.textContent = 'Showing 0 of 0';
      return;
    }

    let html = `<div class="pa-page-nav ${page === 1 ? 'disabled' : ''}" id="${ids.pagePrev}" role="button" aria-label="Previous page"><i class="ri-arrow-left-s-line"></i></div>`;
    let lastShown = 0;
    for (let p = 1; p <= totalPages; p++) {
      const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
      if (!show) continue;
      if (p - lastShown > 1) html += `<span style="color:var(--pa-text-faint); padding:0 4px; font-size:12px;">…</span>`;
      html += `<button class="pa-page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
      lastShown = p;
    }
    html += `<div class="pa-page-nav ${page === totalPages ? 'disabled' : ''}" id="${ids.pageNext}" role="button" aria-label="Next page"><i class="ri-arrow-right-s-line"></i></div>`;
    btnsWrap.innerHTML = html;

    const startN = (page - 1) * pageSize + 1;
    const endN = Math.min(page * pageSize, totalItems);
    info.textContent = `Showing ${startN} to ${endN} of ${totalItems}`;

    btnsWrap.querySelectorAll('.pa-page-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.store.set('page', parseInt(btn.dataset.page, 10));
        this.render();
        $id(ids.bodyScroll)?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
    const prevBtn = $id(ids.pagePrev);
    const nextBtn = $id(ids.pageNext);
    if (prevBtn && !prevBtn.classList.contains('disabled')) {
      prevBtn.addEventListener('click', () => { this.store.set('page', page - 1); this.render(); });
    }
    if (nextBtn && !nextBtn.classList.contains('disabled')) {
      nextBtn.addEventListener('click', () => { this.store.set('page', page + 1); this.render(); });
    }
  }

  resetFilters() {
    this.store.batch(() => {
      this.store.set('searchQuery', '');
      this.store.set('filters', { ...(this.config.defaultFilters || {}) });
      this.store.set('page', 1);
    });
    const searchInput = $id('paSearchInput');
    if (searchInput) {
      searchInput.value = '';
      $id('paSearchWrap')?.classList.remove('has-value');
    }
    (this.config.filterSelectIds || []).forEach((f) => {
      const el = $id(f.id);
      if (el) el.value = 'all';
    });
    this.render();
  }

  attachCardListeners() {
    const grid = $id(this.config.ids.grid);
    if (!grid) return;
    const idAttr = this.config.cardIdAttr || 'data-id';

    $all('.pa-action-edit', grid).forEach((btn) => {
      btn.addEventListener('click', () => this.openEditPanel(btn.getAttribute(idAttr) ?? btn.dataset.id));
    });
    $all('.pa-action-delete', grid).forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute(idAttr) ?? btn.dataset.id;
        const record = this.findById(id);
        if (record) requestDelete(record[this.config.idField], this.config.deleteType, this.getDeleteName(record), this.getDeleteExtraInfo(record));
      });
    });
    $all('.pa-action-more', grid).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = btn.parentElement.querySelector('.pa-card-menu');
        if (menu) toggleCardMenu(menu, btn);
      });
    });
    $all('.pa-card-menu-item', grid).forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = item.getAttribute(idAttr) ?? item.dataset.id;
        const action = item.dataset.action;
        closeAllCardMenus();
        if (action === 'edit') this.openEditPanel(id);
        else if (action === 'duplicate') this.duplicateRecord(id);
        else if (action === 'delete') {
          const record = this.findById(id);
          if (record) requestDelete(record[this.config.idField], this.config.deleteType, this.getDeleteName(record), this.getDeleteExtraInfo(record));
        } else if (this.config.menuActions?.[action]) {
          this.config.menuActions[action].call(this, id);
        }
      });
    });
  }

  async duplicateRecord(id) {
    const record = this.findById(id);
    if (!record) return;
    const copy = this.config.buildDuplicate
      ? this.config.buildDuplicate.call(this, record, this.nextId++)
      : { ...record, [this.config.idField]: this.nextId++ };
    const records = this.store.get('records').concat(copy);
    this.store.set('records', records);
    try {
      await this.persist();
      this.render();
      this.statusToast(`Duplicated "${this.getDeleteName(record)}"`, 'success');
      this.notify(`"${this.getDeleteName(record)}" was duplicated.`, 'ri-file-copy-line');
    } catch {
      this.store.set('records', this.store.get('records').filter((r) => r[this.config.idField] !== copy[this.config.idField]));
      this.statusToast('Could not duplicate item. Please try again.', 'danger');
    }
  }

  async deleteById(id) {
    const record = this.findById(id);
    if (!record) return;
    const name = this.getDeleteName(record);
    const records = this.store.get('records').filter((r) => String(r[this.config.idField]) !== String(id));
    this.store.set('records', records);
    try {
      await this.persist();
      closePanels();
      this.currentEditId = null;
      this.render();
      if (name) {
        this.statusToast(`"${name}" was deleted.`, 'danger');
        this.notify(`"${name}" was deleted.`, 'ri-delete-bin-line');
      }
    } catch {
      this.store.set('records', this.store.get('records').concat(record));
      this.statusToast('Could not delete item. Please try again.', 'danger');
    }
  }

  openAddPanel() {
    if (PAGE !== this.config.page) return;
    this.resetAddForm();
    openPanel(this.config.ids.addPanel, [this.config.ids.editPanel]);
    activateTab(this.config.tabGroup || this.config.ids.addPanel, 'general');
    const focusId = this.config.addFocusId;
    if (focusId) setTimeout(() => $id(focusId)?.focus(), 320);
  }

  openEditPanel(id) {
    if (PAGE !== this.config.page) return;
    const record = this.findById(id);
    if (!record) return;
    this.currentEditId = id;
    this.populateEditForm(record);
    openPanel(this.config.ids.editPanel, [this.config.ids.addPanel]);
    activateTab(this.config.tabGroup || this.config.ids.editPanel, 'general');
    const focusId = this.config.editFocusId;
    if (focusId) setTimeout(() => $id(focusId)?.focus(), 320);
  }

  async handleAddSubmit() {
    if (PAGE !== this.config.page) return;
    const result = this.validateForm('add');
    if (!result.valid) {
      this.toast('Please fill in all required fields', 'danger');
      return;
    }
    const newRecord = this.buildNewRecord(result);
    newRecord[this.config.idField] = this.nextId++;
    const prev = this.store.get('records');
    this.store.set('records', prev.concat(newRecord));
    try {
      await this.persist();
      closePanels();
      this.resetFilters();
      this.render();
      this.statusToast(`"${this.getDeleteName(newRecord)}" added successfully!`, 'success');
      this.notify(`New item "${this.getDeleteName(newRecord)}" was added.`, 'ri-add-circle-line');
    } catch {
      this.store.set('records', prev);
      this.statusToast('Could not save item. Please try again.', 'danger');
    }
  }

  async handleEditSubmit() {
    if (PAGE !== this.config.page || this.currentEditId == null) return;
    const result = this.validateForm('edit');
    if (!result.valid) {
      this.toast('Please fill in all required fields', 'danger');
      return;
    }
    const record = this.findById(this.currentEditId);
    if (!record) return;
    const snapshot = { ...record };
    this.applyEditToRecord(record, result);
    this.store.set('records', this.store.get('records').slice());
    try {
      await this.persist();
      closePanels();
      this.render();
      this.statusToast(`"${this.getDeleteName(record)}" updated successfully!`, 'success');
      this.notify(`"${this.getDeleteName(record)}" was updated.`, 'ri-pencil-line');
    } catch {
      Object.assign(record, snapshot);
      this.statusToast('Could not save changes. Please try again.', 'danger');
    }
  }
}