import {
  notifyCredentialsEmailStatus,
  populateStaffRoleSelect,
  showUserCredentialsPanel
} from "./chunk-ACBYJDYB.js";
import {
  authService
} from "./chunk-MRY75FFO.js";
import {
  renderPaCatCard
} from "./chunk-PNDVP3YV.js";
import {
  categoryKeyFromAccentHex
} from "./chunk-CP27TRUO.js";
import {
  CrudCardModule,
  setStatTrend,
  setStatValue
} from "./chunk-UTJL6ZWT.js";
import "./chunk-SE7HHRBZ.js";
import {
  sortByNewestFirst
} from "./chunk-3FVVIY3E.js";
import "./chunk-DUXXWVBL.js";
import {
  closePanels,
  requestConfirm
} from "./chunk-WRYMBWPQ.js";
import "./chunk-UVN7SZ5D.js";
import {
  $all,
  $id,
  escapeHtml
} from "./chunk-R5CPOL4O.js";

// client/modules/users/UsersModule.ts
var ADMIN_ROLES = ["super_admin", "admin"];
var PROTECTED_ROLES = ["super_admin", "admin"];
var ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer"
};
var ROLE_COLORS = {
  super_admin: "#a78bfa",
  admin: "#60a5fa",
  editor: "#ff6600",
  viewer: "#22c55e"
};
function formatRoleLabel(role) {
  return ROLE_LABELS[role] || String(role || "Staff").replace(/_/g, " ");
}
function formatDateTime(value) {
  if (!value) return "Never";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Unknown";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "Unknown";
  }
}
var UsersModule = class extends CrudCardModule {
  constructor() {
    super({
      name: "Users",
      storageKey: "pa_users_page_cache",
      deleteType: "user",
      idField: "id",
      page: "users",
      pageSize: Infinity,
      cardIdAttr: "data-user-id",
      bulkLabel: "user",
      tabGroup: null,
      addFocusId: "userAddFullName",
      editFocusId: "userEditFullName",
      ids: {
        grid: "paUserGrid",
        resultCount: "paUserResultCount",
        paginationBtns: "paUserPaginationBtns",
        paginationInfo: "paUserPaginationInfo",
        pagePrev: "paUserPagePrev",
        pageNext: "paUserPageNext",
        bodyScroll: "paUserBody",
        emptyResetBtn: "paUserEmptyResetBtn",
        emptyAddBtn: "paUserEmptyAddBtn",
        addPanel: "paUserAddPanel",
        editPanel: "paUserEditPanel",
        addSubmit: "paUserAddSubmit",
        editSubmit: "paUserEditSubmit",
        editDelete: "paUserEditDelete",
        addNewBtn: "paUserAddNewBtn",
        addPanelClose: "paUserAddPanelClose",
        editPanelClose: "paUserEditPanelClose",
        addCancel: "paUserAddCancel",
        editCancel: "paUserEditCancel"
      },
      defaultFilters: { role: "all" },
      filterSelectIds: [{ id: "paUserRoleFilter", key: "role" }],
      bulkSelect: false,
      menuActions: {
        "reset-credentials": (id) => {
          void this.resetCredentials(id);
        }
      }
    });
    this.currentAuthUserId = null;
    this.currentAuthEmail = null;
    this.actorRole = null;
  }
  async fetchJson(url, options) {
    const res = await fetch(url, {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...options?.body ? { "Content-Type": "application/json" } : {},
        ...options?.headers || {}
      },
      ...options
    });
    if (res.status === 401) {
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
    return data;
  }
  async ensureAdminAccess() {
    try {
      const [profile, session] = await Promise.all([
        authService.getProfile(),
        authService.session().catch(() => null)
      ]);
      this.currentAuthUserId = profile?.id || session?.user?.id || null;
      this.currentAuthEmail = profile?.email || session?.user?.email || null;
      this.actorRole = profile?.role || session?.user?.role || null;
    } catch {
      this.currentAuthUserId = null;
      this.currentAuthEmail = null;
      this.actorRole = null;
    }
    if (!ADMIN_ROLES.includes(this.actorRole)) {
      window.location.href = "/";
      return false;
    }
    return true;
  }
  isCurrentUser(record) {
    if (!record) return false;
    if (this.currentAuthUserId && String(record.id) === String(this.currentAuthUserId)) return true;
    if (this.currentAuthEmail && record.email) {
      return String(record.email).trim().toLowerCase() === String(this.currentAuthEmail).trim().toLowerCase();
    }
    return false;
  }
  async load() {
    if (!await this.ensureAdminAccess()) return;
    const data = await this.fetchJson("/api/users");
    this.store.set("records", Array.isArray(data.users) ? data.users : []);
    this.populateRoleFilter();
  }
  async persist() {
  }
  populateRoleFilter() {
    const filter = $id("paUserRoleFilter");
    if (!filter) return;
    const current = this.store.get("filters")?.role || "all";
    const roles = ["all", "super_admin", "admin", "editor", "viewer"];
    filter.innerHTML = roles.map((role) => {
      if (role === "all") return '<option value="all">All Roles</option>';
      return `<option value="${role}">${formatRoleLabel(role)}</option>`;
    }).join("");
    filter.value = roles.includes(current) ? current : "all";
  }
  sortRecords(records) {
    return sortByNewestFirst(records, "createdAt");
  }
  matchesSearch(record, query) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [record.fullName, record.username, record.email, record.role].some((part) => String(part || "").toLowerCase().includes(q));
  }
  matchesFilters(record, filters) {
    const role = filters?.role || "all";
    if (role === "all") return true;
    return record.role === role;
  }
  getDeleteName(record) {
    return record.fullName || record.email || "User";
  }
  getDeleteExtraInfo(record) {
    if (!record) return "";
    return `${formatRoleLabel(record.role)} account \u2014 ${record.email || "no email"}`;
  }
  isUserEditable(record) {
    if (!record) return false;
    if (this.isCurrentUser(record)) return false;
    if (record.role === "super_admin" && this.actorRole !== "super_admin") return false;
    return true;
  }
  isUserDeletable(record) {
    if (!record) return false;
    if (this.isCurrentUser(record)) return false;
    if (record.role === "super_admin" && this.actorRole !== "super_admin") return false;
    return true;
  }
  isUserCredentialResettable(record) {
    return this.isUserEditable(record);
  }
  setViewModeFromStore() {
    const mode = this.store.get("viewMode") || "grid";
    const gridBtn = $id("paUserGridViewBtn") || $id("paGridViewBtn");
    const listBtn = $id("paUserListViewBtn") || $id("paListViewBtn");
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
    const total = records.length;
    const active = records.filter((r) => r.isActive !== false).length;
    const editors = records.filter((r) => r.role === "editor").length;
    const viewers = records.filter((r) => r.role === "viewer").length;
    setStatValue("paUserStatTotal", total);
    setStatValue("paUserStatActive", active);
    setStatValue("paUserStatEditors", editors);
    setStatValue("paUserStatViewers", viewers);
    setStatTrend("paUserStatTotalTrend", records);
    setStatTrend("paUserStatActiveTrend", records, (r) => r.isActive !== false);
    setStatTrend("paUserStatEditorsTrend", records, (r) => r.role === "editor");
    setStatTrend("paUserStatViewersTrend", records, (r) => r.role === "viewer");
  }
  render() {
    this.renderStats();
    const { ids } = this.config;
    const all = this.getFiltered();
    const grid = $id(ids.grid);
    if (grid) {
      grid.classList.toggle("list-view", this.store.get("viewMode") === "list");
      if (all.length === 0) {
        const hasFilters = !!(this.store.get("searchQuery") || "").trim() || Object.values(this.store.get("filters")).some((v) => v && v !== "all");
        grid.innerHTML = `<div class="pa-empty-state"><i class="ri-group-line"></i><div class="pa-empty-state-title">${hasFilters ? "No users match your filters" : "No other users yet"}</div><div class="pa-empty-state-text">${hasFilters ? "Try adjusting your search or filters to find what you're looking for." : "Add staff accounts to collaborate on your portfolio dashboard."}</div>${hasFilters ? `<button class="pa-empty-state-btn" id="${ids.emptyResetBtn}">Reset filters</button>` : `<button class="pa-empty-state-btn" id="${ids.emptyAddBtn}">+ Add User</button>`}</div>`;
        this.on($id(ids.emptyResetBtn), "click", () => this.resetFilters());
        this.on($id(ids.emptyAddBtn), "click", () => this.openAddPanel());
      } else {
        grid.innerHTML = all.map((record, index) => this.renderCard(record, index)).join("");
      }
    }
    const resultCount = $id(ids.resultCount);
    const total = this.store.get("records").length;
    if (resultCount) {
      resultCount.textContent = all.length === total ? `${total} total` : `${all.length} of ${total}`;
    }
    this.populateRoleFilter();
    this.attachCardListeners();
    this.onAfterRender();
    this.setViewModeFromStore();
  }
  renderCard(record) {
    const initials = (record.fullName || record.email || "?").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
    const statusLabel = record.isActive === false ? "Inactive" : "Active";
    const selfBadge = this.isCurrentUser(record) ? '<span class="pa-cat-card__builtin">You</span>' : "";
    return renderPaCatCard({
      idAttr: "data-user-id",
      id: record.id,
      catKey: categoryKeyFromAccentHex(ROLE_COLORS[record.role] || "#60a5fa") || "web",
      iconHtml: `<div class="pa-avatar pa-user-card-avatar">${escapeHtml(initials)}</div>`,
      badge: selfBadge,
      title: record.fullName || record.username || "Unnamed User",
      slug: record.email || record.username || "\u2014",
      desc: `@${record.username || "user"} \xB7 ${formatRoleLabel(record.role)}`,
      countIcon: "ri-time-line",
      countLabel: record.lastLoginAt ? `Last login ${formatDateTime(record.lastLoginAt)}` : "Never logged in",
      status: statusLabel,
      dateLabel: "Created",
      dateValue: formatDateTime(record.createdAt),
      menuHtml: this.renderCardMenu(record)
    });
  }
  renderCardMenu(record) {
    const id = escapeHtml(String(record.id));
    if (this.isCurrentUser(record)) {
      return `<div class="pa-card-menu" data-user-id="${id}"><div class="pa-card-menu-item disabled"><i class="ri-user-line"></i> Your account</div></div>`;
    }
    const canEdit = this.isUserEditable(record);
    const canReset = this.isUserCredentialResettable(record);
    if (!canEdit && !canReset) {
      return `<div class="pa-card-menu" data-user-id="${id}"><div class="pa-card-menu-item disabled"><i class="ri-lock-line"></i> Protected account</div></div>`;
    }
    return `<div class="pa-card-menu" data-user-id="${id}">
      ${canEdit ? `<div class="pa-card-menu-item" data-action="edit" data-user-id="${id}"><i class="ri-edit-line"></i> Edit</div>` : ""}
      ${canReset ? `<div class="pa-card-menu-item" data-action="reset-credentials" data-user-id="${id}"><i class="ri-lock-password-line"></i> Reset credentials</div>` : ""}
    </div>`;
  }
  onAfterRender() {
    const recordsById = new Map(this.store.get("records").map((row) => [String(row.id), row]));
    $all(".pa-card[data-user-id]").forEach((card) => {
      const record = recordsById.get(String(card.dataset.userId));
      if (!record) return;
      card.querySelectorAll(".pa-action-edit, .pa-action-delete").forEach((btn) => {
        const isEdit = btn.classList.contains("pa-action-edit");
        const allowed = isEdit ? this.isUserEditable(record) : this.isUserDeletable(record);
        btn.classList.toggle("is-disabled", !allowed);
        btn.setAttribute("aria-disabled", allowed ? "false" : "true");
        btn.tabIndex = allowed ? 0 : -1;
        if (allowed) {
          btn.style.pointerEvents = "";
          btn.style.opacity = "";
        } else {
          btn.style.pointerEvents = "none";
          btn.style.opacity = "0.35";
        }
      });
    });
  }
  openEditPanel(id) {
    const record = this.findById(id);
    if (record && this.isCurrentUser(record)) {
      this.toast("You cannot edit your own account from this page.", "info");
      return;
    }
    super.openEditPanel(id);
  }
  bindEvents() {
    super.bindEvents();
    this.on($id("paUserEditResetCreds"), "click", () => {
      if (this.currentEditId == null) return;
      void this.resetCredentials(this.currentEditId);
    });
    const searchInput = $id("paUserSearchInput");
    if (searchInput) {
      this.on(searchInput, "input", () => {
        this.store.set("searchQuery", searchInput.value);
        this.store.set("page", 1);
        $id("paUserSearchWrap")?.classList.toggle("has-value", !!searchInput.value);
        this.render();
      });
    }
    this.on($id("paUserSearchClear"), "click", () => {
      if (!searchInput) return;
      searchInput.value = "";
      this.store.set("searchQuery", "");
      $id("paUserSearchWrap")?.classList.remove("has-value");
      this.render();
    });
    const gridBtn = $id("paUserGridViewBtn") || $id("paGridViewBtn");
    const listBtn = $id("paUserListViewBtn") || $id("paListViewBtn");
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
  resetFilters() {
    super.resetFilters();
    const searchInput = $id("paUserSearchInput");
    if (searchInput) {
      searchInput.value = "";
      $id("paUserSearchWrap")?.classList.remove("has-value");
    }
    const roleFilter = $id("paUserRoleFilter");
    if (roleFilter) roleFilter.value = "all";
  }
  resetAddForm() {
    const set = (id, value) => {
      const el = $id(id);
      if (el) el.value = value;
    };
    set("userAddFullName", "");
    set("userAddUsername", "");
    set("userAddEmail", "");
    populateStaffRoleSelect($id("userAddRole"), { selected: "editor" });
    ["userAddFullName", "userAddEmail"].forEach((fieldId) => this._setFieldError(fieldId, false));
  }
  populateEditForm(record) {
    const set = (id, value) => {
      const el = $id(id);
      if (el) el.value = value;
    };
    set("userEditFullName", record.fullName || "");
    set("userEditUsername", record.username || "");
    set("userEditEmail", record.email || "");
    set("userEditRole", record.role || "editor");
    set("userEditStatus", record.isActive === false ? "inactive" : "active");
    const roleSelect = $id("userEditRole");
    if (roleSelect) {
      populateStaffRoleSelect(roleSelect, { selected: record.role || "editor" });
      const protectedRole = PROTECTED_ROLES.includes(record.role);
      roleSelect.disabled = protectedRole && this.actorRole !== "super_admin";
    }
    const statusSelect = $id("userEditStatus");
    if (statusSelect) {
      statusSelect.disabled = false;
    }
    const deleteBtn = $id("paUserEditDelete");
    if (deleteBtn) {
      deleteBtn.style.display = this.isUserDeletable(record) ? "" : "none";
    }
    const resetBtn = $id("paUserEditResetCreds");
    if (resetBtn) {
      resetBtn.style.display = this.isUserCredentialResettable(record) ? "" : "none";
    }
  }
  validateForm(prefix) {
    const fullName = $id(`${prefix === "add" ? "userAdd" : "userEdit"}FullName`)?.value?.trim() || "";
    const email = $id(`${prefix === "add" ? "userAdd" : "userEdit"}Email`)?.value?.trim() || "";
    const validName = !!fullName;
    const validEmail = !!email;
    this._setFieldError(`${prefix === "add" ? "userAdd" : "userEdit"}FullName`, !validName);
    this._setFieldError(`${prefix === "add" ? "userAdd" : "userEdit"}Email`, !validEmail);
    return {
      valid: validName && validEmail,
      fullName,
      username: $id(`${prefix === "add" ? "userAdd" : "userEdit"}Username`)?.value?.trim() || "",
      email,
      role: $id(`${prefix === "add" ? "userAdd" : "userEdit"}Role`)?.value || "editor",
      isActive: ($id("userEditStatus")?.value || "active") === "active"
    };
  }
  _setFieldError(fieldBase, hasError) {
    const input = $id(fieldBase);
    const error = $id(`${fieldBase}Error`);
    input?.classList.toggle("error", hasError);
    if (error) error.style.display = hasError ? "flex" : "none";
  }
  buildNewRecord() {
    throw new Error("Users are created via API.");
  }
  applyEditToRecord() {
    throw new Error("Users are updated via API.");
  }
  showCredentials(credentials, emailMeta = {}) {
    if (!credentials) return;
    showUserCredentialsPanel(credentials, {
      closePanelIds: ["paUserAddPanel", "paUserEditPanel"],
      emailSent: emailMeta.emailSent,
      emailError: emailMeta.emailError
    });
  }
  confirmResetCredentials(id) {
    const record = this.findById(id);
    if (!record || !this.isUserCredentialResettable(record)) return;
    const name = escapeHtml(this.getDeleteName(record));
    requestConfirm({
      title: "Reset credentials?",
      message: `Generate a new temporary password for <strong>${name}</strong>? Their current password will stop working immediately.`,
      confirmLabel: "Reset credentials",
      iconClass: "ri-lock-password-line",
      iconTone: "warning",
      danger: false,
      onConfirm: () => {
        void this.performResetCredentials(id);
      }
    });
  }
  resetCredentials(id) {
    const record = this.findById(id);
    if (!record) return;
    if (this.isCurrentUser(record)) {
      this.toast("You cannot reset your own credentials from this page.", "info");
      return;
    }
    if (!this.isUserCredentialResettable(record)) return;
    this.confirmResetCredentials(id);
  }
  async performResetCredentials(id) {
    const record = this.findById(id);
    if (!record || !this.isUserCredentialResettable(record)) return;
    this.statusToast("Resetting credentials\u2026", "info", 12e4);
    try {
      const data = await this.fetchJson(`/api/users/${encodeURIComponent(id)}/reset-credentials`, {
        method: "POST"
      });
      closePanels();
      this.currentEditId = null;
      this.showCredentials(data.credentials, data);
      notifyCredentialsEmailStatus({ ...data, action: "reset" });
      this.notify(`Temporary password regenerated for "${this.getDeleteName(record)}".`, "ri-lock-password-line");
    } catch (error) {
      this.statusToast(error.message || "Could not reset credentials.", "danger");
    }
  }
  async handleAddSubmit() {
    const result = this.validateForm("add");
    if (!result.valid) {
      this.toast("Please fill in all required fields", "danger");
      return;
    }
    this.statusToast("Creating user\u2026", "info", 12e4);
    try {
      const payload = {
        fullName: result.fullName,
        username: result.username,
        email: result.email,
        role: result.role
      };
      const data = await this.fetchJson("/api/users", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      closePanels();
      await this.load();
      this.render();
      this.showCredentials(data.credentials, data);
      notifyCredentialsEmailStatus(data);
      this.notify(`New user "${result.fullName}" was added.`, "ri-user-add-line");
    } catch (error) {
      this.statusToast(error.message || "Could not create user.", "danger");
    }
  }
  async handleEditSubmit() {
    if (this.currentEditId == null) return;
    const record = this.findById(this.currentEditId);
    if (!record) return;
    if (this.isCurrentUser(record)) {
      this.toast("You cannot edit your own account from this page.", "info");
      return;
    }
    const result = this.validateForm("edit");
    if (!result.valid) {
      this.toast("Please fill in all required fields", "danger");
      return;
    }
    const payload = {
      fullName: result.fullName,
      username: result.username,
      email: result.email
    };
    if (!PROTECTED_ROLES.includes(record.role) || this.actorRole === "super_admin") {
      payload.role = result.role;
    }
    if (!this.isCurrentUser(record)) {
      payload.isActive = result.isActive;
    }
    this.statusToast("Saving changes\u2026", "info", 12e4);
    try {
      const data = await this.fetchJson(`/api/users/${encodeURIComponent(this.currentEditId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      const records = this.store.get("records").map((row) => String(row.id) === String(data.user.id) ? { ...row, ...data.user } : row);
      this.store.set("records", records);
      closePanels();
      this.currentEditId = null;
      this.render();
      this.statusToast(`"${this.getDeleteName(data.user)}" updated successfully!`, "success");
      this.notify(`User "${this.getDeleteName(data.user)}" was updated.`, "ri-user-settings-line");
    } catch (error) {
      this.statusToast(error.message || "Could not update user.", "danger");
    }
  }
  async deleteById(id) {
    const record = this.findById(id);
    if (!record) return;
    if (this.isCurrentUser(record)) {
      this.toast("You cannot delete your own account from this page.", "info");
      return;
    }
    if (!this.isUserDeletable(record)) return;
    const name = this.getDeleteName(record);
    this.statusToast("Deleting user\u2026", "info", 12e4);
    try {
      await this.fetchJson(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      this.store.set("records", this.store.get("records").filter((row) => String(row.id) !== String(id)));
      closePanels();
      this.currentEditId = null;
      this.render();
      this.statusToast(`"${name}" was deleted.`, "danger");
      this.notify(`User "${name}" was deleted.`, "ri-delete-bin-line");
    } catch (error) {
      this.statusToast(error.message || "Could not delete user.", "danger");
    }
  }
};
export {
  UsersModule
};
