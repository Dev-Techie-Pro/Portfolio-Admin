import { Module } from "../../core/Module.js";
import { storage } from "../../core/StorageService.js";
import { $id, escapeHtml } from "../../utils/dom.js";
import { debounce } from "../../utils/timing.js";
import { requestDelete } from "../../modules/shell/confirm.js";
import { closeAllCardMenus, toggleCardMenu } from "../../modules/shell/cardMenu.js";
import { BulkSelectController } from "../../core/BulkSelectController.js";
const PAGE_SIZE = 10;
const AVATAR_COLORS = ["#e5484d", "#f0c040", "#22c55e", "#38bdf8", "#a78bfa", "#f472b6", "#ff6600", "#2dd4bf"];
const TYPE_META = {
  user_action: { label: "User Action", icon: "ri-user-line", cls: "blue" },
  system_event: { label: "System Event", icon: "ri-cpu-line", cls: "purple" },
  content_change: { label: "Content Change", icon: "ri-file-edit-line", cls: "green" },
  other: { label: "Other", icon: "ri-more-line", cls: "pink" }
};
const STATUS_META = {
  success: { label: "Success", cls: "success" },
  completed: { label: "Completed", cls: "success" },
  sent: { label: "Sent", cls: "success" },
  created: { label: "Created", cls: "info" },
  info: { label: "Info", cls: "info" },
  uploaded: { label: "Uploaded", cls: "info" },
  warning: { label: "Warning", cls: "warning" },
  failed: { label: "Failed", cls: "warning" }
};
function initials(name) {
  return (name || "S").split(/[\s.@]+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
function avatarColor(name) {
  let hash = 0;
  const str = name || "";
  for (let i = 0; i < str.length; i++) hash = hash * 31 + str.charCodeAt(i) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: "Unknown", time: "" };
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    };
  } catch {
    return { date: "Unknown", time: "" };
  }
}
function growthLabel(value) {
  if (value > 0) return `+${value}%`;
  if (value < 0) return `${value}%`;
  return "0%";
}
class RecentActivitiesModule extends Module {
  constructor() {
    super({
      name: "RecentActivities",
      storageKey: "pa_recent_activities",
      initialState: {
        activities: [],
        stats: null,
        users: [],
        typeFilter: "all",
        dateFilter: "7",
        sortBy: "date_desc",
        userFilter: "all",
        statusFilter: "all",
        searchQuery: "",
        page: 1,
        selectedId: null,
        loading: false
      }
    });
    this.actNow = Date.now();
    this.bulkSelect = new BulkSelectController(this, {
      containerId: "paActTableBody",
      itemSelector: ".pa-act-row",
      idAttr: "data-act-id",
      label: "activity",
      skipRowClick: true,
      ids: {
        selectBtn: "paActSelectModeBtn",
        bar: "paActBulkActionBar",
        count: "paActBulkSelectedCount",
        selectAllBtn: "paActBulkSelectAllBtn",
        clearBtn: "paActBulkClearBtn",
        deleteBtn: "paActBulkDeleteBtn"
      },
      getVisibleIds: () => {
        const all = this.getFiltered();
        const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
        let page = this.store.get("page");
        if (page > totalPages) page = totalPages;
        if (page < 1) page = 1;
        const start = (page - 1) * PAGE_SIZE;
        return all.slice(start, start + PAGE_SIZE).map((a) => a.id);
      },
      onBulkDelete: (ids) => this.bulkDelete(ids)
    });
  }
  async load() {
    await this.fetchData();
  }
  async fetchData({ forceRefresh = false } = {}) {
    this.store.set("loading", true);
    try {
      if (forceRefresh) storage.invalidate("pa_recent_activities");
      const payload = await storage.get("pa_recent_activities", { activities: [], stats: null, users: [] });
      this.store.batch(() => {
        this.store.set("activities", payload.activities || []);
        this.store.set("stats", payload.stats || null);
        this.store.set("users", payload.users || []);
        this.store.set("loading", false);
      });
      this.computeNow();
      this.populateUserFilter();
    } catch (err) {
      this.store.set("loading", false);
      this.toast("Could not load activities. Please try again.", "danger");
      console.warn("[RecentActivities] load failed:", err);
    }
  }
  computeNow() {
    const activities = this.store.get("activities");
    if (!activities.length) {
      this.actNow = Date.now();
      return;
    }
    const latest = Math.max(...activities.map((a) => new Date(a.createdAt).getTime()));
    this.actNow = latest + 36e5;
  }
  findById(id) {
    return this.store.get("activities").find((a) => a.id === id);
  }
  getFiltered() {
    const {
      activities,
      typeFilter,
      dateFilter,
      sortBy,
      userFilter,
      statusFilter,
      searchQuery
    } = this.store._raw;
    let result = activities.slice();
    if (typeFilter !== "all") {
      result = result.filter((a) => a.type === typeFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (userFilter !== "all") {
      result = result.filter((a) => a.userId === userFilter);
    }
    if (dateFilter !== "all") {
      const spans = { 1: 864e5, 7: 864e5 * 7, 30: 864e5 * 30, 90: 864e5 * 90 };
      const span = spans[dateFilter];
      if (span) {
        result = result.filter((a) => this.actNow - new Date(a.createdAt).getTime() <= span);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((a) => a.actionTitle.toLowerCase().includes(q) || a.actionDescription.toLowerCase().includes(q) || a.userName.toLowerCase().includes(q));
    }
    if (sortBy === "date_desc") {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === "date_asc") {
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === "type") {
      result.sort((a, b) => (TYPE_META[a.type]?.label || "").localeCompare(TYPE_META[b.type]?.label || ""));
    } else if (sortBy === "status") {
      result.sort((a, b) => (STATUS_META[a.status]?.label || "").localeCompare(STATUS_META[b.status]?.label || ""));
    }
    return result;
  }
  populateUserFilter() {
    const select = $id("paActUserFilter");
    if (!select) return;
    const users = this.store.get("users");
    const current = this.store.get("userFilter");
    select.innerHTML = `<option value="all">All Users</option>${users.map(
      (u) => `<option value="${escapeHtml(u.id)}"${u.id === current ? " selected" : ""}>${escapeHtml(u.name)}</option>`
    ).join("")}`;
  }
  render() {
    this.renderStats();
    this.renderTable();
  }
  renderStats() {
    const stats = this.store.get("stats");
    const set = (id, val) => {
      const el = $id(id);
      if (el) el.textContent = val;
    };
    const setGrowth = (id, val) => {
      const el = $id(id);
      if (!el) return;
      el.textContent = growthLabel(val);
      el.classList.toggle("up", val > 0);
      el.classList.toggle("down", val < 0);
      el.classList.toggle("neutral", val === 0);
    };
    if (!stats) {
      set("paActStatUser", "0");
      set("paActStatSystem", "0");
      set("paActStatContent", "0");
      set("paActStatOther", "0");
      setGrowth("paActGrowthUser", 0);
      setGrowth("paActGrowthSystem", 0);
      setGrowth("paActGrowthContent", 0);
      setGrowth("paActGrowthOther", 0);
      return;
    }
    set("paActStatUser", stats.userAction?.count ?? 0);
    set("paActStatSystem", stats.systemEvent?.count ?? 0);
    set("paActStatContent", stats.contentChange?.count ?? 0);
    set("paActStatOther", stats.other?.count ?? 0);
    setGrowth("paActGrowthUser", stats.userAction?.growth ?? 0);
    setGrowth("paActGrowthSystem", stats.systemEvent?.growth ?? 0);
    setGrowth("paActGrowthContent", stats.contentChange?.growth ?? 0);
    setGrowth("paActGrowthOther", stats.other?.growth ?? 0);
  }
  renderActionMenu(a) {
    return `<div class="pa-msg-actions pa-card-actions">
          <button class="pa-action-btn pa-action-more" data-action="menu" data-act-id="${escapeHtml(a.id)}" title="More options" aria-label="More options">
            <i class="ri-more-2-fill"></i>
          </button>
          <div class="pa-card-menu" data-act-id="${escapeHtml(a.id)}">
            <div class="pa-card-menu-item" data-action="view" data-act-id="${escapeHtml(a.id)}"><i class="ri-eye-line"></i> View Details</div>
            <div class="pa-card-menu-item" data-action="copy" data-act-id="${escapeHtml(a.id)}"><i class="ri-file-copy-line"></i> Copy Details</div>
            <div class="pa-card-menu-item danger" data-action="delete" data-act-id="${escapeHtml(a.id)}"><i class="ri-delete-bin-line"></i> Delete</div>
          </div>
        </div>`;
  }
  renderRow(a) {
    const typeMeta = TYPE_META[a.type] || TYPE_META.other;
    const statusMeta = STATUS_META[a.status] || STATUS_META.info;
    const init = initials(a.userName);
    const color = avatarColor(a.userName);
    const { date, time } = formatDateTime(a.createdAt);
    const isSelected = a.id === this.store.get("selectedId");
    const bulkMode = this.bulkSelect.isSelectMode();
    const bulkSelected = this.bulkSelect.isSelected(a.id);
    const checkboxCell = bulkMode ? `<td style="width:36px;"><input type="checkbox" class="pa-msg-bulk-checkbox" id="paActBulkCb-${escapeHtml(a.id)}" data-select-id="${escapeHtml(a.id)}" ${bulkSelected ? "checked" : ""} aria-label="Select activity ${escapeHtml(a.actionTitle)} for bulk actions" /></td>` : "";
    return `<tr class="pa-act-row ${isSelected ? "selected" : ""}${bulkSelected ? " pa-selected" : ""}" data-act-id="${escapeHtml(a.id)}">
      ${checkboxCell}
      <td>
        <div class="pa-act-cell">
          <div class="pa-act-avatar" style="background:${color};">${escapeHtml(init)}</div>
          <div class="pa-act-text">
            <div class="pa-act-title">${escapeHtml(a.actionTitle)}</div>
            <div class="pa-act-desc">${escapeHtml(a.actionDescription)}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="pa-act-type-badge ${typeMeta.cls}">
          <i class="${typeMeta.icon}"></i> ${typeMeta.label}
        </span>
      </td>
      <td>
        <span class="pa-act-status-badge ${statusMeta.cls}">${statusMeta.label}</span>
      </td>
      <td>
        <div class="pa-msg-date">${date}</div>
        <div class="pa-msg-time">${time}</div>
      </td>
      <td>${this.renderActionMenu(a)}</td>
    </tr>`;
  }
  getEmptyStateHtml() {
    const hasFilters = this.store.get("searchQuery").trim() || this.store.get("typeFilter") !== "all" || this.store.get("dateFilter") !== "7" || this.store.get("userFilter") !== "all" || this.store.get("statusFilter") !== "all";
    return `<div class="pa-empty-state"><i class="ri-history-line"></i><div class="pa-empty-state-title">${hasFilters ? "No activities match your filters" : "No activities yet"}</div><div class="pa-empty-state-text">${hasFilters ? "Try adjusting your filters or date range." : "User actions and system events will appear here as they occur."}</div>${hasFilters ? '<button class="pa-empty-state-btn" id="paActEmptyResetBtn">Reset filters</button>' : ""}</div>`;
  }
  renderTable() {
    const all = this.getFiltered();
    const totalItems = all.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    let page = this.store.get("page");
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    this.store.set("page", page);
    const start = (page - 1) * PAGE_SIZE;
    const pageItems = all.slice(start, start + PAGE_SIZE);
    const tbody = $id("paActTableBody");
    const loading = this.store.get("loading");
    const bulkMode = this.bulkSelect.isSelectMode();
    const colCount = bulkMode ? 6 : 5;
    const bulkColHead = $id("paActBulkColHead");
    if (bulkColHead) bulkColHead.style.display = bulkMode ? "" : "none";
    if (tbody) {
      if (loading) {
        tbody.innerHTML = `<tr><td colspan="${colCount}"><div class="pa-empty-state"><i class="ri-loader-4-line pa-spin"></i><div class="pa-empty-state-title">Loading activities\u2026</div></div></td></tr>`;
      } else if (pageItems.length === 0) {
        tbody.innerHTML = `<tr class="pa-act-table-empty"><td colspan="${colCount}">${this.getEmptyStateHtml()}</td></tr>`;
        this.on($id("paActEmptyResetBtn"), "click", () => this.resetFilters());
      } else {
        tbody.innerHTML = pageItems.map((a) => this.renderRow(a)).join("");
      }
    }
    this.renderPagination(totalItems, totalPages, page);
    this.attachRowListeners();
    this.bulkSelect.onRender();
    this.renderDetail();
  }
  renderPagination(totalItems, totalPages, page) {
    const btnsWrap = $id("paActPaginationBtns");
    const info = $id("paActPaginationInfo");
    if (!btnsWrap || !info) return;
    if (totalItems === 0) {
      btnsWrap.innerHTML = "";
      info.textContent = "Showing 0 activities";
      return;
    }
    if (totalPages <= 1) {
      btnsWrap.innerHTML = "";
      info.textContent = `Showing ${totalItems} of ${totalItems} activities`;
      return;
    }
    let html = `<div class="pa-page-nav ${page === 1 ? "disabled" : ""}" id="paActPagePrev" role="button" aria-label="Previous page"><i class="ri-arrow-left-s-line"></i></div>`;
    let lastShown = 0;
    for (let p = 1; p <= totalPages; p++) {
      const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
      if (!show) continue;
      if (p - lastShown > 1) html += '<span class="pa-act-page-ellipsis">\u2026</span>';
      html += `<button class="pa-page-btn ${p === page ? "active" : ""}" data-page="${p}">${p}</button>`;
      lastShown = p;
    }
    html += `<div class="pa-page-nav ${page === totalPages ? "disabled" : ""}" id="paActPageNext" role="button" aria-label="Next page"><i class="ri-arrow-right-s-line"></i></div>`;
    btnsWrap.innerHTML = html;
    const startN = (page - 1) * PAGE_SIZE + 1;
    const endN = Math.min(page * PAGE_SIZE, totalItems);
    info.textContent = `Showing ${startN} to ${endN} of ${totalItems} activities`;
    btnsWrap.querySelectorAll(".pa-page-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.store.set("page", parseInt(btn.dataset.page, 10));
        this.renderTable();
        $id("paActListCard")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
    const prev = $id("paActPagePrev");
    const next = $id("paActPageNext");
    if (prev && !prev.classList.contains("disabled")) {
      prev.addEventListener("click", () => {
        this.store.set("page", page - 1);
        this.renderTable();
      });
    }
    if (next && !next.classList.contains("disabled")) {
      next.addEventListener("click", () => {
        this.store.set("page", page + 1);
        this.renderTable();
      });
    }
  }
  attachRowListeners() {
    const tbody = $id("paActTableBody");
    if (!tbody) return;
    tbody.querySelectorAll(".pa-act-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (this.bulkSelect.isSelectMode()) {
          if (e.target.closest(".pa-msg-actions") || e.target.closest("[data-select-id]")) return;
          this.bulkSelect.toggleSelect(row.dataset.actId);
          return;
        }
        if (e.target.closest(".pa-msg-actions")) return;
        this.selectActivity(row.dataset.actId);
      });
    });
    tbody.querySelectorAll('[data-action="menu"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.actId;
        const menu = tbody.querySelector(`.pa-card-menu[data-act-id="${CSS.escape(id)}"]`);
        if (menu) toggleCardMenu(menu, btn);
      });
    });
    tbody.querySelectorAll(".pa-card-menu-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        const id = item.dataset.actId;
        closeAllCardMenus();
        const a = this.findById(id);
        if (!a) return;
        if (action === "view") this.selectActivity(id);
        else if (action === "copy") this.copyActivity(a);
        else if (action === "delete") requestDelete(id, "activity", a.actionTitle, "Delete this activity?");
      });
    });
  }
  selectActivity(id) {
    this.store.set("selectedId", id);
    this.renderTable();
    $id("paActDetailPanel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  copyActivity(a) {
    const { date, time } = formatDateTime(a.createdAt);
    const typeMeta = TYPE_META[a.type] || TYPE_META.other;
    const statusMeta = STATUS_META[a.status] || STATUS_META.info;
    const text = `${a.actionTitle}
${a.actionDescription}
Type: ${typeMeta.label}
Status: ${statusMeta.label}
User: ${a.userName}
Time: ${date} ${time}`;
    navigator.clipboard.writeText(text).then(() => {
      this.toast("Activity details copied to clipboard.", "success", 2e3);
    }).catch(() => {
      this.toast("Could not copy to clipboard.", "danger");
    });
  }
  async deleteActivity(id) {
    const prev = this.store.get("activities");
    const filtered = prev.filter((a) => a.id !== id);
    this.store.set("activities", filtered);
    if (this.store.get("selectedId") === id) this.store.set("selectedId", null);
    try {
      this.statusToast("Deleting activity\u2026", "info", 12e4);
      const res = await fetch(`/api/recent-activities?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin"
      });
      if (!res.ok) throw new Error(await res.text());
      await this.fetchData({ forceRefresh: true });
      this.render();
      this.statusToast("Activity deleted.", "danger");
    } catch {
      this.store.set("activities", prev);
      this.renderTable();
      this.statusToast("Could not delete activity. Please try again.", "danger");
    }
  }
  async bulkDelete(ids) {
    const idList = [...ids].map(String).filter(Boolean);
    if (!idList.length) return;
    try {
      this.statusToast("Deleting activities\u2026", "info", 12e4);
      const res = await fetch("/api/recent-activities", {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ids: idList })
      });
      let payload = {};
      try {
        payload = await res.json();
      } catch {
        payload = {};
      }
      if (!res.ok) {
        throw new Error(payload.error || "Bulk delete failed.");
      }
      const deleted = payload.deleted ?? idList.length;
      if (idList.includes(String(this.store.get("selectedId")))) {
        this.store.set("selectedId", null);
      }
      await this.fetchData({ forceRefresh: true });
      if (this.bulkSelect.isSelectMode()) {
        this.bulkSelect.toggleSelectMode();
      } else {
        this.render();
      }
      this.statusToast(`${deleted} activit${deleted === 1 ? "y" : "ies"} deleted.`, "danger");
      this.notify(`${deleted} activit${deleted === 1 ? "y" : "ies"} deleted in bulk.`, "ri-delete-bin-line");
    } catch (err) {
      console.warn("[RecentActivities] bulk delete failed:", err);
      this.renderTable();
      this.renderDetail();
      this.statusToast("Could not delete activities. Please try again.", "danger");
    }
  }
  renderDetail() {
    const body = $id("paActDetailBody");
    if (!body) return;
    const a = this.findById(this.store.get("selectedId"));
    if (!a) {
      body.innerHTML = `<div class="pa-msg-detail-empty"><i class="ri-history-line"></i><div class="pa-msg-detail-empty-title">No activity selected</div><div class="pa-msg-detail-empty-text">Select an activity from the table to view full details here.</div></div>`;
      return;
    }
    const typeMeta = TYPE_META[a.type] || TYPE_META.other;
    const statusMeta = STATUS_META[a.status] || STATUS_META.info;
    const init = initials(a.userName);
    const color = avatarColor(a.userName);
    const { date, time } = formatDateTime(a.createdAt);
    const metaEntries = Object.entries(a.metadata || {}).filter(([, v]) => v != null && v !== "");
    body.innerHTML = `
      <div class="pa-msg-detail-sender">
        <div class="pa-msg-detail-avatar" style="background:${color};">${escapeHtml(init)}</div>
        <div style="min-width:0;">
          <div class="pa-msg-detail-sender-name">${escapeHtml(a.userName)}</div>
          ${a.userEmail ? `<div class="pa-msg-detail-sender-email">${escapeHtml(a.userEmail)}</div>` : ""}
        </div>
        <div class="pa-msg-detail-sender-status"><span class="pa-act-status-badge ${statusMeta.cls}">${statusMeta.label}</span></div>
      </div>
      <div class="pa-msg-detail-meta">
        <span><i class="ri-calendar-line"></i> ${date} at ${time}</span>
        <span><i class="${typeMeta.icon}"></i> ${typeMeta.label}</span>
      </div>
      <div class="pa-msg-detail-label">Activity</div>
      <div class="pa-msg-detail-subject">${escapeHtml(a.actionTitle)}</div>
      <div class="pa-msg-detail-label">Description</div>
      <div class="pa-msg-detail-box">${escapeHtml(a.actionDescription || "\u2014")}</div>
      ${metaEntries.length ? `<div class="pa-msg-detail-label">Metadata</div><div class="pa-act-meta-grid">${metaEntries.map(([k, v]) => `<div class="pa-act-meta-item"><span class="pa-act-meta-key">${escapeHtml(k)}</span><span class="pa-act-meta-val">${escapeHtml(String(v))}</span></div>`).join("")}</div>` : ""}
    `;
  }
  resetFilters() {
    this.store.batch(() => {
      this.store.set("typeFilter", "all");
      this.store.set("dateFilter", "7");
      this.store.set("sortBy", "date_desc");
      this.store.set("userFilter", "all");
      this.store.set("statusFilter", "all");
      this.store.set("searchQuery", "");
      this.store.set("page", 1);
    });
    const searchInput = $id("paActSearchInput");
    if (searchInput) searchInput.value = "";
    const typeSelect = $id("paActTypeFilter");
    if (typeSelect) typeSelect.value = "all";
    const dateSelect = $id("paActDateFilter");
    if (dateSelect) dateSelect.value = "7";
    const sortSelect = $id("paActSortFilter");
    if (sortSelect) sortSelect.value = "date_desc";
    const userSelect = $id("paActUserFilter");
    if (userSelect) userSelect.value = "all";
    const statusSelect = $id("paActStatusFilter");
    if (statusSelect) statusSelect.value = "all";
    this.render();
  }
  bindEvents() {
    this.onBus("confirm:confirmed", ({ id, type }) => {
      if (type === "activity") this.deleteActivity(id);
    });
    document.addEventListener("click", () => closeAllCardMenus());
    const actBody = $id("paActBody");
    if (actBody) {
      this.on(actBody, "scroll", () => closeAllCardMenus(), { passive: true });
    }
    const refreshBtn = $id("paActRefreshBtn");
    if (refreshBtn) {
      this.on(refreshBtn, "click", async () => {
        refreshBtn.disabled = true;
        refreshBtn.classList.add("loading");
        await this.fetchData({ forceRefresh: true });
        this.render();
        refreshBtn.disabled = false;
        refreshBtn.classList.remove("loading");
        this.toast("Activities refreshed.", "success", 2e3);
      });
    }
    const typeFilter = $id("paActTypeFilter");
    if (typeFilter) {
      this.on(typeFilter, "change", () => {
        this.store.set("typeFilter", typeFilter.value);
        this.store.set("page", 1);
        this.renderTable();
      });
    }
    const dateFilter = $id("paActDateFilter");
    if (dateFilter) {
      this.on(dateFilter, "change", () => {
        this.store.set("dateFilter", dateFilter.value);
        this.store.set("page", 1);
        this.renderTable();
      });
    }
    const sortFilter = $id("paActSortFilter");
    if (sortFilter) {
      this.on(sortFilter, "change", () => {
        this.store.set("sortBy", sortFilter.value);
        this.store.set("page", 1);
        this.renderTable();
      });
    }
    const userFilter = $id("paActUserFilter");
    if (userFilter) {
      this.on(userFilter, "change", () => {
        this.store.set("userFilter", userFilter.value);
        this.store.set("page", 1);
        this.renderTable();
      });
    }
    const statusFilter = $id("paActStatusFilter");
    if (statusFilter) {
      this.on(statusFilter, "change", () => {
        this.store.set("statusFilter", statusFilter.value);
        this.store.set("page", 1);
        this.renderTable();
      });
    }
    const searchInput = $id("paActSearchInput");
    if (searchInput) {
      this.on(searchInput, "input", debounce(() => {
        this.store.set("searchQuery", searchInput.value);
        this.store.set("page", 1);
        this.renderTable();
      }, 250));
    }
    const closeDetail = $id("paActDetailClose");
    if (closeDetail) {
      this.on(closeDetail, "click", () => {
        this.store.set("selectedId", null);
        this.renderTable();
      });
    }
  }
}
export {
  RecentActivitiesModule
};
