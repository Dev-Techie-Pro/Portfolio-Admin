import {
  isValidCategoryKey,
  slugify
} from "./chunk-SCZE3YCL.js";
import {
  CrudCardModule,
  setStatTrend,
  setStatValue
} from "./chunk-GL5MUF35.js";
import "./chunk-JRSPEK52.js";
import {
  sortByNewestFirst
} from "./chunk-3FVVIY3E.js";
import "./chunk-RDJAJ7S3.js";
import {
  closePanels
} from "./chunk-WGXNH5AX.js";
import {
  $all,
  $id,
  escapeHtml,
  storage
} from "./chunk-OGR5OR6D.js";

// client/modules/categories/CategoriesModule.ts
var CATEGORY_ICONS = {
  enterprise: "ri-building-2-line",
  educational: "ri-graduation-cap-line",
  desktop: "ri-computer-line",
  medical: "ri-heart-pulse-line",
  ecommerce: "ri-shopping-bag-line",
  travel: "ri-flight-takeoff-line",
  web: "ri-globe-line",
  nonprofit: "ri-hand-heart-line"
};
var DEFAULT_CAT_ICON = "ri-folder-line";
var CATEGORY_CREATED_DATES = {
  enterprise: "Aug 12, 2025",
  ecommerce: "Aug 14, 2025",
  web: "Aug 10, 2025",
  nonprofit: "Aug 8, 2025",
  desktop: "Aug 6, 2025",
  medical: "Aug 4, 2025",
  educational: "Jul 28, 2025",
  travel: "Jul 25, 2025"
};
var CategoriesModule = class extends CrudCardModule {
  constructor() {
    super({
      name: "Categories",
      storageKey: "pa_category_meta",
      deleteType: "category",
      idField: "key",
      page: "categories",
      pageSize: Infinity,
      cardIdAttr: "data-cat-key",
      bulkLabel: "category",
      tabGroup: null,
      addFocusId: "catAddLabel",
      editFocusId: "catEditLabel",
      ids: {
        grid: "paCatGrid",
        resultCount: "paCatResultCount",
        paginationBtns: "paCatPaginationBtns",
        paginationInfo: "paCatPaginationInfo",
        pagePrev: "paCatPagePrev",
        pageNext: "paCatPageNext",
        bodyScroll: "paCatBody",
        emptyResetBtn: "paCatEmptyResetBtn",
        emptyAddBtn: "paCatEmptyAddBtn",
        addPanel: "paCatAddPanel",
        editPanel: "paCatEditPanel",
        addSubmit: "paCatAddSubmit",
        editSubmit: "paCatEditSubmit",
        editDelete: null,
        addNewBtn: "paCatAddNewBtn",
        addPanelClose: "paCatAddPanelClose",
        editPanelClose: "paCatEditPanelClose",
        addCancel: "paCatAddCancel",
        editCancel: "paCatEditCancel"
      },
      menuActions: { "copy-key": function copyKey(key) {
        this.copyCategoryKey(key);
      } },
      defaultFilters: { category: "all" },
      filterSelectIds: [{ id: "paCatCategoryFilter", key: "category" }]
    });
    if (this.bulkSelect) {
      this.bulkSelect.opts.canSelect = (key) => this.isCategoryDeletable(this.findById(key));
    }
    this.addKeyTouched = false;
  }
  generateCategoryKey(label) {
    const base = slugify(label);
    if (!base) return "";
    if (!this.findById(base)) return base;
    let suffix = 2;
    let candidate = `${base}-${suffix}`;
    while (this.findById(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }
  syncAddKeyFromLabel(label) {
    if (this.addKeyTouched) return;
    const keyEl = $id("catAddKey");
    if (!keyEl) return;
    keyEl.value = this.generateCategoryKey(label);
    this._setFieldError("catAddKey", !!keyEl.value);
  }
  isCategoryDeletable(record) {
    if (!record) return false;
    if (record.isBuiltin) return false;
    const count = this._projectCounts?.[record.key];
    return !(typeof count === "number" && count > 0);
  }
  async load() {
    const raw = await storage.get(this.storageKey, null);
    const map = raw && typeof raw === "object" ? raw : {};
    const records = Object.entries(map).map(([key, meta]) => ({ key, ...meta }));
    this.store.set("records", records);
  }
  async persist() {
    const map = {};
    this.store.get("records").forEach((r) => {
      map[r.key] = { label: r.label, desc: r.desc, isBuiltin: r.isBuiltin };
    });
    await this.saveRecords(map);
    storage.invalidate(this.storageKey);
  }
  async getProjectCountForCategory(key) {
    try {
      const projects = await storage.get("pa_projects", []);
      return Array.isArray(projects) ? projects.filter((p) => p.catKey === key).length : "\u2014";
    } catch {
      return "\u2014";
    }
  }
  seedData() {
    return [];
  }
  sortRecords(records) {
    return sortByNewestFirst(records);
  }
  matchesSearch(record, query) {
    const q = query.trim().toLowerCase();
    return record.key.toLowerCase().includes(q) || record.label.toLowerCase().includes(q) || (record.desc || "").toLowerCase().includes(q);
  }
  matchesFilters(record, filters) {
    const cat = filters?.category || "all";
    if (cat === "all") return true;
    return record.key === cat;
  }
  getCategoryIcon(key) {
    return CATEGORY_ICONS[key] || DEFAULT_CAT_ICON;
  }
  getCategoryCreatedDate(record) {
    return CATEGORY_CREATED_DATES[record.key] || "\u2014";
  }
  navigateToProjects(key) {
    try {
      sessionStorage.setItem("pa_projects_cat_filter", key);
    } catch {
    }
    window.location.href = "/projects";
  }
  renderCardMenu(record) {
    const key = escapeHtml(record.key);
    const label = escapeHtml(record.label);
    return `<div class="pa-card-menu" data-cat-key="${key}">
      <div class="pa-card-menu-item" data-action="copy-key" data-cat-key="${key}"><i class="ri-clipboard-line"></i> Copy key</div>
    </div>`;
  }
  populateCategoryFilter() {
    const select = $id("paCatCategoryFilter");
    if (!select) return;
    const current = this.store.get("filters")?.category || "all";
    const records = this.sortRecords(this.store.get("records").slice());
    select.innerHTML = '<option value="all">All Categories</option>' + records.map((r) => `<option value="${escapeHtml(r.key)}">${escapeHtml(r.label)}</option>`).join("");
    select.value = records.some((r) => r.key === current) ? current : "all";
    if (select.value !== current) {
      this.store.set("filters", { ...this.store.get("filters"), category: select.value });
    }
  }
  getDeleteName(record) {
    return record.label;
  }
  getDeleteExtraInfo(record) {
    const count = this._projectCounts?.[record.key];
    if (typeof count === "number" && count > 0) {
      return `This category has ${count} project${count === 1 ? "" : "s"} assigned to it.`;
    }
    if (record.isBuiltin) return "This is a built-in category.";
    return "";
  }
  async deleteById(id) {
    const record = this.findById(id);
    if (!record) return;
    if (record.isBuiltin) {
      this.toast("Built-in categories cannot be deleted.", "danger");
      return;
    }
    const count = this._projectCounts?.[record.key];
    if (typeof count === "number" && count > 0) {
      this.toast(`Cannot delete "${record.label}" \u2014 reassign or remove its ${count} project(s) first.`, "danger");
      return;
    }
    await super.deleteById(id);
  }
  async bulkDelete(ids) {
    const blocked = [];
    const deletable = /* @__PURE__ */ new Set();
    ids.forEach((key) => {
      const record = this.findById(key);
      if (!record) return;
      if (!this.isCategoryDeletable(record)) {
        if (record.isBuiltin) blocked.push(`${record.label} (built-in)`);
        else blocked.push(`${record.label} (has projects)`);
      } else {
        deletable.add(key);
      }
    });
    if (deletable.size === 0) {
      this.toast(`Cannot delete: ${blocked.join(", ")}`, "danger");
      return;
    }
    await super.bulkDelete(deletable);
    if (blocked.length) {
      this.toast(`Skipped ${blocked.length} protected categor${blocked.length === 1 ? "y" : "ies"}: ${blocked.join(", ")}`, "info", 4e3);
    }
  }
  renderCard(record, index) {
    const icon = this.getCategoryIcon(record.key);
    const count = this._projectCounts?.[record.key] ?? "\u2014";
    const key = escapeHtml(record.key);
    const label = escapeHtml(record.label);
    const desc = record.desc || "";
    const descHtml = desc ? escapeHtml(desc) : '<em class="pa-cat-card__desc-empty">No description</em>';
    const countLabel = `${escapeHtml(String(count))} project${count === 1 ? "" : "s"}`;
    const createdDate = escapeHtml(this.getCategoryCreatedDate(record));
    const builtinBadge = record.isBuiltin ? '<span class="pa-cat-card__builtin">Built-in</span>' : "";
    const bulkCheckbox = this.isCategoryDeletable(record) ? this.bulkSelect?.checkboxHtml(record.key, `Select ${label}`) || "" : "";
    const menu = this.renderCardMenu(record);
    return `<div class="pa-card pa-cat-card${this.bulkSelect?.cardClass(record.key) || ""}" data-cat-key="${key}">
      ${bulkCheckbox}
      <div class="pa-cat-card__bg" aria-hidden="true"></div>
      <div class="pa-cat-card__grid">
        <div class="pa-cat-card__top">
          <div class="pa-cat-card__icon"><i class="${icon}"></i></div>
          ${builtinBadge}
        </div>
        <h3 class="pa-cat-card__title" title="${label}">${label}</h3>
        <div class="pa-cat-card__slug"><span class="pa-cat-card__slug-mark" aria-hidden="true">\u25C6</span>${key}</div>
        <p class="pa-cat-card__desc">${descHtml}</p>
        <div class="pa-cat-card__count"><i class="ri-file-list-line"></i><span>${countLabel}</span></div>
        <div class="pa-cat-card__footer">
          <button type="button" class="pa-cat-card__view-btn" data-cat-key="${key}" aria-label="View projects in ${label}">
            <span>View Projects</span><i class="ri-arrow-right-line"></i>
          </button>
          <div class="pa-cat-card__footer-more">
            <button type="button" class="pa-action-btn pa-action-edit" data-cat-key="${key}" title="Edit category" aria-label="Edit ${label}"><i class="ri-pencil-line"></i></button>
            <button type="button" class="pa-action-btn pa-action-delete" data-cat-key="${key}" title="Delete category" aria-label="Delete ${label}"><i class="ri-delete-bin-line"></i></button>
            <button type="button" class="pa-action-btn pa-action-more" data-cat-key="${key}" title="More options" aria-label="More options for ${label}"><i class="ri-more-2-fill"></i></button>
            ${menu}
          </div>
        </div>
      </div>
      <div class="pa-cat-card__list">
        <div class="pa-cat-card__icon"><i class="${icon}"></i></div>
        <div class="pa-cat-card__list-main">
          <div class="pa-cat-card__title" title="${label}">${label}</div>
          <div class="pa-cat-card__slug"><span class="pa-cat-card__slug-mark" aria-hidden="true">\u25C6</span>${key}</div>
          <div class="pa-cat-card__desc">${descHtml}</div>
        </div>
        <div class="pa-cat-card__count"><i class="ri-file-list-line"></i><span>${countLabel}</span></div>
        <div class="pa-cat-card__status">Active</div>
        <div class="pa-cat-card__date">
          <i class="ri-calendar-line"></i>
          <div class="pa-cat-card__date-copy">
            <span class="pa-cat-card__date-label">Created</span>
            <span class="pa-cat-card__date-value">${createdDate}</span>
          </div>
        </div>
        <div class="pa-cat-card__list-actions">
          <button type="button" class="pa-action-btn pa-action-edit" data-cat-key="${key}" title="Edit category" aria-label="Edit ${label}"><i class="ri-pencil-line"></i></button>
          <button type="button" class="pa-action-btn pa-action-delete" data-cat-key="${key}" title="Delete category" aria-label="Delete ${label}"><i class="ri-delete-bin-line"></i></button>
          <button type="button" class="pa-action-btn pa-action-more" data-cat-key="${key}" title="More options" aria-label="More options for ${label}"><i class="ri-more-2-fill"></i></button>
          ${menu}
        </div>
        <button type="button" class="pa-cat-card__chevron" data-cat-key="${key}" aria-label="View projects in ${label}"><i class="ri-arrow-right-s-line"></i></button>
      </div>
    </div>`;
  }
  renderPagination() {
  }
  setViewModeFromStore() {
    const mode = this.store.get("viewMode") || "grid";
    const gridBtn = $id("paCatGridViewBtn") || $id("paGridViewBtn");
    const listBtn = $id("paCatListViewBtn") || $id("paListViewBtn");
    if (gridBtn) {
      gridBtn.classList.toggle("active", mode === "grid");
    }
    if (listBtn) {
      listBtn.classList.toggle("active", mode === "list");
    }
    document.querySelectorAll(".pa-view-btn[data-view]").forEach((btn) => {
      const view = btn.dataset.view;
      if (view === "grid") {
        btn.classList.toggle("active", mode === "grid");
      } else if (view === "list") {
        btn.classList.toggle("active", mode === "list");
      }
    });
  }
  renderStats() {
    const records = this.store.get("records");
    const withProjects = records.filter((r) => (this._projectCounts?.[r.key] || 0) > 0).length;
    setStatValue("paCatStatTotal", records.length);
    setStatValue("paCatStatBuiltin", records.filter((r) => r.isBuiltin).length);
    setStatValue("paCatStatCustom", records.filter((r) => !r.isBuiltin).length);
    setStatValue("paCatStatWithProjects", withProjects);
    setStatTrend("paCatStatTotalTrend", records);
    setStatTrend("paCatStatBuiltinTrend", records, (r) => r.isBuiltin);
    setStatTrend("paCatStatCustomTrend", records, (r) => !r.isBuiltin);
    setStatTrend("paCatStatWithProjectsTrend", records, (r) => (this._projectCounts?.[r.key] || 0) > 0);
  }
  async render() {
    const projects = await storage.get("pa_projects", []);
    this._projectCounts = {};
    if (Array.isArray(projects)) {
      projects.forEach((p) => {
        if (p.catKey) this._projectCounts[p.catKey] = (this._projectCounts[p.catKey] || 0) + 1;
      });
    }
    this.renderStats();
    const { ids } = this.config;
    const all = this.getFiltered();
    const grid = $id(ids.grid);
    if (grid) {
      grid.classList.toggle("list-view", this.store.get("viewMode") === "list");
      if (all.length === 0) {
        const hasFilters = !!(this.store.get("searchQuery") || "").trim() || Object.values(this.store.get("filters")).some((v) => v && v !== "all");
        grid.innerHTML = `<div class="pa-empty-state"><i class="ri-folder-open-line"></i><div class="pa-empty-state-title">${hasFilters ? "No categories match your filters" : "No categories yet"}</div><div class="pa-empty-state-text">${hasFilters ? "Try adjusting your search or filters to find what you're looking for." : "Get started by adding your first category."}</div>${hasFilters ? `<button class="pa-empty-state-btn" id="${ids.emptyResetBtn}">Reset filters</button>` : `<button class="pa-empty-state-btn" id="${ids.emptyAddBtn}">+ Add Category</button>`}</div>`;
        this.on($id(ids.emptyResetBtn), "click", () => this.resetFilters());
        this.on($id(ids.emptyAddBtn), "click", () => this.openAddPanel());
      } else {
        grid.innerHTML = all.map((r, i) => this.renderCard(r, i)).join("");
      }
    }
    const resultCount = $id(ids.resultCount);
    const total = this.store.get("records").length;
    if (resultCount) {
      resultCount.textContent = all.length === total ? `${total} total` : `${all.length} of ${total}`;
    }
    this.populateCategoryFilter();
    this.attachCardListeners();
    this.bulkSelect?.onRender();
    this.onAfterRender();
    this.setViewModeFromStore();
  }
  resetFilters() {
    this.store.batch(() => {
      this.store.set("searchQuery", "");
      this.store.set("filters", { category: "all" });
      this.store.set("page", 1);
    });
    const searchInput = $id("paCatSearchInput");
    if (searchInput) {
      searchInput.value = "";
      $id("paCatSearchWrap")?.classList.remove("has-value");
    }
    const catFilter = $id("paCatCategoryFilter");
    if (catFilter) catFilter.value = "all";
    this.render();
  }
  attachCardListeners() {
    super.attachCardListeners();
    const grid = $id(this.config.ids.grid);
    if (!grid) return;
    $all(".pa-cat-card__view-btn", grid).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const key = btn.getAttribute("data-cat-key");
        if (key) this.navigateToProjects(key);
      });
    });
    $all(".pa-cat-card__chevron", grid).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const key = btn.getAttribute("data-cat-key");
        if (key) this.navigateToProjects(key);
      });
    });
  }
  copyCategoryKey(key) {
    navigator.clipboard?.writeText(key).then(
      () => this.toast(`Copied key "${key}" to clipboard.`, "success", 2e3),
      () => this.toast("Clipboard not available in this context.", "danger")
    );
  }
  resetAddForm() {
    this.addKeyTouched = false;
    ["catAddKey", "catAddLabel", "catAddDesc"].forEach((id) => {
      const el = $id(id);
      if (el) el.value = "";
    });
    $id("catAddDescCount").textContent = "0";
    ["catAddKey", "catAddLabel"].forEach((id) => {
      $id(id + "Error")?.classList.remove("visible");
      $id(id)?.classList.remove("error");
    });
  }
  populateEditForm(record) {
    $id("catEditKey").value = record.key;
    $id("catEditLabel").value = record.label;
    $id("catEditDesc").value = record.desc || "";
    $id("catEditDescCount").textContent = (record.desc || "").length;
    ["catEditLabel"].forEach((id) => {
      $id(id + "Error")?.classList.remove("visible");
      $id(id)?.classList.remove("error");
    });
  }
  _setFieldError(id, valid, message) {
    const input = $id(id);
    const err = $id(id + "Error");
    input?.classList.toggle("error", !valid);
    err?.classList.toggle("visible", !valid);
    if (!valid && message && err) {
      const span = err.querySelector("span");
      if (span) span.textContent = message;
    }
  }
  validateForm(prefix) {
    const isAdd = prefix === "add";
    let valid = true;
    const p = isAdd ? "catAdd" : "catEdit";
    const label = $id(`${p}Label`).value.trim();
    let key = isAdd ? $id("catAddKey").value.trim() : this.currentEditId;
    if (isAdd && !key && label) {
      key = this.generateCategoryKey(label);
      const keyEl = $id("catAddKey");
      if (keyEl) keyEl.value = key;
    }
    if (isAdd) {
      if (!key) {
        this._setFieldError("catAddKey", false, "Category key is required");
        valid = false;
      } else if (!isValidCategoryKey(key)) {
        this._setFieldError("catAddKey", false, 'Key must be lowercase letters, digits, or hyphens (e.g. "my-cat")');
        valid = false;
      } else if (this.findById(key)) {
        this._setFieldError("catAddKey", false, `Key "${key}" already exists`);
        valid = false;
      } else {
        this._setFieldError("catAddKey", true);
      }
    }
    if (!label) {
      this._setFieldError(`${p}Label`, false);
      valid = false;
    } else {
      this._setFieldError(`${p}Label`, true);
    }
    const desc = $id(`${p}Desc`).value.trim();
    return { valid, key, label, desc };
  }
  buildNewRecord(fields) {
    return {
      key: fields.key,
      label: fields.label,
      desc: fields.desc,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  applyEditToRecord(record, fields) {
    record.label = fields.label;
    record.desc = fields.desc;
  }
  async handleAddSubmit() {
    const result = this.validateForm("add");
    if (!result.valid) {
      this.toast("Please fill in all required fields", "danger");
      return;
    }
    const prev = this.store.get("records");
    this.store.set("records", prev.concat(this.buildNewRecord(result)));
    try {
      await this.persist();
      closePanels();
      this.render();
      this.statusToast(`Category "${result.label}" added successfully.`, "success");
      this.notify(`New category "${result.label}" was added.`, "ri-folder-add-line");
    } catch {
      this.store.set("records", prev);
      this.statusToast("Could not save category. Please try again.", "danger");
    }
  }
  async handleEditSubmit() {
    const result = this.validateForm("edit");
    if (!result.valid) {
      this.toast("Please fill in all required fields", "danger");
      return;
    }
    const record = this.findById(this.currentEditId);
    if (record) this.applyEditToRecord(record, result);
    try {
      await this.persist();
      closePanels();
      this.render();
      this.statusToast(`Category "${result.label}" updated.`, "success");
      this.currentEditId = null;
    } catch {
      this.statusToast("Could not save category. Please try again.", "danger");
    }
  }
  bindEvents() {
    super.bindEvents();
    ["catAdd", "catEdit"].forEach((prefix) => {
      const labelEl = $id(`${prefix}Label`);
      const descEl = $id(`${prefix}Desc`);
      const countEl = $id(`${prefix}DescCount`);
      this.on(labelEl, "input", () => {
        if (prefix === "catAdd") this.syncAddKeyFromLabel(labelEl.value);
      });
      this.on(descEl, "input", () => {
        if (countEl) countEl.textContent = String(descEl.value.length);
      });
    });
    this.on($id("catAddKey"), "input", () => {
      this.addKeyTouched = true;
    });
    const searchInput = $id("paCatSearchInput");
    if (searchInput) {
      this.on(searchInput, "input", () => {
        this.store.set("searchQuery", searchInput.value);
        this.store.set("page", 1);
        $id("paCatSearchWrap")?.classList.toggle("has-value", !!searchInput.value);
        this.render();
      });
    }
    this.on($id("paCatSearchClear"), "click", () => {
      if (!searchInput) return;
      searchInput.value = "";
      this.store.set("searchQuery", "");
      $id("paCatSearchWrap")?.classList.remove("has-value");
      this.render();
    });
    const gridBtn = $id("paCatGridViewBtn") || $id("paGridViewBtn");
    const listBtn = $id("paCatListViewBtn") || $id("paListViewBtn");
    if (gridBtn) {
      const parent = gridBtn.parentNode;
      const newGridBtn = gridBtn.cloneNode(true);
      parent.replaceChild(newGridBtn, gridBtn);
      this.on(newGridBtn, "click", () => {
        this.store.set("viewMode", "grid");
        this.setViewModeFromStore();
        this.render();
      });
    }
    if (listBtn) {
      const parent = listBtn.parentNode;
      const newListBtn = listBtn.cloneNode(true);
      parent.replaceChild(newListBtn, listBtn);
      this.on(newListBtn, "click", () => {
        this.store.set("viewMode", "list");
        this.setViewModeFromStore();
        this.render();
      });
    }
  }
};
export {
  CategoriesModule
};
