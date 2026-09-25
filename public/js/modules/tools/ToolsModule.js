import { CrudCardModule } from "../../core/CrudCardModule.js";
import { escapeHtml, $id } from "../../utils/dom.js";
import { parseSortInput, sortByNewestFirst } from "../../utils/format.js";
import { uniqueCopyName } from "../../utils/strings.js";
import { storage } from "../../core/StorageService.js";
import * as svgIconPicker from "../../utils/SvgIconPicker.js";
import { DEFAULT_TOOL_ICON, renderIconHtml } from "../../utils/icon-utils.js";
import { renderPaCatCard, attachPaCatCardViewListeners } from "../../utils/paCatCard.js";
import { categoryKeyFromAccentHex } from "../../utils/categoryClassOptions.js";
import { setStatTrend, setStatValue } from "../../utils/pageStats.js";
const DEFAULT_ICON = DEFAULT_TOOL_ICON;
class ToolsModule extends CrudCardModule {
  constructor() {
    super({
      name: "Tools",
      storageKey: "pa_tools",
      deleteType: "tool",
      page: "tools",
      pageSize: 12,
      cardIdAttr: "data-tool-id",
      bulkLabel: "tool",
      defaultFilters: { category: "all" },
      filterSelectIds: [{ id: "paToolsCategoryFilter", key: "category" }],
      addFocusId: "toolsAddName",
      editFocusId: "toolsEditName",
      ids: {
        grid: "paToolsGrid",
        resultCount: "paToolsResultCount",
        paginationBtns: "paToolsPaginationBtns",
        paginationInfo: "paToolsPaginationInfo",
        pagePrev: "paToolsPagePrev",
        pageNext: "paToolsPageNext",
        bodyScroll: "paToolsBody",
        emptyResetBtn: "paToolsEmptyResetBtn",
        emptyAddBtn: "paToolsEmptyAddBtn",
        addPanel: "paToolsAddPanel",
        editPanel: "paToolsEditPanel",
        addSubmit: "paToolsAddSubmit",
        editSubmit: "paToolsEditSubmit",
        editDelete: null,
        addNewBtn: "paToolsAddNewBtn",
        addPanelClose: "paToolsAddPanelClose",
        editPanelClose: "paToolsEditPanelClose",
        addCancel: "paToolsAddCancel",
        editCancel: "paToolsEditCancel"
      },
      menuActions: {
        "copy-name": function copyName(id) {
          this.copyToolName(id);
        }
      }
    });
    this.categories = [];
  }
  bindEvents() {
    super.bindEvents();
    this.on($id("toolsAddIconBtn"), "click", () => this._openIconPicker("toolsAdd"));
    this.on($id("toolsEditIconBtn"), "click", () => this._openIconPicker("toolsEdit"));
  }
  render() {
    this._populateCategoryFilter();
    super.render();
  }
  async load() {
    const [records, categories] = await Promise.all([
      this.loadRecords(() => []),
      storage.get("pa_tool_categories", [])
    ]);
    this.categories = categories;
    this._populateCategorySelects();
    this._populateCategoryFilter();
    try {
      const pendingCat = sessionStorage.getItem("pa_tools_cat_filter");
      if (pendingCat) {
        sessionStorage.removeItem("pa_tools_cat_filter");
        this.store.set("filters", { ...this.store.get("filters"), category: pendingCat });
      }
    } catch {
    }
    const maxId = Math.max(0, ...records.map((r) => Number(r.id) || 0));
    this.nextId = maxId + 1;
    this.store.set("records", records);
  }
  _categoryMeta(categoryId) {
    const cat = this.categories.find((c) => String(c.id) === String(categoryId));
    return cat || { label: "Uncategorized", key: "other", color: "#9a9aa0", iconClass: DEFAULT_ICON };
  }
  _populateCategoryFilter() {
    const select = $id("paToolsCategoryFilter");
    if (!select) return;
    const current = this.store.get("filters")?.category || "all";
    select.innerHTML = '<option value="all">All categories</option>' + sortByNewestFirst(this.categories).map((c) => `<option value="${escapeHtml(String(c.id))}">${escapeHtml(c.label)}</option>`).join("");
    select.value = current;
  }
  _populateCategorySelects() {
    const options = sortByNewestFirst(this.categories).map((c) => `<option value="${escapeHtml(String(c.id))}">${escapeHtml(c.label)}</option>`).join("");
    const addSelect = $id("toolsAddCategory");
    const editSelect = $id("toolsEditCategory");
    if (addSelect) addSelect.innerHTML = options || '<option value="">No categories</option>';
    if (editSelect) editSelect.innerHTML = options || '<option value="">No categories</option>';
  }
  _setIconField(prefix, iconClass) {
    svgIconPicker.updateIconTrigger(prefix, iconClass, DEFAULT_ICON);
  }
  _openIconPicker(prefix) {
    const current = $id(`${prefix}Icon`)?.value || DEFAULT_ICON;
    svgIconPicker.open({
      current,
      defaultIcon: DEFAULT_ICON,
      returnFocus: $id(`${prefix}IconBtn`),
      onSelect: (icon) => this._setIconField(prefix, icon)
    });
  }
  seedData() {
    return [];
  }
  sortRecords(records) {
    return sortByNewestFirst(records);
  }
  matchesFilters(record, filters) {
    if (filters.category !== "all" && String(record.categoryId) !== String(filters.category)) return false;
    return true;
  }
  matchesSearch(record, query) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    if (record.name?.toLowerCase().includes(q)) return true;
    const cat = this._categoryMeta(record.categoryId);
    return cat.label.toLowerCase().includes(q) || cat.key.toLowerCase().includes(q);
  }
  getDeleteName(record) {
    return record.name;
  }
  renderStats() {
    const records = this.store.get("records");
    const categoryIds = new Set(records.map((r) => r.categoryId).filter((id) => id != null));
    setStatValue("paToolsStatTotal", records.length);
    setStatValue("paToolsStatCategories", categoryIds.size);
    setStatValue("paToolsStatWithUrl", records.filter((r) => (r.iconUrl || "").trim()).length);
    setStatValue("paToolsStatUncategorized", records.filter((r) => r.categoryId == null).length);
    setStatTrend("paToolsStatTotalTrend", records);
    setStatTrend("paToolsStatCategoriesTrend", records, (r) => r.categoryId != null);
    setStatTrend("paToolsStatWithUrlTrend", records, (r) => (r.iconUrl || "").trim());
    setStatTrend("paToolsStatUncategorizedTrend", records, (r) => r.categoryId == null);
  }
  copyToolName(id) {
    const record = this.findById(id);
    if (!record) return;
    navigator.clipboard?.writeText(record.name).then(
      () => this.toast("Name copied to clipboard", "success", 2e3),
      () => this.toast("Clipboard not available.", "danger")
    );
  }
  buildDuplicate(record, newId) {
    const names = this.store.get("records").map((r) => r.name);
    return {
      ...record,
      id: newId,
      name: uniqueCopyName(record.name, names)
    };
  }
  renderCardMenu(record) {
    const id = escapeHtml(String(record.id));
    const name = escapeHtml(record.name);
    return `<div class="pa-card-menu" data-tool-id="${id}">
      <div class="pa-card-menu-item" data-action="duplicate" data-tool-id="${id}"><i class="ri-file-copy-line"></i> Duplicate</div>
      <div class="pa-card-menu-item" data-action="copy-name" data-tool-id="${id}"><i class="ri-clipboard-line"></i> Copy name</div>
    </div>`;
  }
  navigateToCategory(categoryId) {
    try {
      sessionStorage.setItem("pa_tools_cat_filter", String(categoryId));
    } catch {
    }
    window.location.href = "/tools";
  }
  renderCard(record, index) {
    const cat = this._categoryMeta(record.categoryId);
    const color = cat.color || "#9a9aa0";
    const icon = record.iconClass || DEFAULT_ICON;
    const iconHtml = renderIconHtml(icon, { color, className: "pa-svg-icon" });
    return renderPaCatCard({
      idAttr: "data-tool-id",
      id: record.id,
      catKey: categoryKeyFromAccentHex(color) || cat.key,
      cardClass: this.bulkSelect?.cardClass(record.id) || "",
      animationDelay: 0,
      bulkCheckbox: this.bulkSelect?.checkboxHtml(record.id, `Select ${escapeHtml(record.name)}`) || "",
      iconHtml,
      title: record.name,
      slug: cat.key,
      desc: "",
      countIcon: "ri-folder-line",
      countLabel: cat.label,
      status: "Active",
      dateLabel: "Sort",
      dateValue: record.sortOrder != null ? String(record.sortOrder) : "\u2014",
      viewBtn: { label: "View Category", ariaLabel: `View tools in ${cat.label}` },
      menuHtml: this.renderCardMenu(record)
    });
  }
  attachCardListeners() {
    super.attachCardListeners();
    attachPaCatCardViewListeners($id("paToolsGrid"), "data-tool-id", (id) => {
      const record = this.findById(id);
      if (record) this.navigateToCategory(record.categoryId);
    });
  }
  resetAddForm() {
    ["toolsAddName", "toolsAddSort"].forEach((id) => {
      const el = $id(id);
      if (el) el.value = "";
    });
    const category = $id("toolsAddCategory");
    if (category && this.categories.length) category.value = String(this.categories[0].id);
    this._setIconField("toolsAdd", DEFAULT_ICON);
    const sort = $id("toolsAddSort");
    if (sort) sort.value = String(this.store.get("records").length + 1);
    ["Name", "Category"].forEach((f) => {
      $id(`toolsAdd${f}Error`)?.classList.remove("visible");
      $id(`toolsAdd${f}`)?.classList.remove("error");
    });
  }
  populateEditForm(record) {
    $id("toolsEditName").value = record.name || "";
    $id("toolsEditCategory").value = record.categoryId != null ? String(record.categoryId) : "";
    this._setIconField("toolsEdit", record.iconClass || DEFAULT_ICON);
    $id("toolsEditSort").value = record.sortOrder != null ? String(record.sortOrder) : "";
    ["Name", "Category"].forEach((f) => {
      $id(`toolsEdit${f}Error`)?.classList.remove("visible");
      $id(`toolsEdit${f}`)?.classList.remove("error");
    });
  }
  validateForm(prefix) {
    const p = prefix === "add" ? "toolsAdd" : "toolsEdit";
    let valid = true;
    const name = ($id(`${p}Name`)?.value || "").trim();
    if (!name) {
      this._err(`${p}Name`, true);
      valid = false;
    } else this._err(`${p}Name`, false);
    const categoryId = $id(`${p}Category`)?.value;
    if (!categoryId) {
      this._err(`${p}Category`, true);
      valid = false;
    } else this._err(`${p}Category`, false);
    return {
      valid,
      name,
      categoryId: Number(categoryId),
      iconClass: ($id(`${p}Icon`)?.value || "").trim() || DEFAULT_ICON,
      iconUrl: "",
      sortOrder: parseSortInput($id(`${p}Sort`)?.value || "", this.store.get("records").length + 1)
    };
  }
  _err(id, isError, message) {
    $id(id)?.classList.toggle("error", isError);
    const err = $id(`${id}Error`);
    err?.classList.toggle("visible", isError);
    if (isError && message && err) {
      const span = err.querySelector("span");
      if (span) span.textContent = message;
    }
  }
  buildNewRecord(f) {
    return {
      name: f.name,
      categoryId: f.categoryId,
      iconClass: f.iconClass,
      iconUrl: f.iconUrl,
      sortOrder: f.sortOrder,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  applyEditToRecord(record, f) {
    record.name = f.name;
    record.categoryId = f.categoryId;
    record.iconClass = f.iconClass;
    record.iconUrl = f.iconUrl;
    if (f.sortOrder != null) record.sortOrder = f.sortOrder;
  }
}
export {
  ToolsModule
};
