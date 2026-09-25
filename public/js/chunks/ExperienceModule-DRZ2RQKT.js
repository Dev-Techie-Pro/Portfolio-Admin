import {
  renderPaCatCard
} from "./chunk-UDFFEWPW.js";
import {
  categoryKeyFromAccentHex
} from "./chunk-CP27TRUO.js";
import {
  CrudCardModule,
  setStatTrend,
  setStatValue
} from "./chunk-NETZJRD6.js";
import "./chunk-JRSPEK52.js";
import {
  formatMonthYear,
  parseSortInput,
  sortByNewestFirst
} from "./chunk-3FVVIY3E.js";
import "./chunk-DUXXWVBL.js";
import {
  activateTab,
  openPanel
} from "./chunk-WGXNH5AX.js";
import {
  $id,
  escapeHtml
} from "./chunk-OGR5OR6D.js";

// client/modules/experience/ExperienceModule.ts
var EXP_TYPE_META = {
  "full-time": { label: "Full-time", icon: "ri-briefcase-line", color: "#60a5fa" },
  "part-time": { label: "Part-time", icon: "ri-time-line", color: "#34d399" },
  contract: { label: "Contract", icon: "ri-file-list-3-line", color: "#fb923c" },
  freelance: { label: "Freelance", icon: "ri-quill-pen-line", color: "#a78bfa" },
  internship: { label: "Internship", icon: "ri-graduation-cap-line", color: "#f472b6" }
};
var SEED_EXPERIENCE = [];
var ExperienceModule = class extends CrudCardModule {
  constructor() {
    super({
      name: "Experience",
      storageKey: "pa_experience",
      deleteType: "experience",
      page: "experience",
      pageSize: 9,
      cardIdAttr: "data-exp-id",
      bulkLabel: "experience entry",
      defaultFilters: { type: "all" },
      filterSelectIds: [{ id: "paExpTypeFilter", key: "type" }],
      addFocusId: "expAddTitle",
      editFocusId: "expEditTitle",
      ids: {
        grid: "paExpGrid",
        resultCount: "paExpResultCount",
        paginationBtns: "paExpPaginationBtns",
        paginationInfo: "paExpPaginationInfo",
        pagePrev: "paExpPagePrev",
        pageNext: "paExpPageNext",
        bodyScroll: "paExpBody",
        emptyResetBtn: "paExpEmptyResetBtn",
        emptyAddBtn: "paExpEmptyAddBtn",
        addPanel: "paExpAddPanel",
        editPanel: "paExpEditPanel",
        addSubmit: "paExpAddSubmit",
        editSubmit: "paExpEditSubmit",
        editDelete: "paExpEditDelete",
        addNewBtn: "paExpAddNewBtn",
        addPanelClose: "paExpAddPanelClose",
        editPanelClose: "paExpEditPanelClose",
        addCancel: "paExpAddCancel",
        editCancel: "paExpEditCancel"
      },
      menuActions: { "copy-title": function copyTitle(id) {
        this.copyTitle(id);
      } }
    });
  }
  seedData() {
    return [];
  }
  sortRecords(records) {
    return sortByNewestFirst(records);
  }
  matchesFilters(record, filters) {
    return filters.type === "all" || record.type === filters.type;
  }
  matchesSearch(record, query) {
    const q = query.trim().toLowerCase();
    return record.title.toLowerCase().includes(q) || (record.company || "").toLowerCase().includes(q) || (record.location || "").toLowerCase().includes(q) || (record.desc || "").toLowerCase().includes(q);
  }
  getDeleteName(record) {
    return record.title;
  }
  renderStats() {
    const records = this.store.get("records");
    setStatValue("paExpStatTotal", records.length);
    setStatValue("paExpStatCurrent", records.filter((e) => e.current).length);
    setStatValue("paExpStatFullTime", records.filter((e) => e.type === "full-time").length);
    setStatValue("paExpStatOther", records.filter((e) => e.type && e.type !== "full-time").length);
    setStatTrend("paExpStatTotalTrend", records);
    setStatTrend("paExpStatCurrentTrend", records, (e) => e.current);
    setStatTrend("paExpStatFullTimeTrend", records, (e) => e.type === "full-time");
    setStatTrend("paExpStatOtherTrend", records, (e) => e.type && e.type !== "full-time");
  }
  renderCardMenu(e) {
    const id = escapeHtml(String(e.id));
    const title = escapeHtml(e.title);
    return `<div class="pa-card-menu" data-exp-id="${id}">
      <div class="pa-card-menu-item" data-action="duplicate" data-exp-id="${id}"><i class="ri-file-copy-line"></i> Duplicate</div>
      <div class="pa-card-menu-item" data-action="copy-title" data-exp-id="${id}"><i class="ri-clipboard-line"></i> Copy title</div>
    </div>`;
  }
  renderCard(e, index) {
    const tm = EXP_TYPE_META[e.type] || EXP_TYPE_META["full-time"];
    const dateRange = `${formatMonthYear(e.startDate)} \u2014 ${e.current ? "Present" : formatMonthYear(e.endDate) || "\u2014"}`;
    const badge = e.current ? '<span class="pa-cat-card__builtin">Current</span>' : "";
    return renderPaCatCard({
      idAttr: "data-exp-id",
      id: e.id,
      catKey: categoryKeyFromAccentHex(tm.color),
      cardClass: this.bulkSelect?.cardClass(e.id) || "",
      animationDelay: 0,
      bulkCheckbox: this.bulkSelect?.checkboxHtml(e.id, `Select ${escapeHtml(e.title)}`) || "",
      iconHtml: `<i class="${escapeHtml(tm.icon)}"></i>`,
      badge,
      title: e.title,
      slug: e.company || "\u2014",
      desc: e.desc || "",
      countIcon: "ri-calendar-line",
      countLabel: dateRange,
      status: tm.label,
      dateLabel: e.location ? "Location" : "Period",
      dateValue: e.location || dateRange,
      menuHtml: this.renderCardMenu(e)
    });
  }
  copyTitle(id) {
    const e = this.findById(id);
    if (!e) return;
    navigator.clipboard?.writeText(e.title).then(() => this.toast("Title copied to clipboard", "success"));
  }
  buildDuplicate(record, newId) {
    return { ...record, id: newId, title: `${record.title} (Copy)` };
  }
  openAddPanel() {
    this.resetAddForm();
    openPanel(this.config.ids.addPanel, [this.config.ids.editPanel]);
    activateTab("expAdd", "details");
    setTimeout(() => $id("expAddTitle")?.focus(), 320);
  }
  openEditPanel(id) {
    const record = this.findById(id);
    if (!record) return;
    this.currentEditId = id;
    this.populateEditForm(record);
    openPanel(this.config.ids.editPanel, [this.config.ids.addPanel]);
    activateTab("expEdit", "details");
    setTimeout(() => $id("expEditTitle")?.focus(), 320);
  }
  bindEvents() {
    super.bindEvents();
    ["expAddCurrent", "expEditCurrent"].forEach((id) => {
      this.on($id(id), "change", (e) => {
        const prefix = id.replace("Current", "");
        const endDateRow = $id(`${prefix}EndDateRow`);
        if (endDateRow) endDateRow.style.display = e.target.value === "1" ? "none" : "block";
      });
    });
  }
  resetAddForm() {
    ["expAddTitle", "expAddCompany", "expAddLocation", "expAddStartDate", "expAddEndDate", "expAddDesc", "expAddSort"].forEach((id) => {
      const el = $id(id);
      if (el) el.value = "";
    });
    $id("expAddType").value = "";
    $id("expAddCurrent").value = "0";
    const endRow = $id("expAddEndDateRow");
    if (endRow) endRow.style.display = "block";
    ["Title", "Company", "Type", "StartDate"].forEach((f) => {
      $id(`expAdd${f}Error`)?.classList.remove("visible");
      $id(`expAdd${f}`)?.classList.remove("error");
    });
  }
  populateEditForm(e) {
    $id("expEditTitle").value = e.title;
    $id("expEditCompany").value = e.company;
    $id("expEditLocation").value = e.location || "";
    $id("expEditType").value = e.type;
    $id("expEditStartDate").value = e.startDate;
    $id("expEditEndDate").value = e.endDate || "";
    $id("expEditCurrent").value = e.current ? "1" : "0";
    $id("expEditDesc").value = e.desc || "";
    $id("expEditSort").value = e.sortOrder != null ? String(e.sortOrder) : "";
    const endRow = $id("expEditEndDateRow");
    if (endRow) endRow.style.display = e.current ? "none" : "block";
    ["Title", "Company", "Type", "StartDate"].forEach((f) => {
      $id(`expEdit${f}Error`)?.classList.remove("visible");
      $id(`expEdit${f}`)?.classList.remove("error");
    });
  }
  validateForm(prefix) {
    let valid = true;
    const p = prefix === "add" ? "expAdd" : "expEdit";
    const title = $id(`${p}Title`).value.trim();
    this._err(`${p}Title`, !title);
    if (!title) valid = false;
    const company = $id(`${p}Company`).value.trim();
    this._err(`${p}Company`, !company);
    if (!company) valid = false;
    const type = $id(`${p}Type`).value;
    this._err(`${p}Type`, !type);
    if (!type) valid = false;
    const startDate = $id(`${p}StartDate`).value;
    this._err(`${p}StartDate`, !startDate);
    if (!startDate) valid = false;
    if (!valid) activateTab(p, !title || !company ? "details" : "dates");
    return { valid, title, company, type, startDate };
  }
  _err(id, isError) {
    $id(id)?.classList.toggle("error", isError);
    $id(`${id}Error`)?.classList.toggle("visible", isError);
  }
  buildNewRecord(f) {
    const current = $id("expAddCurrent").value === "1";
    return {
      title: f.title,
      company: f.company,
      location: $id("expAddLocation").value.trim(),
      type: f.type,
      startDate: f.startDate,
      endDate: current ? "" : $id("expAddEndDate").value,
      current,
      desc: $id("expAddDesc").value.trim(),
      sortOrder: parseSortInput($id("expAddSort").value, this.store.get("records").length + 1),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  applyEditToRecord(record, f) {
    const current = $id("expEditCurrent").value === "1";
    record.title = f.title;
    record.company = f.company;
    record.location = $id("expEditLocation").value.trim();
    record.type = f.type;
    record.startDate = f.startDate;
    record.endDate = current ? "" : $id("expEditEndDate").value;
    record.current = current;
    record.desc = $id("expEditDesc").value.trim();
    record.sortOrder = parseSortInput($id("expEditSort").value, record.sortOrder);
  }
};
export {
  EXP_TYPE_META,
  ExperienceModule,
  SEED_EXPERIENCE
};
