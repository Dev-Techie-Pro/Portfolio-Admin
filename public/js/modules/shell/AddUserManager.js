import { $id } from "../../utils/dom.js";
import { showToast, showStatusToast } from "./toast.js";
import { addNotification } from "./notifications.js";
import { closePanels, openPanel, registerPanel } from "./panels.js";
import { authService } from "../../core/AuthService.js";
import { populateStaffRoleSelect, formatStaffRoleLabel } from "../../utils/staffRoles.js";
import {
  clearUserCredentials,
  notifyCredentialsEmailStatus,
  showUserCredentialsPanel
} from "../../utils/userCredentialsPanel.js";
const ADMIN_ROLES = ["super_admin", "admin"];
class AddUserManager {
  /**
   * @param {object} opts
   * @param {(el: Element, event: string, handler: Function) => void} opts.on
   * @param {() => void} [opts.closeUserMenu]
   */
  constructor({ on, closeUserMenu }) {
    this.on = on;
    this.closeUserMenu = closeUserMenu;
    this._profileRole = null;
  }
  bindEvents() {
    registerPanel("paAddUserPanel");
    const menuBtn = $id("paAddUserMenuBtn");
    if (menuBtn) {
      this.on(menuBtn, "click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeUserMenu?.();
        void this.openAddUserPanel();
      });
    }
    this.on($id("paAddUserPanelClose"), "click", () => this.closeAddUserPanel());
    this.on($id("paAddUserCancelBtn"), "click", () => this.closeAddUserPanel());
    this.on($id("paAddUserSubmitBtn"), "click", () => {
      void this.submitAddUser();
    });
    this.on($id("paPanelOverlay"), "click", (e) => {
      if (e.target.id !== "paPanelOverlay") return;
      if ($id("paUserCredentialsPanel")?.classList.contains("visible")) {
        this.closeCredentialsPanel();
      } else if ($id("paAddUserPanel")?.classList.contains("visible")) {
        this.closeAddUserPanel();
      }
    });
  }
  setProfileRole(role) {
    this._profileRole = role || null;
  }
  isAdmin() {
    return ADMIN_ROLES.includes(this._profileRole);
  }
  async ensureAdminAccess() {
    if (this.isAdmin()) return true;
    try {
      const profile = await authService.getProfile();
      this._profileRole = profile?.role || null;
    } catch {
      this._profileRole = null;
    }
    if (!this.isAdmin()) {
      showToast("Only administrators can add users.", "danger");
      return false;
    }
    return true;
  }
  resetAddUserForm() {
    const set = (id, value) => {
      const el = $id(id);
      if (el) el.value = value;
    };
    set("addUserFullName", "");
    set("addUserUsername", "");
    set("addUserEmail", "");
    populateStaffRoleSelect($id("addUserRole"), { selected: "editor" });
  }
  async openAddUserPanel() {
    if (!await this.ensureAdminAccess()) return;
    this.resetAddUserForm();
    openPanel("paAddUserPanel", ["paUserCredentialsPanel"]);
    window.setTimeout(() => $id("addUserFullName")?.focus(), 120);
  }
  closeAddUserPanel() {
    closePanels();
  }
  closeCredentialsPanel() {
    closePanels();
    clearUserCredentials();
  }
  collectFormPayload() {
    return {
      fullName: $id("addUserFullName")?.value?.trim() || "",
      username: $id("addUserUsername")?.value?.trim() || "",
      email: $id("addUserEmail")?.value?.trim() || "",
      role: $id("addUserRole")?.value || "editor"
    };
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
  async submitAddUser() {
    if (!await this.ensureAdminAccess()) return;
    const payload = this.collectFormPayload();
    if (!payload.fullName) {
      showToast("Full name is required.", "danger");
      $id("addUserFullName")?.focus();
      return;
    }
    if (!payload.email) {
      showToast("Email is required.", "danger");
      $id("addUserEmail")?.focus();
      return;
    }
    showStatusToast("Creating user\u2026", "info", 12e4);
    try {
      const result = await this.fetchJson("/api/users", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      this.showCredentials(result.credentials, result);
      addNotification(`User ${result.user?.fullName || result.user?.email || payload.email} was created`, "ri-user-add-line");
      notifyCredentialsEmailStatus(result);
    } catch (error) {
      showStatusToast(error.message || "Could not create user.", "danger");
    }
  }
  formatRoleLabel(role) {
    return formatStaffRoleLabel(role);
  }
  showCredentials(credentials, emailMeta = {}) {
    if (!credentials) return;
    showUserCredentialsPanel(credentials, {
      closePanelIds: ["paAddUserPanel"],
      emailSent: emailMeta.emailSent,
      emailError: emailMeta.emailError
    });
  }
}
export {
  AddUserManager
};
