import {
  open,
  updateIconTrigger
} from "./chunk-IYEF6XNE.js";
import {
  DEFAULT_CATEGORY_ICON,
  renderIconHtml
} from "./chunk-JUAPOJ2G.js";
import {
  attachPaCatCardViewListeners,
  renderPaCatCard
} from "./chunk-PNDVP3YV.js";
import {
  categoryKeyFromAccentHex
} from "./chunk-CP27TRUO.js";
import {
  isValidCategoryKey,
  slugify
} from "./chunk-SCZE3YCL.js";
import {
  CrudCardModule,
  setStatTrend,
  setStatValue
} from "./chunk-UTJL6ZWT.js";
import "./chunk-SE7HHRBZ.js";
import {
  parseSortInput,
  sortByNewestFirst
} from "./chunk-3FVVIY3E.js";
import "./chunk-DUXXWVBL.js";
import "./chunk-WRYMBWPQ.js";
import {
  storage
} from "./chunk-UVN7SZ5D.js";
import {
  $id,
  escapeHtml
} from "./chunk-R5CPOL4O.js";

// client/modules/tool-categories/ToolCategoriesModule.ts
var FALLBACK_ACCENT = "#34d399";
var DEFAULT_ICON = DEFAULT_CATEGORY_ICON;
var ToolCategoriesModule = class extends CrudCardModule {
  constructor() {
    super({
      name: "Categories",
      storageKey: "pa_tool_categories",
      deleteType: "tool-category",
      page: "tool-categories",
      pageSize: 9,
      cardIdAttr: "data-tool-cat-id",
      bulkLabel: "category",
      addFocusId: "toolCatAddLabel",
      editFocusId: "toolCatEditLabel",
      ids: {
        grid: "paToolCatGrid",
        resultCount: "paToolCatResultCount",
        paginationBtns: "paToolCatPaginationBtns",
        paginationInfo: "paToolCatPaginationInfo",
        pagePrev: "paToolCatPagePrev",
        pageNext: "paToolCatPageNext",
        bodyScroll: "paToolCatBody",
        emptyResetBtn: "paToolCatEmptyResetBtn",
        emptyAddBtn: "paToolCatEmptyAddBtn",
        addPanel: "paToolCatAddPanel",
        editPanel: "paToolCatEditPanel",
        addSubmit: "paToolCatAddSubmit",
        editSubmit: "paToolCatEditSubmit",
        editDelete: null,
        addNewBtn: "paToolCatAddNewBtn",
        addPanelClose: "paToolCatAddPanelClose",
        editPanelClose: "paToolCatEditPanelClose",
        addCancel: "paToolCatAddCancel",
        editCancel: "paToolCatEditCancel"
      },
      menuActions: {
        "copy-key": function copyKey(id) {
          this.copyCategoryKey(id);
        }
      }
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
    const keyEl = $id("toolCatAddKey");
    if (!keyEl) return;
    keyEl.value = this.generateCategoryKey(label);
    this._setFieldError("toolCatAddKey", !!keyEl.value);
  }
  bindEvents() {
    super.bindEvents();
    ["toolCatAdd", "toolCatEdit"].forEach((prefix) => {
      const labelEl = $id(`${prefix}Label`);
      const descEl = $id(`${prefix}Desc`);
      const countEl = $id(`${prefix}DescCount`);
      this.on(labelEl, "input", () => {
        if (prefix === "toolCatAdd") this.syncAddKeyFromLabel(labelEl.value);
      });
      this.on(descEl, "input", () => {
        if (countEl) countEl.textContent = String(descEl.value.length);
      });
    });
    this.on($id("toolCatAddKey"), "input", () => {
      this.addKeyTouched = true;
    });
    this.on($id("toolCatAddIconBtn"), "click", () => this._openIconPicker("toolCatAdd"));
    this.on($id("toolCatEditIconBtn"), "click", () => this._openIconPicker("toolCatEdit"));
  }
  _setIconField(prefix, iconClass) {
    updateIconTrigger(prefix, iconClass, DEFAULT_ICON);
  }
  _openIconPicker(prefix) {
    const current = $id(`${prefix}Icon`)?.value || DEFAULT_ICON;
    open({
      current,
      defaultIcon: DEFAULT_ICON,
      returnFocus: $id(`${prefix}IconBtn`),
      onSelect: (icon) => this._setIconField(prefix, icon)
    });
  }
  _defaultAccentColor() {
    const css = getComputedStyle(document.documentElement).getPropertyValue("--pa-orange").trim();
    return /^#[0-9a-fA-F]{6}$/i.test(css) ? css.toLowerCase() : FALLBACK_ACCENT;
  }
  seedData() {
    return [];
  }
  sortRecords(records) {
    return sortByNewestFirst(records);
  }
  matchesSearch(record, query) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    if (record.label?.toLowerCase().includes(q)) return true;
    if (record.key?.toLowerCase().includes(q)) return true;
    return (record.description || "").toLowerCase().includes(q);
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
    const label = escapeHtml(record.label);
    return `<div class="pa-card-menu" data-tool-cat-id="${id}">
      <div class="pa-card-menu-item" data-action="duplicate" data-tool-cat-id="${id}"><i class="ri-file-copy-line"></i> Duplicate</div>
      <div class="pa-card-menu-item" data-action="copy-key" data-tool-cat-id="${id}"><i class="ri-clipboard-line"></i> Copy key</div>
    </div>`;
  }
  navigateToTools(categoryId) {
    try {
      sessionStorage.setItem("pa_tools_cat_filter", String(categoryId));
    } catch {
    }
    window.location.href = "/tools";
  }
  renderStats() {
    const records = this.store.get("records");
    const totalTools = Object.values(this._toolCounts || {}).reduce((sum, n) => sum + n, 0);
    const withTools = records.filter((r) => (this._toolCounts?.[r.id] || 0) > 0).length;
    const technologies = this._technologies || [];
    const techByCategory = technologies.filter(
      (t) => records.some((r) => String(r.id) === String(t.categoryId))
    );
    setStatValue("paToolCatStatTotal", records.length);
    setStatValue("paToolCatStatTools", totalTools);
    setStatValue("paToolCatStatWithTools", withTools);
    setStatValue("paToolCatStatTechnologies", techByCategory.length);
    setStatTrend("paToolCatStatTotalTrend", records);
    setStatTrend("paToolCatStatToolsTrend", records, (r) => (this._toolCounts?.[r.id] || 0) > 0);
    setStatTrend("paToolCatStatWithToolsTrend", records, (r) => (this._toolCounts?.[r.id] || 0) > 0);
    setStatTrend("paToolCatStatTechnologiesTrend", techByCategory);
  }
  async render() {
    const [tools, technologies] = await Promise.all([
      storage.get("pa_tools", []),
      storage.get("pa_technologies", [])
    ]);
    this._toolCounts = {};
    if (Array.isArray(tools)) {
      tools.forEach((t) => {
        if (t.categoryId != null) {
          const key = String(t.categoryId);
          this._toolCounts[key] = (this._toolCounts[key] || 0) + 1;
        }
      });
    }
    this._technologies = Array.isArray(technologies) ? technologies : [];
    super.render();
  }
  renderCard(record, index) {
    const color = record.color || this._defaultAccentColor();
    const pct = Math.min(100, Math.max(0, Number(record.proficiencyPct) || 0));
    const icon = record.iconClass || DEFAULT_ICON;
    const iconHtml = renderIconHtml(icon, { color, className: "pa-svg-icon" });
    const count = this._toolCounts?.[record.id] ?? 0;
    const badge = `<span class="pa-cat-card__builtin">${pct}%</span>`;
    return renderPaCatCard({
      idAttr: "data-tool-cat-id",
      id: record.id,
      catKey: categoryKeyFromAccentHex(color) || record.key,
      cardClass: this.bulkSelect?.cardClass(record.id) || "",
      animationDelay: 0,
      bulkCheckbox: this.bulkSelect?.checkboxHtml(record.id, `Select ${escapeHtml(record.label)}`) || "",
      iconHtml,
      badge,
      title: record.label,
      slug: record.key,
      desc: record.description || "",
      countIcon: "ri-tools-line",
      countLabel: `${count} tool${count === 1 ? "" : "s"}`,
      status: `${pct}%`,
      dateLabel: "Proficiency",
      dateValue: `${pct}%`,
      viewBtn: { label: "View Tools", ariaLabel: `View tools in ${record.label}` },
      menuHtml: this.renderCardMenu(record)
    });
  }
  attachCardListeners() {
    super.attachCardListeners();
    attachPaCatCardViewListeners($id("paToolCatGrid"), "data-tool-cat-id", (id) => this.navigateToTools(id));
  }
  resetAddForm() {
    this.addKeyTouched = false;
    ["toolCatAddKey", "toolCatAddLabel", "toolCatAddDesc", "toolCatAddPct", "toolCatAddSort"].forEach((id) => {
      const el = $id(id);
      if (el) el.value = "";
    });
    const pct = $id("toolCatAddPct");
    if (pct) pct.value = "85";
    this._setIconField("toolCatAdd", DEFAULT_ICON);
    const sort = $id("toolCatAddSort");
    if (sort) sort.value = String(this.store.get("records").length + 1);
    const descCount = $id("toolCatAddDescCount");
    if (descCount) descCount.textContent = "0";
    ["Key", "Label", "Pct"].forEach((f) => {
      $id(`toolCatAdd${f}Error`)?.classList.remove("visible");
      $id(`toolCatAdd${f}`)?.classList.remove("error");
    });
  }
  populateEditForm(record) {
    $id("toolCatEditKey").value = record.key || "";
    $id("toolCatEditLabel").value = record.label || "";
    $id("toolCatEditDesc").value = record.description || "";
    const editDescCount = $id("toolCatEditDescCount");
    if (editDescCount) editDescCount.textContent = String((record.description || "").length);
    this._setIconField("toolCatEdit", record.iconClass || DEFAULT_ICON);
    $id("toolCatEditPct").value = record.proficiencyPct ?? 0;
    $id("toolCatEditSort").value = record.sortOrder != null ? String(record.sortOrder) : "";
    ["Key", "Label", "Pct"].forEach((f) => {
      $id(`toolCatEdit${f}Error`)?.classList.remove("visible");
      $id(`toolCatEdit${f}`)?.classList.remove("error");
    });
  }
  validateForm(prefix) {
    const isAdd = prefix === "add";
    const p = isAdd ? "toolCatAdd" : "toolCatEdit";
    let valid = true;
    const label = ($id(`${p}Label`)?.value || "").trim();
    const editing = !isAdd ? this.findById(this.currentEditId) : null;
    let key = isAdd ? ($id("toolCatAddKey")?.value || "").trim().toLowerCase() : editing?.key;
    if (isAdd && !key && label) {
      key = this.generateCategoryKey(label);
      const keyEl = $id("toolCatAddKey");
      if (keyEl) keyEl.value = key;
    }
    if (isAdd) {
      if (!key) {
        this._setFieldError("toolCatAddKey", false, "Category key is required");
        valid = false;
      } else if (!isValidCategoryKey(key)) {
        this._setFieldError("toolCatAddKey", false, "Key must be lowercase letters, digits, or hyphens");
        valid = false;
      } else if (this.store.get("records").some((r) => r.key === key)) {
        this._setFieldError("toolCatAddKey", false, `Key "${key}" already exists`);
        valid = false;
      } else {
        this._setFieldError("toolCatAddKey", true);
      }
    }
    if (!label) {
      this._setFieldError(`${p}Label`, false);
      valid = false;
    } else {
      this._setFieldError(`${p}Label`, true);
    }
    const pctRaw = $id(`${p}Pct`)?.value;
    const pct = Number(pctRaw);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      this._setFieldError(`${p}Pct`, false);
      valid = false;
    } else {
      this._setFieldError(`${p}Pct`, true);
    }
    return {
      valid,
      key,
      label,
      description: ($id(`${p}Desc`)?.value || "").trim(),
      iconClass: ($id(`${p}Icon`)?.value || "").trim() || DEFAULT_ICON,
      color: editing?.color || this._defaultAccentColor(),
      proficiencyPct: pct,
      sortOrder: parseSortInput($id(`${p}Sort`)?.value || "", this.store.get("records").length + 1)
    };
  }
  _setFieldError(id, valid, message) {
    $id(id)?.classList.toggle("error", !valid);
    const err = $id(`${id}Error`);
    err?.classList.toggle("visible", !valid);
    if (!valid && message && err) {
      const span = err.querySelector("span");
      if (span) span.textContent = message;
    }
  }
  buildNewRecord(f) {
    return {
      key: f.key,
      label: f.label,
      description: f.description,
      iconClass: f.iconClass,
      color: f.color,
      proficiencyPct: f.proficiencyPct,
      sortOrder: f.sortOrder,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  applyEditToRecord(record, f) {
    record.label = f.label;
    record.description = f.description;
    record.iconClass = f.iconClass;
    record.proficiencyPct = f.proficiencyPct;
    if (f.sortOrder != null) record.sortOrder = f.sortOrder;
  }
};
export {
  ToolCategoriesModule
};
