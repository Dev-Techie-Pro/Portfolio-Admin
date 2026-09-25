import { CrudCardModule } from "../../core/CrudCardModule.js";
import { sortByNewestFirst } from "../../utils/format.js";
import { escapeHtml, $id, $all } from "../../utils/dom.js";
import { isValidCategoryKey, slugify } from "../../utils/strings.js";
import { storage } from "../../core/StorageService.js";
import { setStatTrend, setStatValue } from "../../utils/pageStats.js";
import { normalizeCategoryKey } from "../../utils/categoryClassOptions.js";
const CATEGORY_ICONS = {
  enterprise: "ri-building-2-line",
  educational: "ri-graduation-cap-line",
  desktop: "ri-computer-line",
  medical: "ri-heart-pulse-line",
  ecommerce: "ri-shopping-bag-line",
  travel: "ri-flight-takeoff-line",
  web: "ri-globe-line",
  nonprofit: "ri-hand-heart-line"
};
const DEFAULT_CAT_ICON = "ri-price-tag-3-line";
class BlogCategoriesModule extends CrudCardModule {
  constructor() {
    super({
      name: "Blog Categories",
      storageKey: "pa_blog_categories",
      deleteType: "blog-category",
      page: "blog-categories",
      pageSize: Infinity,
      cardIdAttr: "data-blog-cat-id",
      bulkLabel: "category",
      tabGroup: null,
      addFocusId: "blogCatAddLabel",
      editFocusId: "blogCatEditLabel",
      ids: {
        grid: "paBlogCatGrid",
        resultCount: "paBlogCatResultCount",
        paginationBtns: "paBlogCatPaginationBtns",
        paginationInfo: "paBlogCatPaginationInfo",
        pagePrev: "paBlogCatPagePrev",
        pageNext: "paBlogCatPageNext",
        bodyScroll: "paBlogCatBody",
        emptyResetBtn: "paBlogCatEmptyResetBtn",
        emptyAddBtn: "paBlogCatEmptyAddBtn",
        addPanel: "paBlogCatAddPanel",
        editPanel: "paBlogCatEditPanel",
        addSubmit: "paBlogCatAddSubmit",
        editSubmit: "paBlogCatEditSubmit",
        editDelete: null,
        addNewBtn: "paBlogCatAddNewBtn",
        addPanelClose: "paBlogCatAddPanelClose",
        editPanelClose: "paBlogCatEditPanelClose",
        addCancel: "paBlogCatAddCancel",
        editCancel: "paBlogCatEditCancel"
      },
      menuActions: {
        "copy-key": function copyKey(id) {
          this.copyCategoryKey(id);
        }
      },
      defaultFilters: { category: "all" },
      filterSelectIds: [{ id: "paBlogCatCategoryFilter", key: "category" }]
    });
    this.addKeyTouched = false;
  }
  generateCategoryKey(label) {
    const base = slugify(label);
    if (!base) return "";
    const keys = new Set(this.store.get("records").map((r) => r.key));
    if (!keys.has(base)) return base;
    let suffix = 2;
    let candidate = `${base}-${suffix}`;
    while (keys.has(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }
  syncAddKeyFromLabel(label) {
    if (this.addKeyTouched) return;
    const keyEl = $id("blogCatAddKey");
    if (!keyEl) return;
    keyEl.value = this.generateCategoryKey(label);
    this._setFieldError("blogCatAddKey", !!keyEl.value);
  }
  getCategoryIcon(key) {
    const token = normalizeCategoryKey(key);
    if (CATEGORY_ICONS[token]) return CATEGORY_ICONS[token];
    const short = (key || "").split("-")[0];
    return CATEGORY_ICONS[short] || DEFAULT_CAT_ICON;
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
    if (filters.category !== "all" && record.key !== filters.category) return false;
    return true;
  }
  getDeleteName(record) {
    return record.label || record.key;
  }
  copyCategoryKey(id) {
    const record = this.findById(id);
    if (!record) return;
    navigator.clipboard?.writeText(record.key).then(
      () => this.toast(`Copied key "${record.key}" to clipboard.`, "success", 2e3),
      () => this.toast("Clipboard not available.", "danger")
    );
  }
  buildDuplicate(record, newId) {
    const keys = new Set(this.store.get("records").map((r) => r.key));
    let key = `${record.key}-copy`;
    let n = 2;
    while (keys.has(key)) key = `${record.key}-copy-${n++}`;
    return {
      ...record,
      id: newId,
      key,
      label: `${record.label} (Copy)`
    };
  }
  renderCardMenu(record) {
    const id = escapeHtml(String(record.id));
    return `<div class="pa-card-menu" data-blog-cat-id="${id}">
      <div class="pa-card-menu-item" data-action="duplicate" data-blog-cat-id="${id}"><i class="ri-file-copy-line"></i> Duplicate</div>
      <div class="pa-card-menu-item" data-action="copy-key" data-blog-cat-id="${id}"><i class="ri-clipboard-line"></i> Copy key</div>
    </div>`;
  }
  navigateToBlogPosts(categoryKey) {
    try {
      sessionStorage.setItem("pa_blog_cat_filter", String(categoryKey));
    } catch {
    }
    window.location.href = "/blog-post";
  }
  populateCategoryFilter() {
    const select = $id("paBlogCatCategoryFilter");
    if (!select) return;
    const current = this.store.get("filters")?.category || "all";
    const sorted = sortByNewestFirst(this.store.get("records"));
    select.innerHTML = '<option value="all">All Categories</option>' + sorted.map((c) => `<option value="${escapeHtml(c.key)}">${escapeHtml(c.label)}</option>`).join("");
    select.value = current;
  }
  renderCard(record, index) {
    const icon = this.getCategoryIcon(record.key);
    const count = this._postCounts?.[record.key] ?? 0;
    const id = escapeHtml(String(record.id));
    const key = escapeHtml(record.key);
    const label = escapeHtml(record.label);
    const desc = record.desc || "";
    const descHtml = desc ? escapeHtml(desc) : '<em class="pa-cat-card__desc-empty">No description</em>';
    const countLabel = `${escapeHtml(String(count))} post${count === 1 ? "" : "s"}`;
    const bulkCheckbox = this.bulkSelect?.checkboxHtml(record.id, `Select ${label}`) || "";
    const menu = this.renderCardMenu(record);
    const delay = Math.min(index, 12) * 40;
    return `<div class="pa-card pa-cat-card${this.bulkSelect?.cardClass(record.id) || ""}" data-blog-cat-id="${id}" data-cat-key="${key}" style="animation-delay:${delay}ms;">
      ${bulkCheckbox}
      <div class="pa-cat-card__bg" aria-hidden="true"></div>
      <div class="pa-cat-card__grid">
        <div class="pa-cat-card__top">
          <div class="pa-cat-card__icon"><i class="${icon}"></i></div>
        </div>
        <h3 class="pa-cat-card__title" title="${label}">${label}</h3>
        <div class="pa-cat-card__slug"><span class="pa-cat-card__slug-mark" aria-hidden="true">\u25C6</span>${key}</div>
        <p class="pa-cat-card__desc">${descHtml}</p>
        <div class="pa-cat-card__count"><i class="ri-article-line"></i><span>${countLabel}</span></div>
        <div class="pa-cat-card__footer">
          <button type="button" class="pa-cat-card__view-btn" data-blog-cat-key="${key}" aria-label="View posts in ${label}">
            <span>View Posts</span><i class="ri-arrow-right-line"></i>
          </button>
          <div class="pa-cat-card__footer-more">
            <button type="button" class="pa-action-btn pa-action-edit" data-blog-cat-id="${id}" title="Edit category" aria-label="Edit ${label}"><i class="ri-pencil-line"></i></button>
            <button type="button" class="pa-action-btn pa-action-delete" data-blog-cat-id="${id}" title="Delete category" aria-label="Delete ${label}"><i class="ri-delete-bin-line"></i></button>
            <button type="button" class="pa-action-btn pa-action-more" data-blog-cat-id="${id}" title="More options" aria-label="More options for ${label}"><i class="ri-more-2-fill"></i></button>
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
        <div class="pa-cat-card__count"><i class="ri-article-line"></i><span>${countLabel}</span></div>
        <div class="pa-cat-card__status">Active</div>
        <div class="pa-cat-card__list-actions">
          <button type="button" class="pa-action-btn pa-action-edit" data-blog-cat-id="${id}" title="Edit category" aria-label="Edit ${label}"><i class="ri-pencil-line"></i></button>
          <button type="button" class="pa-action-btn pa-action-delete" data-blog-cat-id="${id}" title="Delete category" aria-label="Delete ${label}"><i class="ri-delete-bin-line"></i></button>
          <button type="button" class="pa-action-btn pa-action-more" data-blog-cat-id="${id}" title="More options" aria-label="More options for ${label}"><i class="ri-more-2-fill"></i></button>
          ${menu}
        </div>
        <button type="button" class="pa-cat-card__chevron" data-blog-cat-key="${key}" aria-label="View posts in ${label}"><i class="ri-arrow-right-s-line"></i></button>
      </div>
    </div>`;
  }
  renderPagination() {
  }
  setViewModeFromStore() {
    const mode = this.store.get("viewMode") || "grid";
    const gridBtn = $id("paBlogCatGridViewBtn") || $id("paGridViewBtn");
    const listBtn = $id("paBlogCatListViewBtn") || $id("paListViewBtn");
    if (gridBtn) gridBtn.classList.toggle("active", mode === "grid");
    if (listBtn) listBtn.classList.toggle("active", mode === "list");
    document.querySelectorAll(".pa-view-btn[data-view]").forEach((btn) => {
      const view = btn.dataset.view;
      if (view === "grid") btn.classList.toggle("active", mode === "grid");
      else if (view === "list") btn.classList.toggle("active", mode === "list");
    });
  }
  renderStats() {
    const records = this.store.get("records");
    const withPosts = records.filter((r) => (this._postCounts?.[r.key] || 0) > 0).length;
    const empty = records.filter((r) => (this._postCounts?.[r.key] || 0) === 0).length;
    const totalPosts = Object.values(this._postCounts || {}).reduce((sum, n) => sum + n, 0);
    setStatValue("paBlogCatStatTotal", records.length);
    setStatValue("paBlogCatStatWithPosts", withPosts);
    setStatValue("paBlogCatStatEmpty", empty);
    setStatValue("paBlogCatStatPosts", totalPosts);
    setStatTrend("paBlogCatStatTotalTrend", records);
    setStatTrend("paBlogCatStatWithPostsTrend", records, (r) => (this._postCounts?.[r.key] || 0) > 0);
    setStatTrend("paBlogCatStatEmptyTrend", records, (r) => (this._postCounts?.[r.key] || 0) === 0);
    setStatTrend("paBlogCatStatPostsTrend", records, (r) => (this._postCounts?.[r.key] || 0) > 0);
  }
  async render() {
    const posts = await storage.get("pa_blog_posts", []);
    this._postCounts = {};
    if (Array.isArray(posts)) {
      posts.forEach((p) => {
        if (p.category) {
          this._postCounts[p.category] = (this._postCounts[p.category] || 0) + 1;
        }
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
        grid.innerHTML = `<div class="pa-empty-state"><i class="ri-price-tag-3-line"></i><div class="pa-empty-state-title">${hasFilters ? "No categories match your filters" : "No blog categories yet"}</div><div class="pa-empty-state-text">${hasFilters ? "Try adjusting your search or filters to find what you're looking for." : "Get started by adding your first blog category."}</div>${hasFilters ? `<button class="pa-empty-state-btn" id="${ids.emptyResetBtn}">Reset filters</button>` : `<button class="pa-empty-state-btn" id="${ids.emptyAddBtn}">+ Add Category</button>`}</div>`;
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
    const searchInput = $id("paBlogCatSearchInput");
    if (searchInput) {
      searchInput.value = "";
      $id("paBlogCatSearchWrap")?.classList.remove("has-value");
    }
    const catFilter = $id("paBlogCatCategoryFilter");
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
        const key = btn.getAttribute("data-blog-cat-key");
        if (key) this.navigateToBlogPosts(key);
      });
    });
    $all(".pa-cat-card__chevron", grid).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const key = btn.getAttribute("data-blog-cat-key");
        if (key) this.navigateToBlogPosts(key);
      });
    });
  }
  resetAddForm() {
    this.addKeyTouched = false;
    ["blogCatAddKey", "blogCatAddLabel", "blogCatAddDesc"].forEach((id) => {
      const el = $id(id);
      if (el) el.value = "";
    });
    $id("blogCatAddDescCount").textContent = "0";
    ["blogCatAddKey", "blogCatAddLabel"].forEach((id) => {
      $id(`${id}Error`)?.classList.remove("visible");
      $id(id)?.classList.remove("error");
    });
  }
  populateEditForm(record) {
    $id("blogCatEditKey").value = record.key;
    $id("blogCatEditLabel").value = record.label;
    $id("blogCatEditDesc").value = record.desc || "";
    $id("blogCatEditDescCount").textContent = (record.desc || "").length;
    ["blogCatEditLabel"].forEach((id) => {
      $id(`${id}Error`)?.classList.remove("visible");
      $id(id)?.classList.remove("error");
    });
  }
  _setFieldError(id, valid, message) {
    const input = $id(id);
    const err = $id(`${id}Error`);
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
    const p = isAdd ? "blogCatAdd" : "blogCatEdit";
    const label = $id(`${p}Label`).value.trim();
    const editing = !isAdd ? this.findById(this.currentEditId) : null;
    let key = isAdd ? $id("blogCatAddKey").value.trim() : editing?.key;
    if (isAdd && !key && label) {
      key = this.generateCategoryKey(label);
      const keyEl = $id("blogCatAddKey");
      if (keyEl) keyEl.value = key;
    }
    if (isAdd) {
      if (!key) {
        this._setFieldError("blogCatAddKey", false, "Category key is required");
        valid = false;
      } else if (!isValidCategoryKey(key)) {
        this._setFieldError("blogCatAddKey", false, "Key must be lowercase letters, digits, or hyphens");
        valid = false;
      } else if (this.store.get("records").some((r) => r.key === key)) {
        this._setFieldError("blogCatAddKey", false, `Key "${key}" already exists`);
        valid = false;
      } else {
        this._setFieldError("blogCatAddKey", true);
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
      sortOrder: this.store.get("records").length + 1,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  applyEditToRecord(record, fields) {
    record.label = fields.label;
    record.desc = fields.desc;
  }
  bindEvents() {
    super.bindEvents();
    ["blogCatAdd", "blogCatEdit"].forEach((prefix) => {
      const labelEl = $id(`${prefix}Label`);
      const descEl = $id(`${prefix}Desc`);
      const countEl = $id(`${prefix}DescCount`);
      this.on(labelEl, "input", () => {
        if (prefix === "blogCatAdd") this.syncAddKeyFromLabel(labelEl.value);
      });
      this.on(descEl, "input", () => {
        if (countEl) countEl.textContent = String(descEl.value.length);
      });
    });
    this.on($id("blogCatAddKey"), "input", () => {
      this.addKeyTouched = true;
    });
    const searchInput = $id("paBlogCatSearchInput");
    if (searchInput) {
      this.on(searchInput, "input", () => {
        this.store.set("searchQuery", searchInput.value);
        this.store.set("page", 1);
        $id("paBlogCatSearchWrap")?.classList.toggle("has-value", !!searchInput.value);
        this.render();
      });
    }
    this.on($id("paBlogCatSearchClear"), "click", () => {
      if (!searchInput) return;
      searchInput.value = "";
      this.store.set("searchQuery", "");
      $id("paBlogCatSearchWrap")?.classList.remove("has-value");
      this.render();
    });
    const gridBtn = $id("paBlogCatGridViewBtn") || $id("paGridViewBtn");
    const listBtn = $id("paBlogCatListViewBtn") || $id("paListViewBtn");
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
}
export {
  BlogCategoriesModule
};
