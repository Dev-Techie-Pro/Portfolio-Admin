import { CrudCardModule } from "../../core/CrudCardModule.js";
import { escapeHtml, $id } from "../../utils/dom.js";
import { isValidUrl, uniqueCopyName } from "../../utils/strings.js";
import { parseYearsInput, parseSortInput, sortByNewestFirst } from "../../utils/format.js";
import { storage } from "../../core/StorageService.js";
import { renderIconHtml } from "../../utils/icon-utils.js";
import { renderPaCatCard, attachPaCatCardViewListeners } from "../../utils/paCatCard.js";
import { categoryKeyFromAccentHex } from "../../utils/categoryClassOptions.js";
import { setStatTrend, setStatValue } from "../../utils/pageStats.js";
const GROUP_META = {
  frontend: { label: "Frontend", icon: "ri-layout-line", color: "#60a5fa" },
  backend: { label: "Backend", icon: "ri-server-line", color: "#34d399" },
  database: { label: "Database", icon: "ri-database-2-line", color: "#a78bfa" },
  devops: { label: "DevOps & Cloud", icon: "ri-cloud-line", color: "#38bdf8" },
  mobile: { label: "Mobile", icon: "ri-smartphone-line", color: "#fb923c" },
  design: { label: "Design & Tools", icon: "ri-palette-line", color: "#f472b6" },
  other: { label: "Other", icon: "ri-more-line", color: "#9a9aa0" }
};
const LEVEL_META = {
  beginner: { label: "Beginner", pct: 25, color: "#9a9aa0" },
  intermediate: { label: "Intermediate", pct: 55, color: "#60a5fa" },
  advanced: { label: "Advanced", pct: 80, color: "#34d399" },
  expert: { label: "Expert", pct: 100, color: "#FF6600" }
};
const SEED_TECHNOLOGIES = [];
const FALLBACK_CATEGORY = {
  label: "Uncategorized",
  key: "other",
  color: "#9a9aa0",
  iconClass: "ri-more-line"
};
class TechnologiesModule extends CrudCardModule {
  constructor() {
    super({
      name: "Technologies",
      storageKey: "pa_technologies",
      deleteType: "technology",
      page: "technologies",
      pageSize: 12,
      cardIdAttr: "data-tech-id",
      bulkLabel: "technology",
      defaultFilters: { category: "all", level: "all" },
      filterSelectIds: [
        { id: "paTechGroupFilter", key: "category" },
        { id: "paTechLevelFilter", key: "level" }
      ],
      addFocusId: "techAddName",
      editFocusId: "techEditName",
      ids: {
        grid: "paTechGrid",
        resultCount: "paTechResultCount",
        paginationBtns: "paTechPaginationBtns",
        paginationInfo: "paTechPaginationInfo",
        pagePrev: "paTechPagePrev",
        pageNext: "paTechPageNext",
        bodyScroll: "paTechBody",
        emptyResetBtn: "paTechEmptyResetBtn",
        emptyAddBtn: "paTechEmptyAddBtn",
        addPanel: "paTechAddPanel",
        editPanel: "paTechEditPanel",
        addSubmit: "paTechAddSubmit",
        editSubmit: "paTechEditSubmit",
        editDelete: null,
        addNewBtn: "paTechAddNewBtn",
        addPanelClose: "paTechAddPanelClose",
        editPanelClose: "paTechEditPanelClose",
        addCancel: "paTechAddCancel",
        editCancel: "paTechEditCancel"
      },
      menuActions: {
        "view-docs": function viewDocs(id) {
          this.openTechDocs(id);
        },
        "copy-name": function copyName(id) {
          this.copyTechName(id);
        }
      }
    });
    this.categories = [];
  }
  seedData() {
    return [];
  }
  sortRecords(records) {
    return sortByNewestFirst(records);
  }
  async load() {
    const [records, categories] = await Promise.all([
      this.loadRecords(() => []),
      storage.get("pa_tool_categories", [])
    ]);
    this.categories = Array.isArray(categories) ? categories : [];
    this._populateCategorySelects();
    this._populateCategoryFilter();
    const defaultCategoryId = (() => {
      const sorted = sortByNewestFirst(this.categories);
      const other = sorted.find((c) => String(c.key).toLowerCase() === "other");
      return (other || sorted[0])?.id ?? null;
    })();
    const normalized = (Array.isArray(records) ? records : []).map((r) => {
      if (r.categoryId != null && this.categories.some((c) => String(c.id) === String(r.categoryId))) {
        return r;
      }
      if (r.group) {
        const byKey = this.categories.find((c) => String(c.key).toLowerCase() === String(r.group).toLowerCase());
        if (byKey) return { ...r, categoryId: byKey.id };
      }
      return { ...r, categoryId: defaultCategoryId };
    });
    try {
      const pendingCat = sessionStorage.getItem("pa_tech_cat_filter");
      if (pendingCat) {
        sessionStorage.removeItem("pa_tech_cat_filter");
        this.store.set("filters", { ...this.store.get("filters"), category: pendingCat });
      }
    } catch {
    }
    const maxId = Math.max(0, ...normalized.map((r) => Number(r.id) || 0));
    this.nextId = maxId + 1;
    this.store.set("records", normalized);
  }
  render() {
    this._populateCategoryFilter();
    super.render();
  }
  _categoryMeta(categoryId) {
    const cat = this.categories.find((c) => String(c.id) === String(categoryId));
    if (cat) return cat;
    return FALLBACK_CATEGORY;
  }
  _populateCategoryFilter() {
    const select = $id("paTechGroupFilter");
    if (!select) return;
    const current = this.store.get("filters")?.category || "all";
    select.innerHTML = '<option value="all">All categories</option>' + sortByNewestFirst(this.categories).map((c) => `<option value="${escapeHtml(String(c.id))}">${escapeHtml(c.label)}</option>`).join("");
    select.value = current;
  }
  _populateCategorySelects() {
    const options = sortByNewestFirst(this.categories).map((c) => `<option value="${escapeHtml(String(c.id))}">${escapeHtml(c.label)}</option>`).join("");
    const addSelect = $id("techAddGroup");
    const editSelect = $id("techEditGroup");
    if (addSelect) addSelect.innerHTML = options || '<option value="">No categories</option>';
    if (editSelect) editSelect.innerHTML = options || '<option value="">No categories</option>';
  }
  matchesFilters(record, filters) {
    if (filters.category !== "all" && String(record.categoryId) !== String(filters.category)) return false;
    if (filters.level !== "all" && record.level !== filters.level) return false;
    return true;
  }
  matchesSearch(record, query) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    if (record.name.toLowerCase().includes(q)) return true;
    if ((record.desc || "").toLowerCase().includes(q)) return true;
    const cat = this._categoryMeta(record.categoryId);
    return cat.label.toLowerCase().includes(q) || (cat.key || "").toLowerCase().includes(q);
  }
  getDeleteName(record) {
    return record.name;
  }
  renderStats() {
    const records = this.store.get("records");
    const categoryIds = new Set(records.map((t) => t.categoryId).filter((id) => id != null));
    setStatValue("paTechStatTotal", records.length);
    setStatValue("paTechStatFrontend", categoryIds.size);
    setStatValue("paTechStatExpert", records.filter((t) => t.level === "expert").length);
    setStatValue("paTechStatFeatured", records.filter((t) => t.featured).length);
    setStatTrend("paTechStatTotalTrend", records);
    setStatTrend("paTechStatFrontendTrend", records, (t) => t.categoryId != null);
    setStatTrend("paTechStatExpertTrend", records, (t) => t.level === "expert");
    setStatTrend("paTechStatFeaturedTrend", records, (t) => t.featured);
  }
  renderCardMenu(tech) {
    const id = escapeHtml(String(tech.id));
    return `<div class="pa-card-menu" data-tech-id="${id}">
      <div class="pa-card-menu-item" data-action="view-docs" data-tech-id="${id}"><i class="ri-external-link-line"></i> View Docs</div>
      <div class="pa-card-menu-item" data-action="copy-name" data-tech-id="${id}"><i class="ri-clipboard-line"></i> Copy name</div>
    </div>`;
  }
  renderCard(tech, index) {
    const cat = this._categoryMeta(tech.categoryId);
    const lm = LEVEL_META[tech.level] || { label: "\u2014", pct: 0, color: "#9a9aa0" };
    const years = tech.years != null ? `${tech.years} year${tech.years === 1 ? "" : "s"}` : null;
    const badge = tech.featured ? '<span class="pa-cat-card__builtin">Headline</span>' : "";
    const color = cat.color || FALLBACK_CATEGORY.color;
    const icon = cat.iconClass || FALLBACK_CATEGORY.iconClass;
    const iconHtml = renderIconHtml(icon, { color, className: "pa-svg-icon" });
    return renderPaCatCard({
      idAttr: "data-tech-id",
      id: tech.id,
      catKey: categoryKeyFromAccentHex(color) || cat.key,
      cardClass: this.bulkSelect?.cardClass(tech.id) || "",
      animationDelay: 0,
      bulkCheckbox: this.bulkSelect?.checkboxHtml(tech.id, `Select ${escapeHtml(tech.name)}`) || "",
      iconHtml,
      badge,
      title: tech.name,
      slug: cat.key || cat.label.toLowerCase(),
      desc: tech.desc || "",
      countIcon: "ri-folder-line",
      countLabel: cat.label,
      status: lm.label,
      dateLabel: years ? "Experience" : "Level",
      dateValue: years || lm.label,
      viewBtn: tech.url ? { label: "View Docs", ariaLabel: `View docs for ${tech.name}` } : null,
      menuHtml: this.renderCardMenu(tech)
    });
  }
  attachCardListeners() {
    super.attachCardListeners();
    attachPaCatCardViewListeners($id("paTechGrid"), "data-tech-id", (id) => this.openTechDocs(id));
  }
  openTechDocs(id) {
    const t = this.findById(id);
    if (!t) return;
    if (t.url) {
      this.toast(`Opening ${t.name} docs\u2026`, "info");
      window.open(t.url, "_blank", "noopener");
    } else this.toast(`${t.name} has no docs URL set`, "info");
  }
  copyTechName(id) {
    const t = this.findById(id);
    if (!t) return;
    navigator.clipboard?.writeText(t.name).then(() => this.toast("Name copied to clipboard", "success"));
  }
  buildDuplicate(record, newId) {
    const names = this.store.get("records").map((t) => t.name);
    return { ...record, id: newId, name: uniqueCopyName(record.name, names), featured: false };
  }
  resetAddForm() {
    ["techAddName", "techAddUrl", "techAddDesc", "techAddLevel", "techAddYears", "techAddSort"].forEach((id) => {
      const el = $id(id);
      if (el) el.value = "";
    });
    const category = $id("techAddGroup");
    if (category && this.categories.length) {
      const sorted = sortByNewestFirst(this.categories);
      category.value = String(sorted[0].id);
    } else if (category) {
      category.value = "";
    }
    $id("techAddDescCount").textContent = "0";
    $id("techAddFeatured").value = "0";
    ["Name", "Group", "Level", "Url"].forEach((f) => {
      $id(`techAdd${f}Error`)?.classList.remove("visible");
      $id(`techAdd${f}`)?.classList.remove("error");
    });
  }
  populateEditForm(t) {
    $id("techEditName").value = t.name;
    const editGroup = $id("techEditGroup");
    if (editGroup) {
      const hasCategory = t.categoryId != null && this.categories.some((c) => String(c.id) === String(t.categoryId));
      if (hasCategory) {
        editGroup.value = String(t.categoryId);
      } else if (this.categories.length) {
        const sorted = sortByNewestFirst(this.categories);
        editGroup.value = String(sorted[0].id);
      } else {
        editGroup.value = "";
      }
    }
    $id("techEditUrl").value = t.url || "";
    $id("techEditDesc").value = t.desc || "";
    $id("techEditDescCount").textContent = (t.desc || "").length;
    $id("techEditLevel").value = t.level;
    $id("techEditYears").value = t.years != null ? String(t.years) : "";
    $id("techEditFeatured").value = t.featured ? "1" : "0";
    $id("techEditSort").value = t.sortOrder != null ? String(t.sortOrder) : "";
    ["Name", "Group", "Level", "Url"].forEach((f) => {
      $id(`techEdit${f}Error`)?.classList.remove("visible");
      $id(`techEdit${f}`)?.classList.remove("error");
    });
  }
  validateForm(prefix) {
    const p = prefix === "add" ? "techAdd" : "techEdit";
    let valid = true;
    const name = ($id(`${p}Name`)?.value || "").trim();
    if (!name) {
      this._err(`${p}Name`, true);
      valid = false;
    } else if (this.store.get("records").some((t) => t.name.toLowerCase() === name.toLowerCase() && String(t.id) !== String(this.currentEditId))) {
      this._err(`${p}Name`, true, `"${name}" already exists`);
      valid = false;
    } else this._err(`${p}Name`, false);
    const categoryRaw = $id(`${p}Group`)?.value || "";
    const categoryId = Number(categoryRaw);
    if (!categoryRaw || !Number.isFinite(categoryId)) {
      this._err(`${p}Group`, true);
      valid = false;
    } else {
      this._err(`${p}Group`, false);
    }
    const level = $id(`${p}Level`)?.value || "";
    if (!level) {
      this._err(`${p}Level`, true);
      valid = false;
    } else this._err(`${p}Level`, false);
    const url = ($id(`${p}Url`)?.value || "").trim();
    if (url && !isValidUrl(url)) {
      this._err(`${p}Url`, true);
      valid = false;
    } else this._err(`${p}Url`, false);
    return {
      valid,
      name,
      categoryId: Number(categoryId),
      level,
      url,
      desc: ($id(`${p}Desc`)?.value || "").trim(),
      years: parseYearsInput($id(`${p}Years`)?.value || ""),
      featured: $id(`${p}Featured`)?.value === "1",
      sortOrder: parseSortInput($id(`${p}Sort`)?.value || "", void 0)
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
      level: f.level,
      url: f.url,
      desc: f.desc,
      years: f.years,
      featured: f.featured,
      sortOrder: f.sortOrder ?? this.store.get("records").length + 1,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  applyEditToRecord(record, f) {
    record.name = f.name;
    record.categoryId = f.categoryId;
    record.level = f.level;
    record.url = f.url;
    record.desc = f.desc;
    record.years = f.years;
    record.featured = f.featured;
    if (f.sortOrder != null) record.sortOrder = f.sortOrder;
  }
}
export {
  GROUP_META,
  LEVEL_META,
  SEED_TECHNOLOGIES,
  TechnologiesModule
};
