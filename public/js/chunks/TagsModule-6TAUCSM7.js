import {
  CrudCardModule,
  setStatTrend,
  setStatValue
} from "./chunk-NETZJRD6.js";
import "./chunk-JRSPEK52.js";
import {
  sortByNewestFirst
} from "./chunk-3FVVIY3E.js";
import {
  PAGE
} from "./chunk-DUXXWVBL.js";
import {
  activateTab,
  closePanels,
  openPanel
} from "./chunk-WGXNH5AX.js";
import {
  $all,
  $id,
  escapeHtml,
  storage
} from "./chunk-OGR5OR6D.js";

// client/modules/tags/TagsModule.ts
function newTagId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tag-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
var TagsModule = class extends CrudCardModule {
  constructor() {
    super({
      name: "Tags",
      storageKey: "pa_project_tags",
      deleteType: "project-tag",
      page: "tags",
      pageSize: 12,
      cardIdAttr: "data-tag-id",
      bulkLabel: "tag",
      tabGroup: null,
      addFocusId: "tagAddName",
      editFocusId: "tagEditName",
      ids: {
        grid: "paTagGrid",
        resultCount: "paTagResultCount",
        paginationBtns: "paTagPaginationBtns",
        paginationInfo: "paTagPaginationInfo",
        pagePrev: "paTagPagePrev",
        pageNext: "paTagPageNext",
        bodyScroll: "paTagBody",
        emptyResetBtn: "paTagEmptyResetBtn",
        emptyAddBtn: "paTagEmptyAddBtn",
        addPanel: "paTagAddPanel",
        editPanel: "paTagEditPanel",
        addSubmit: "paTagAddSubmit",
        editSubmit: "paTagEditSubmit",
        editDelete: null,
        addNewBtn: "paTagAddNewBtn",
        addPanelClose: "paTagAddPanelClose",
        editPanelClose: "paTagEditPanelClose",
        addCancel: "paTagAddCancel",
        editCancel: "paTagEditCancel"
      },
      menuActions: {
        "copy-tag": function copyTag(id) {
          this.copyTagName(id);
        }
      },
      buildDuplicate: function buildDuplicate(record) {
        return {
          ...record,
          id: newTagId(),
          tag: `${record.tag} Copy`
        };
      },
      defaultFilters: { project: "all" },
      filterSelectIds: [{ id: "paTagProjectFilter", key: "project" }]
    });
    this.projects = [];
  }
  seedData() {
    return [];
  }
  async load() {
    const [records, projects] = await Promise.all([
      storage.get(this.storageKey, []),
      storage.get("pa_projects", [])
    ]);
    this.projects = Array.isArray(projects) ? projects.slice() : [];
    this.store.set("records", Array.isArray(records) ? records : []);
    this.populateProjectSelects();
  }
  async persist() {
    await this.saveRecords(this.store.get("records"));
    storage.invalidate(this.storageKey);
    storage.invalidate("pa_projects");
    const fresh = await storage.get(this.storageKey, []);
    this.store.set("records", Array.isArray(fresh) ? fresh : []);
  }
  sortRecords(records) {
    return sortByNewestFirst(records);
  }
  matchesSearch(record, query) {
    const q = query.trim().toLowerCase();
    return String(record.tag || "").toLowerCase().includes(q) || String(record.projectTitle || "").toLowerCase().includes(q) || String(record.projectLegacyId || "").includes(q);
  }
  matchesFilters(record, filters) {
    const project = filters?.project || "all";
    if (project === "all") return true;
    return String(record.projectLegacyId) === String(project);
  }
  getDeleteName(record) {
    return record.tag || "Tag";
  }
  getDeleteExtraInfo(record) {
    if (!record?.projectTitle) return "";
    return `Assigned to project \u201C${record.projectTitle}\u201D.`;
  }
  copyTagName(id) {
    const record = this.findById(id);
    if (!record) return;
    navigator.clipboard?.writeText(record.tag).then(
      () => this.toast(`Copied \u201C${record.tag}\u201D to clipboard.`, "success", 2e3),
      () => this.toast("Clipboard not available.", "danger")
    );
  }
  navigateToProject(legacyId) {
    try {
      sessionStorage.setItem("pa_projects_focus_id", String(legacyId));
    } catch {
    }
    window.location.href = "/projects";
  }
  populateProjectSelects() {
    const options = this.projects.slice().sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""))).map((p) => `<option value="${escapeHtml(String(p.id))}">${escapeHtml(p.title || `Project #${p.id}`)}</option>`).join("");
    const empty = '<option value="">Select a project</option>';
    const addSelect = $id("tagAddProject");
    const editSelect = $id("tagEditProject");
    if (addSelect) addSelect.innerHTML = empty + options;
    if (editSelect) editSelect.innerHTML = empty + options;
    const filter = $id("paTagProjectFilter");
    if (filter) {
      const current = this.store.get("filters")?.project || "all";
      filter.innerHTML = '<option value="all">All Projects</option>' + this.projects.slice().sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""))).map((p) => `<option value="${escapeHtml(String(p.id))}">${escapeHtml(p.title || `Project #${p.id}`)}</option>`).join("");
      filter.value = this.projects.some((p) => String(p.id) === String(current)) ? String(current) : "all";
      if (filter.value !== current) {
        this.store.set("filters", { ...this.store.get("filters"), project: filter.value });
      }
    }
  }
  projectTitleByLegacyId(legacyId) {
    const project = this.projects.find((p) => String(p.id) === String(legacyId));
    return project?.title || "";
  }
  renderGroupHeading(projectLegacyId, projectTitle, count) {
    const title = escapeHtml(projectTitle || "Unknown project");
    const legacyId = escapeHtml(String(projectLegacyId ?? ""));
    const countLabel = `${count} tag${count === 1 ? "" : "s"}`;
    return `<div class="pa-tag-group-heading" data-project-legacy-id="${legacyId}">
      <div class="pa-tag-group-heading__main">
        <i class="ri-apps-line" aria-hidden="true"></i>
        <h2 class="pa-tag-group-heading__title">${title}</h2>
        <span class="pa-tag-group-heading__count">${escapeHtml(countLabel)}</span>
      </div>
      <button type="button" class="pa-tag-group-heading__link" data-project-legacy-id="${legacyId}" aria-label="Open project ${title}">
        View project <i class="ri-arrow-right-line"></i>
      </button>
    </div>`;
  }
  renderGroupedCards(pageItems) {
    if (!pageItems.length) return "";
    const groups = [];
    for (const record of pageItems) {
      const key = String(record.projectLegacyId ?? "");
      const last = groups[groups.length - 1];
      if (last && last.key === key) {
        last.items.push(record);
      } else {
        groups.push({
          key,
          projectLegacyId: record.projectLegacyId,
          projectTitle: record.projectTitle || this.projectTitleByLegacyId(record.projectLegacyId) || "Unknown project",
          items: [record]
        });
      }
    }
    const filtered = this.getFiltered();
    const countByProject = {};
    filtered.forEach((r) => {
      const k = String(r.projectLegacyId ?? "");
      countByProject[k] = (countByProject[k] || 0) + 1;
    });
    let cardIndex = 0;
    return groups.map((group) => {
      const heading = this.renderGroupHeading(
        group.projectLegacyId,
        group.projectTitle,
        countByProject[group.key] || group.items.length
      );
      const cards = group.items.map((record) => this.renderCard(record, cardIndex++)).join("");
      return `${heading}${cards}`;
    }).join("");
  }
  renderCardMenu(record) {
    const id = escapeHtml(String(record.id));
    return `<div class="pa-card-menu" data-tag-id="${id}">
      <div class="pa-card-menu-item" data-action="copy-tag" data-tag-id="${id}"><i class="ri-clipboard-line"></i> Copy tag</div>
      <div class="pa-card-menu-item" data-action="duplicate" data-tag-id="${id}"><i class="ri-file-copy-line"></i> Duplicate</div>
    </div>`;
  }
  renderCard(record, index) {
    const id = escapeHtml(String(record.id));
    const tag = escapeHtml(record.tag || "");
    const projectTitle = escapeHtml(record.projectTitle || this.projectTitleByLegacyId(record.projectLegacyId) || "Unknown project");
    const sortOrder = escapeHtml(String(record.sortOrder ?? 0));
    const projectLegacyId = escapeHtml(String(record.projectLegacyId ?? ""));
    const bulkCheckbox = this.bulkSelect?.checkboxHtml(record.id, `Select ${record.tag}`) || "";
    const menu = this.renderCardMenu(record);
    const delay = Math.min(index, 12) * 40;
    return `<div class="pa-card pa-cat-card${this.bulkSelect?.cardClass(record.id) || ""}" data-tag-id="${id}" data-cat-key="web" style="animation-delay:${delay}ms;">
      ${bulkCheckbox}
      <div class="pa-cat-card__bg" aria-hidden="true"></div>
      <div class="pa-cat-card__grid">
        <div class="pa-cat-card__top">
          <div class="pa-cat-card__icon"><i class="ri-price-tag-3-line"></i></div>
        </div>
        <h3 class="pa-cat-card__title" title="${tag}">${tag}</h3>
        <div class="pa-cat-card__slug"><span class="pa-cat-card__slug-mark" aria-hidden="true">\u25C6</span>Order ${sortOrder}</div>
        <p class="pa-cat-card__desc">${projectTitle}</p>
        <div class="pa-cat-card__count"><i class="ri-apps-line"></i><span>Project tag</span></div>
        <div class="pa-cat-card__footer">
          <button type="button" class="pa-cat-card__view-btn" data-project-legacy-id="${projectLegacyId}" aria-label="View project ${projectTitle}">
            <span>View Project</span><i class="ri-arrow-right-line"></i>
          </button>
          <div class="pa-cat-card__footer-more">
            <button type="button" class="pa-action-btn pa-action-edit" data-tag-id="${id}" title="Edit tag" aria-label="Edit ${tag}"><i class="ri-pencil-line"></i></button>
            <button type="button" class="pa-action-btn pa-action-delete" data-tag-id="${id}" title="Delete tag" aria-label="Delete ${tag}"><i class="ri-delete-bin-line"></i></button>
            <button type="button" class="pa-action-btn pa-action-more" data-tag-id="${id}" title="More options" aria-label="More options for ${tag}"><i class="ri-more-2-fill"></i></button>
            ${menu}
          </div>
        </div>
      </div>
      <div class="pa-cat-card__list">
        <div class="pa-cat-card__icon"><i class="ri-price-tag-3-line"></i></div>
        <div class="pa-cat-card__list-main">
          <div class="pa-cat-card__title" title="${tag}">${tag}</div>
          <div class="pa-cat-card__slug"><span class="pa-cat-card__slug-mark" aria-hidden="true">\u25C6</span>Order ${sortOrder}</div>
          <div class="pa-cat-card__desc">${projectTitle}</div>
        </div>
        <div class="pa-cat-card__count"><i class="ri-apps-line"></i><span>1 project</span></div>
        <div class="pa-cat-card__status">Active</div>
        <div class="pa-cat-card__list-actions">
          <button type="button" class="pa-action-btn pa-action-edit" data-tag-id="${id}" title="Edit tag" aria-label="Edit ${tag}"><i class="ri-pencil-line"></i></button>
          <button type="button" class="pa-action-btn pa-action-delete" data-tag-id="${id}" title="Delete tag" aria-label="Delete ${tag}"><i class="ri-delete-bin-line"></i></button>
          <button type="button" class="pa-action-btn pa-action-more" data-tag-id="${id}" title="More options" aria-label="More options for ${tag}"><i class="ri-more-2-fill"></i></button>
          ${menu}
        </div>
        <button type="button" class="pa-cat-card__chevron" data-project-legacy-id="${projectLegacyId}" aria-label="View project ${projectTitle}"><i class="ri-arrow-right-s-line"></i></button>
      </div>
    </div>`;
  }
  setViewModeFromStore() {
    const mode = this.store.get("viewMode") || "grid";
    const gridBtn = $id("paTagGridViewBtn");
    const listBtn = $id("paTagListViewBtn");
    if (gridBtn) gridBtn.classList.toggle("active", mode === "grid");
    if (listBtn) listBtn.classList.toggle("active", mode === "list");
  }
  renderStats() {
    const records = this.store.get("records");
    const unique = new Set(records.map((r) => String(r.tag || "").toLowerCase()).filter(Boolean));
    const projectsWithTags = new Set(records.map((r) => String(r.projectLegacyId)).filter(Boolean));
    const avg = projectsWithTags.size ? Math.round(records.length / projectsWithTags.size * 10) / 10 : 0;
    setStatValue("paTagStatTotal", records.length);
    setStatValue("paTagStatUnique", unique.size);
    setStatValue("paTagStatProjects", projectsWithTags.size);
    setStatValue("paTagStatAvg", avg);
    setStatTrend("paTagStatTotalTrend", records);
    setStatTrend("paTagStatUniqueTrend", records);
    setStatTrend("paTagStatProjectsTrend", records);
    setStatTrend("paTagStatAvgTrend", records);
  }
  async render() {
    this.renderStats();
    const { ids, pageSize } = this.config;
    const all = this.getFiltered();
    const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
    let page = this.store.get("page");
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    if (page !== this.store.get("page")) this.store.set("page", page);
    const start = (page - 1) * pageSize;
    const pageItems = all.slice(start, start + pageSize);
    const grid = $id(ids.grid);
    if (grid) {
      grid.classList.toggle("list-view", this.store.get("viewMode") === "list");
      if (pageItems.length === 0) {
        const hasFilters = !!(this.store.get("searchQuery") || "").trim() || Object.values(this.store.get("filters")).some((v) => v && v !== "all");
        grid.innerHTML = `<div class="pa-empty-state"><i class="ri-price-tag-3-line"></i><div class="pa-empty-state-title">${hasFilters ? "No tags match your filters" : "No project tags yet"}</div><div class="pa-empty-state-text">${hasFilters ? "Try adjusting your search or filters to find what you're looking for." : "Get started by adding your first project tag."}</div>${hasFilters ? `<button class="pa-empty-state-btn" id="${ids.emptyResetBtn}">Reset filters</button>` : `<button class="pa-empty-state-btn" id="${ids.emptyAddBtn}">+ Add Tag</button>`}</div>`;
        this.on($id(ids.emptyResetBtn), "click", () => this.resetFilters());
        this.on($id(ids.emptyAddBtn), "click", () => this.openAddPanel());
      } else {
        grid.innerHTML = this.renderGroupedCards(pageItems);
      }
    }
    const resultCount = $id(ids.resultCount);
    const total = this.store.get("records").length;
    if (resultCount) {
      resultCount.textContent = all.length === total ? `${total} total` : `${all.length} of ${total}`;
    }
    this.renderPagination(all.length, totalPages, page);
    this.populateProjectSelects();
    this.attachCardListeners();
    this.bulkSelect?.onRender();
    this.onAfterRender();
    this.setViewModeFromStore();
  }
  resetFilters() {
    this.store.batch(() => {
      this.store.set("searchQuery", "");
      this.store.set("filters", { project: "all" });
      this.store.set("page", 1);
    });
    const searchInput = $id("paTagSearchInput");
    if (searchInput) {
      searchInput.value = "";
      $id("paTagSearchWrap")?.classList.remove("has-value");
    }
    const projectFilter = $id("paTagProjectFilter");
    if (projectFilter) projectFilter.value = "all";
    this.render();
  }
  attachCardListeners() {
    super.attachCardListeners();
    const grid = $id(this.config.ids.grid);
    if (!grid) return;
    $all("button[data-project-legacy-id], .pa-cat-card__view-btn[data-project-legacy-id], .pa-cat-card__chevron[data-project-legacy-id], .pa-tag-group-heading__link[data-project-legacy-id]", grid).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const legacyId = btn.getAttribute("data-project-legacy-id");
        if (legacyId) this.navigateToProject(legacyId);
      });
    });
  }
  onAfterRender() {
  }
  bindEvents() {
    super.bindEvents();
    const searchInput = $id("paTagSearchInput");
    if (searchInput) {
      this.on(searchInput, "input", () => {
        this.store.set("searchQuery", searchInput.value);
        this.store.set("page", 1);
        $id("paTagSearchWrap")?.classList.toggle("has-value", !!searchInput.value);
        this.render();
      });
    }
    this.on($id("paTagSearchClear"), "click", () => {
      if (!searchInput) return;
      searchInput.value = "";
      this.store.set("searchQuery", "");
      $id("paTagSearchWrap")?.classList.remove("has-value");
      this.render();
    });
    const gridBtn = $id("paTagGridViewBtn");
    const listBtn = $id("paTagListViewBtn");
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
  resetAddForm() {
    ["tagAddName", "tagAddProject", "tagAddSort"].forEach((id) => {
      const el = $id(id);
      if (!el) return;
      if (id === "tagAddSort") el.value = "0";
      else el.value = "";
    });
    ["tagAddName", "tagAddProject"].forEach((id) => {
      $id(`${id}Error`)?.classList.remove("visible");
      $id(id)?.classList.remove("error");
    });
  }
  populateEditForm(record) {
    $id("tagEditName").value = record.tag || "";
    $id("tagEditProject").value = String(record.projectLegacyId ?? "");
    $id("tagEditSort").value = String(record.sortOrder ?? 0);
    ["tagEditName", "tagEditProject"].forEach((id) => {
      $id(`${id}Error`)?.classList.remove("visible");
      $id(id)?.classList.remove("error");
    });
  }
  _setFieldError(id, valid) {
    const input = $id(id);
    const err = $id(`${id}Error`);
    input?.classList.toggle("error", !valid);
    err?.classList.toggle("visible", !valid);
  }
  validateForm(prefix) {
    const isAdd = prefix === "add";
    const p = isAdd ? "tagAdd" : "tagEdit";
    let valid = true;
    const tag = $id(`${p}Name`).value.trim();
    const projectLegacyId = $id(`${p}Project`).value.trim();
    const sortRaw = $id(`${p}Sort`).value.trim();
    const sortOrder = sortRaw === "" ? 0 : Number(sortRaw);
    if (!tag) {
      this._setFieldError(`${p}Name`, false);
      valid = false;
    } else {
      this._setFieldError(`${p}Name`, true);
    }
    if (!projectLegacyId || !this.projects.some((proj) => String(proj.id) === projectLegacyId)) {
      this._setFieldError(`${p}Project`, false);
      valid = false;
    } else {
      this._setFieldError(`${p}Project`, true);
    }
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      this._setFieldError(`${p}Sort`, false);
      valid = false;
    } else {
      this._setFieldError(`${p}Sort`, true);
    }
    if (!valid) return { valid: false };
    const editingId = isAdd ? null : this.currentEditId;
    const duplicate = this.store.get("records").some((r) => String(r.id) !== String(editingId) && String(r.projectLegacyId) === projectLegacyId && String(r.tag).toLowerCase() === tag.toLowerCase());
    if (duplicate) {
      this._setFieldError(`${p}Name`, false);
      this.toast("That tag already exists on the selected project.", "danger");
      return { valid: false };
    }
    return {
      valid: true,
      tag,
      projectLegacyId: Number(projectLegacyId),
      projectTitle: this.projectTitleByLegacyId(projectLegacyId),
      sortOrder
    };
  }
  buildNewRecord(result) {
    return {
      id: newTagId(),
      tag: result.tag,
      projectLegacyId: result.projectLegacyId,
      projectTitle: result.projectTitle,
      sortOrder: result.sortOrder,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  applyEditToRecord(record, result) {
    record.tag = result.tag;
    record.projectLegacyId = result.projectLegacyId;
    record.projectTitle = result.projectTitle;
    record.sortOrder = result.sortOrder;
  }
  async handleAddSubmit() {
    if (PAGE !== this.config.page) return;
    const result = this.validateForm("add");
    if (!result.valid) {
      this.toast("Please fill in all required fields", "danger");
      return;
    }
    const newRecord = this.buildNewRecord(result);
    const prev = this.store.get("records");
    this.store.set("records", prev.concat(newRecord));
    try {
      await this.persist();
      closePanels();
      this.resetFilters();
      this.render();
      this.statusToast(`"${this.getDeleteName(newRecord)}" added successfully!`, "success");
      this.notify(`New tag "${this.getDeleteName(newRecord)}" was added.`, "ri-price-tag-3-line");
    } catch {
      this.store.set("records", prev);
      this.statusToast("Could not save tag. Please try again.", "danger");
    }
  }
  openAddPanel() {
    if (PAGE !== this.config.page) return;
    if (!this.projects.length) {
      this.toast("Add a project first before creating tags.", "danger");
      return;
    }
    this.resetAddForm();
    this.populateProjectSelects();
    openPanel(this.config.ids.addPanel, [this.config.ids.editPanel]);
    activateTab(this.config.tabGroup || this.config.ids.addPanel, "general");
    setTimeout(() => $id(this.config.addFocusId)?.focus(), 320);
  }
};
export {
  TagsModule
};
