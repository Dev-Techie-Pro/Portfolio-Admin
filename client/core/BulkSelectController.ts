import { $id } from '../utils/dom.js';
import { requestBulkAction } from '../modules/shell/confirm.js';

const DEFAULT_IDS = {
  selectBtn: 'paSelectModeBtn',
  bar: 'paBulkActionBar',
  count: 'paBulkSelectedCount',
  selectAllBtn: 'paBulkSelectAllBtn',
  clearBtn: 'paBulkClearBtn',
  deleteBtn: 'paBulkDeleteBtn',
};

export class BulkSelectController {
  /**
   * @param {object} module The owning module (needs `.render()`, and optionally `.toast()`).
   * @param {object} opts
   * @param {string} opts.containerId DOM id of the grid/table-body holding the items.
   * @param {string} [opts.itemSelector='.pa-card'] Selector for one selectable item within the container.
   * @param {string} opts.idAttr Attribute on the item element holding its id (e.g. 'data-blog-id').
   * @param {string} [opts.label='item'] Singular noun used in bar/dialog copy.
   * @param {() => Array<string|number>} opts.getVisibleIds Ids currently visible (for "Select All").
   * @param {(ids: Set<string>) => void|Promise<void>} opts.onBulkDelete Called with the confirmed id set.
   * @param {(id: string|number) => boolean} [opts.canSelect] When provided, ids that return false cannot be selected.
   * @param {object} [opts.ids] Override any of the shared DOM ids (see DEFAULT_IDS).
   */
  constructor(module, opts) {
    this.module = module;
    this.opts = { itemSelector: '.pa-card', label: 'item', ...opts };
    this.ids = { ...DEFAULT_IDS, ...(opts.ids || {}) };
    this.selectMode = false;
    this.selectedIds = new Set();
    this._barBound = false;
    this._containerBound = false;
  }

  isSelectMode() { return this.selectMode; }
  isSelected(id) { return this.selectedIds.has(String(id)); }
  get selectedCount() { return this.selectedIds.size; }

  checkboxHtml(id, ariaLabel = 'Select item') {
    const selected = this.isSelected(id);
    const hiddenStyle = this.selectMode ? '' : 'display:none;';
    return `<div class="pa-select-checkbox${selected ? ' selected' : ''}" data-select-id="${id}" style="${hiddenStyle}" role="checkbox" aria-checked="${selected}" aria-label="${ariaLabel}" tabindex="0"><i class="${selected ? 'ri-checkbox-fill' : 'ri-checkbox-blank-line'}"></i></div>`;
  }

  cardClass(id) { return this.isSelected(id) ? ' pa-selected' : ''; }

  _canSelect(id) {
    const fn = this.opts.canSelect;
    return typeof fn !== 'function' || fn(id);
  }

  onRender() {
    this._bindBar();
    this._bindContainer();
    this._updateBar();
  }

  _bindBar() {
    if (this._barBound) return;
    const selectBtn = $id(this.ids.selectBtn);
    const deleteBtn = $id(this.ids.deleteBtn);
    if (!selectBtn || !deleteBtn) return;

    selectBtn.type = 'button';
    deleteBtn.type = 'button';
    selectBtn.addEventListener('click', () => this.toggleSelectMode());

    const selectAllBtn = $id(this.ids.selectAllBtn);
    if (selectAllBtn) {
      selectAllBtn.type = 'button';
      selectAllBtn.addEventListener('click', () => this.selectAllVisible());
    }
    const clearBtn = $id(this.ids.clearBtn);
    if (clearBtn) {
      clearBtn.type = 'button';
      clearBtn.addEventListener('click', () => this.clearSelection());
    }
    deleteBtn.addEventListener('click', () => this.requestBulkDelete());
    this._barBound = true;
  }

  _bindContainer() {
    if (this._containerBound) return;
    const container = $id(this.opts.containerId);
    if (!container) return;

    container.addEventListener('click', (e) => {
      const box = e.target.closest('[data-select-id]');
      if (box && container.contains(box)) {
        if (box.tagName === 'INPUT' && box.type === 'checkbox') return;
        e.stopPropagation();
        this.toggleSelect(box.dataset.selectId);
        return;
      }
      if (!this.selectMode || this.opts.skipRowClick) return;
      const item = e.target.closest(this.opts.itemSelector);
      if (!item || !container.contains(item)) return;
      if (e.target.closest('.pa-card-actions, .pa-msg-actions, [data-select-id]')) return;
      const id = item.getAttribute(this.opts.idAttr);
      if (id != null) this.toggleSelect(id);
    });

    container.addEventListener('keydown', (e) => {
      const box = e.target.closest('[data-select-id]');
      if (!box || !container.contains(box)) return;
      if (box.tagName === 'INPUT') return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleSelect(box.dataset.selectId);
      }
    });

    container.addEventListener('change', (e) => {
      const box = e.target;
      if (box.tagName !== 'INPUT' || box.type !== 'checkbox' || !box.dataset.selectId) return;
      if (!container.contains(box)) return;
      e.stopPropagation();
      const key = String(box.dataset.selectId);
      if (box.checked) {
        if (!this._canSelect(key)) {
          box.checked = false;
          return;
        }
        this.selectedIds.add(key);
      } else {
        this.selectedIds.delete(key);
      }
      this.module.render();
    });

    this._containerBound = true;
  }

  toggleSelectMode() {
    this.selectMode = !this.selectMode;
    $id(this.ids.selectBtn)?.classList.toggle('active', this.selectMode);
    if (!this.selectMode) this.selectedIds.clear();
    this.module.render();
  }

  toggleSelect(id) {
    const key = String(id);
    if (this.selectedIds.has(key)) {
      this.selectedIds.delete(key);
    } else if (!this._canSelect(key)) {
      this.module.toast?.('This item cannot be selected for deletion.', 'info', 2000);
      return;
    } else {
      this.selectedIds.add(key);
    }
    this.module.render();
  }

  selectAllVisible() {
    const visible = this.opts.getVisibleIds();
    let added = 0;
    visible.forEach((id) => {
      if (!this._canSelect(id)) return;
      this.selectedIds.add(String(id));
      added += 1;
    });
    this.module.render();
    if (added > 0) {
      this.module.toast?.(`Selected ${added} item${added === 1 ? '' : 's'}.`, 'info', 1800);
    } else {
      this.module.toast?.('No deletable items on this page.', 'info', 2000);
    }
  }

  clearSelection() {
    this.selectedIds.clear();
    this.module.render();
    this.module.toast?.('Selection cleared.', 'info', 1500);
  }

  _updateBar() {
    const bar = $id(this.ids.bar);
    if (!bar) return;
    const size = this.selectedIds.size;
    if (this.selectMode && size > 0) {
      bar.style.display = 'flex';
      const count = $id(this.ids.count);
      if (count) count.textContent = `${size} selected`;
    } else {
      bar.style.display = 'none';
    }
  }

  requestBulkDelete() {
    const n = this.selectedIds.size;
    if (n === 0) return;
    const label = this.opts.label;
    requestBulkAction({
      title: `Delete selected ${label}${n > 1 ? 's' : ''}?`,
      message: `This will permanently remove <strong>${n}</strong> selected ${label}${n > 1 ? 's' : ''}. This action cannot be undone.`,
      onConfirm: () => this._performBulkDelete(),
    });
  }

  async _performBulkDelete() {
    const ids = new Set(this.selectedIds);
    if (ids.size === 0) return;
    this.selectedIds.clear();
    await Promise.resolve(this.opts.onBulkDelete(ids));
  }
}
