import { Module } from "../../core/Module.js";
import {
  $id,
  escapeHtml,
  $field,
  $input,
  $select,
  asFormField,
  asHtmlInput,
  asHtmlButton
} from "../../utils/dom.js";
import { showToast, showStatusToast } from "../shell/toast.js";
import { addNotification, loadNotifications, requestBrowserNotificationPermission } from "../shell/notifications.js";
import { storage } from "../../core/StorageService.js";
import { authService } from "../../core/AuthService.js";
import { SecurityManager } from "./SecurityManager.js";
import { SystemManager } from "./SystemManager.js";
import {
  getLoginPath,
  getSettingsTabFromPath,
  getSettingsTabPath,
  getSettingsPageMeta,
  SETTINGS_TABS
} from "../../core/router.js";
import { setupAllPasswordToggles } from "../../utils/password-toggle.js";
import { syncSettingsNavTab } from "../shell/settingsNav.js";
import { initSettingsCardCollapse } from "./settingsCardCollapse.js";
import { readFileAsDataUrl, readOptimizedImageDataUrl, handleFileValidation } from "../../utils/files.js";
import { applyUserDisplay, renderPreviewAvatar, setCoverImage, applyRoleBasedAccess } from "../../utils/user-display.js";
import { eventBus } from "../../core/EventBus.js";
import { initRoleRequestCard } from "./roleRequest.js";
class SettingsModule extends Module {
  constructor() {
    super({
      name: "Settings",
      storageKey: "pa_settings",
      initialState: {
        activeTab: "general",
        profile: null
      }
    });
    this._profileLoadSeq = 0;
    this._loginActivityScope = "self";
    this.security = new SecurityManager({
      on: this.on.bind(this),
      getProfile: async () => this.store.get("profile") || authService.getProfile().catch(() => null)
    });
    this.system = new SystemManager({
      on: this.on.bind(this),
      getProfile: async () => this.store.get("profile") || authService.getProfile().catch(() => null)
    });
  }
  async load() {
    const saved = await this.loadRecords(() => ({}));
    this.store.set("settings", saved);
    this.wireGeneralFormFields();
    this.hydrateFromSettings();
    await Promise.all([
      this.loadProfile(),
      this.loadNotificationPreferences()
    ]);
  }
  wireGeneralFormFields() {
    const panel = document.querySelector('.pa-tab-panel[data-content="general"]');
    if (!panel || panel.dataset.generalWired === "true") return;
    const setSelectOptions = (id, options) => {
      const el = $select(id);
      if (!el) return;
      el.innerHTML = options.map((opt) => `<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`).join("");
    };
    setSelectOptions("dateFormat", [
      { value: "May 19, 2024", label: "May 19, 2024" },
      { value: "19/05/2024", label: "19/05/2024" },
      { value: "2024-05-19", label: "2024-05-19" }
    ]);
    setSelectOptions("timeFormat", [
      { value: "12 Hour (AM/PM)", label: "12 Hour (AM/PM)" },
      { value: "24 Hour", label: "24 Hour" }
    ]);
    setSelectOptions("timezone", [
      { value: "(GMT+05:00) Islamabad, Pakistan", label: "GMT+05:00 \u2014 Islamabad, Karachi" },
      { value: "(GMT+00:00) UTC", label: "GMT+00:00 \u2014 UTC" },
      { value: "(GMT-05:00) New York", label: "GMT-05:00 \u2014 New York" },
      { value: "(GMT+01:00) London", label: "GMT+01:00 \u2014 London" }
    ]);
    setSelectOptions("itemsPerPage", [
      { value: "12", label: "12 items" },
      { value: "24", label: "24 items" },
      { value: "48", label: "48 items" }
    ]);
    setSelectOptions("defaultView", [
      { value: "grid", label: "Grid View" },
      { value: "list", label: "List View" }
    ]);
    setSelectOptions("language", [
      { value: "en", label: "English (EN)" },
      { value: "ar", label: "Arabic (AR)" },
      { value: "ur", label: "Urdu (UR)" }
    ]);
    const otherCard = panel.querySelector(".pa-card-settings.mt-10");
    if (otherCard && !otherCard.querySelector('[data-save="other"]')) {
      const saveWrap = document.createElement("div");
      saveWrap.className = "pa-settings-actions";
      saveWrap.innerHTML = '<button type="button" class="pa-btn pa-btn-primary" data-save="other"><i class="ri-save-line"></i> Save Other Settings</button>';
      otherCard.appendChild(saveWrap);
    }
    panel.dataset.generalWired = "true";
  }
  setSelectValue(id, value, fallback = "") {
    const el = $select(id);
    if (!el || value == null) return;
    const resolved = String(value);
    const hasOption = [...el.options].some((opt) => opt.value === resolved);
    el.value = hasOption ? resolved : fallback;
  }
  async reloadSiteSettings() {
    try {
      storage.invalidate("pa_settings");
      const settings = await storage.get("pa_settings", {});
      this.store.set("settings", settings || {});
      this.wireGeneralFormFields();
      this.hydrateFromSettings();
    } catch (err) {
      console.warn("[Settings] site settings reload failed:", err);
    }
  }
  collectGeneralSettings() {
    return {
      siteTitle: $field("siteTitle")?.value?.trim() || "",
      siteTagline: $field("siteTagline")?.value?.trim() || "",
      siteUrl: $field("siteUrl")?.value?.trim() || "",
      adminEmail: $field("adminEmail")?.value?.trim() || "",
      siteDescription: $field("siteDescription")?.value?.trim() || "",
      dateFormat: $field("dateFormat")?.value || "",
      timeFormat: $field("timeFormat")?.value || "",
      timezone: $field("timezone")?.value || "",
      title: $field("siteTitle")?.value?.trim() || "",
      tagline: $field("siteTagline")?.value?.trim() || "",
      url: $field("siteUrl")?.value?.trim() || "",
      email: $field("adminEmail")?.value?.trim() || "",
      description: $field("siteDescription")?.value?.trim() || ""
    };
  }
  collectOtherSettings() {
    return {
      itemsPerPage: $field("itemsPerPage")?.value || "12",
      defaultView: $field("defaultView")?.value || "grid",
      language: $field("language")?.value || "en",
      maintenanceMode: !!$input("maintenanceMode")?.checked
    };
  }
  validateGeneralSettings(payload) {
    if (!payload.siteTitle) return "Site title is required.";
    if (payload.adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.adminEmail)) {
      return "Please enter a valid admin email address.";
    }
    if (payload.siteUrl) {
      try {
        const parsed = new URL(payload.siteUrl);
        if (!["http:", "https:"].includes(parsed.protocol)) return "Site URL must start with http:// or https://";
      } catch {
        return "Please enter a valid site URL.";
      }
    }
    return null;
  }
  wireNotificationFormFields() {
    const panel = document.querySelector('.pa-tab-panel[data-content="notifications"]');
    if (!panel || panel.dataset.notifWired === "true") return;
    const emailIds = [
      "notifEmailProjectUpdates",
      "notifEmailNewMessages",
      "notifEmailContactSubmissions",
      "notifEmailBlogUpdates",
      "notifEmailSystemAlerts",
      "notifEmailMarketing"
    ];
    panel.querySelectorAll('.pa-notif-item input[type="checkbox"]').forEach((input, index) => {
      const checkbox = asHtmlInput(input);
      if (checkbox && emailIds[index]) checkbox.id = emailIds[index];
    });
    const channelIds = ["notifChannelEmail", "notifChannelBrowser"];
    panel.querySelectorAll('.pa-channel-item input[type="checkbox"]').forEach((input, index) => {
      const checkbox = asHtmlInput(input);
      if (checkbox && channelIds[index]) checkbox.id = channelIds[index];
    });
    const frequencyValues = ["instant", "daily", "weekly"];
    panel.querySelectorAll('input[name="frequency"]').forEach((input, index) => {
      const radio = asHtmlInput(input);
      if (!radio) return;
      radio.name = "notifFrequency";
      if (frequencyValues[index]) radio.value = frequencyValues[index];
    });
    if (!panel.querySelector('[data-save="notifications"]')) {
      const saveWrap = document.createElement("div");
      saveWrap.className = "pa-settings-actions mt-16";
      saveWrap.innerHTML = '<button type="button" class="pa-btn pa-btn-primary" data-save="notifications"><i class="ri-save-line"></i> Save Notification Settings</button>';
      panel.querySelector(".pa-notification-layout > div")?.appendChild(saveWrap);
    }
    panel.dataset.notifWired = "true";
  }
  async loadNotificationPreferences() {
    try {
      storage.invalidate("pa_notification_preferences");
      const prefs = await storage.get("pa_notification_preferences", null);
      if (prefs) {
        this.store.set("notificationPreferences", prefs);
        this.hydrateNotificationPreferences(prefs);
      }
    } catch (err) {
      console.warn("[Settings] notification preferences load failed:", err);
    }
  }
  hydrateNotificationPreferences(prefs = this.store.get("notificationPreferences")) {
    if (!prefs) return;
    this.wireNotificationFormFields();
    const setChecked = (id, value) => {
      const el = $input(id);
      if (el) el.checked = !!value;
    };
    setChecked("notifEmailProjectUpdates", prefs.emailProjectUpdates);
    setChecked("notifEmailNewMessages", prefs.emailNewMessages);
    setChecked("notifEmailContactSubmissions", prefs.emailContactSubmissions);
    setChecked("notifEmailBlogUpdates", prefs.emailBlogUpdates);
    setChecked("notifEmailSystemAlerts", prefs.emailSystemAlerts);
    setChecked("notifEmailMarketing", prefs.emailMarketing);
    setChecked("notifChannelEmail", prefs.channelEmail);
    setChecked("notifChannelBrowser", prefs.channelBrowser);
    const frequency = prefs.frequency || "instant";
    document.querySelectorAll('input[name="notifFrequency"]').forEach((input) => {
      input.checked = input.value === frequency;
    });
    const quietStart = $field("quietStart");
    const quietEnd = $field("quietEnd");
    const quietTimezone = $select("quietTimezone");
    if (quietStart && prefs.quietHoursStart) quietStart.value = prefs.quietHoursStart;
    if (quietEnd && prefs.quietHoursEnd) quietEnd.value = prefs.quietHoursEnd;
    if (quietTimezone && prefs.quietHoursTimezone) {
      const match = [...quietTimezone.options].find((opt) => opt.text.includes(prefs.quietHoursTimezone) || opt.text === prefs.quietHoursTimezone);
      if (match) quietTimezone.value = match.value;
      else quietTimezone.value = prefs.quietHoursTimezone;
    }
  }
  collectNotificationPreferences() {
    const frequencyInput = document.querySelector('input[name="notifFrequency"]:checked');
    const quietTimezone = $select("quietTimezone");
    return {
      emailProjectUpdates: !!$input("notifEmailProjectUpdates")?.checked,
      emailNewMessages: !!$input("notifEmailNewMessages")?.checked,
      emailContactSubmissions: !!$input("notifEmailContactSubmissions")?.checked,
      emailBlogUpdates: !!$input("notifEmailBlogUpdates")?.checked,
      emailSystemAlerts: !!$input("notifEmailSystemAlerts")?.checked,
      emailMarketing: !!$input("notifEmailMarketing")?.checked,
      channelEmail: !!$input("notifChannelEmail")?.checked,
      channelBrowser: !!$input("notifChannelBrowser")?.checked,
      frequency: frequencyInput?.value || "instant",
      quietHoursStart: $field("quietStart")?.value || "22:00",
      quietHoursEnd: $field("quietEnd")?.value || "07:00",
      quietHoursTimezone: quietTimezone?.selectedOptions?.[0]?.text || quietTimezone?.value || "(GMT+05:00) Islamabad, Pakistan"
    };
  }
  async loadProfile() {
    const seq = ++this._profileLoadSeq;
    try {
      const profile = await authService.getProfile();
      if (seq !== this._profileLoadSeq) return;
      this.applyProfileToUI(profile);
    } catch (err) {
      if (seq !== this._profileLoadSeq) return;
      console.warn("[Settings] profile load failed:", err);
      this.store.set("profile", null);
    }
  }
  applyProfileToUI(profile) {
    this.store.set("profile", profile);
    this.hydrateProfile();
    applyUserDisplay({
      fullName: profile.fullName,
      username: profile.username,
      email: profile.email,
      role: profile.role,
      avatarUrl: profile.avatarUrl
    });
    applyRoleBasedAccess(profile.role);
    this.applySettingsAccess(profile.role);
  }
  isAdminRole(role) {
    return ["super_admin", "admin"].includes(role);
  }
  applySettingsAccess(role) {
    const generalReadOnly = role === "viewer";
    document.body.classList.toggle("pa-settings-general-readonly", generalReadOnly);
    document.body.classList.toggle("pa-settings-readonly", generalReadOnly);
    ["general", "other"].forEach((section) => {
      const saveBtn = asHtmlButton(document.querySelector(`[data-save="${section}"]`));
      if (saveBtn) {
        saveBtn.disabled = generalReadOnly;
        saveBtn.hidden = generalReadOnly;
      }
    });
    const panel = document.querySelector('.pa-tab-panel[data-panel="settings"][data-content="general"]') || document.querySelector("#paSettingsGeneral");
    const readOnlyPanels = document.querySelectorAll(
      '.pa-tab-panel[data-panel="settings"][data-content="general"], .pa-tab-panel[data-panel="settings"][data-content="other"]'
    );
    readOnlyPanels.forEach((pane) => {
      pane.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach((el) => {
        const field = asFormField(el);
        if (!field || field.id === "profileRole") return;
        field.disabled = generalReadOnly;
        if (generalReadOnly) field.setAttribute("readonly", "");
        else field.removeAttribute("readonly");
      });
    });
    if (generalReadOnly && panel) {
      let notice = document.getElementById("paSettingsReadonlyNotice");
      if (!notice) {
        notice = document.createElement("div");
        notice.id = "paSettingsReadonlyNotice";
        notice.className = "pa-settings-readonly-notice";
        notice.innerHTML = '<i class="ri-eye-line"></i> View only \u2014 contact an administrator to change site settings.';
        panel.prepend(notice);
      }
    } else {
      document.getElementById("paSettingsReadonlyNotice")?.remove();
    }
  }
  render() {
    this.hydrateFromSettings();
    this.hydrateProfile();
    this.syncUI();
    this.setupSecurityPasswordToggles();
  }
  formatRoleLabel(role) {
    return (role || "viewer").replace(/_/g, " ");
  }
  hydrateProfile() {
    const p = this.store.get("profile") || {};
    const setVal = (id, value) => {
      const el = $field(id);
      if (el && value != null) el.value = String(value);
    };
    setVal("profileFullName", p.fullName || "");
    setVal("profileUsername", p.username || "");
    setVal("profileEmail", p.email || "");
    setVal("profilePhone", p.phone || "");
    setVal("profileDob", p.dob || "");
    setVal("profileBio", p.bio || "");
    setVal("profileLocation", p.location || "");
    setVal("profileWebsite", p.website || "");
    const roleEl = $field("profileRole");
    if (roleEl) {
      roleEl.value = p.role || "viewer";
      roleEl.disabled = p.role !== "super_admin";
    }
    const avatarUrl = p.avatarUrl || "";
    const coverUrl = p.coverImageUrl || "";
    renderPreviewAvatar($id("previewAvatar"), avatarUrl);
    setCoverImage($id("coverImage"), coverUrl);
    const previewName = $id("previewName");
    if (previewName) previewName.textContent = p.fullName || p.username || "User";
    const previewUsername = $id("previewUsername");
    if (previewUsername) previewUsername.textContent = "@" + (p.username || "user");
    const previewBio = $id("previewBio");
    if (previewBio) previewBio.textContent = p.bio || "No bio yet";
    const previewLocation = $id("previewLocation");
    if (previewLocation) previewLocation.textContent = p.location || "Not set";
    const previewWebsite = $id("previewWebsite");
    if (previewWebsite) previewWebsite.textContent = p.website || "Not set";
    const container = $id("socialLinksContainer");
    if (container && Array.isArray(p.socialLinks) && p.socialLinks.length) {
      const first = container.querySelector(".pa-social-group");
      if (first) {
        container.innerHTML = "";
        p.socialLinks.forEach((link, i) => {
          const group = first.cloneNode(true);
          const input = asFormField(group.querySelector(".pa-form-input"));
          if (input) input.value = link;
          const removeBtn = group.querySelector(".pa-social-remove");
          if (removeBtn) removeBtn.style.display = i === 0 && p.socialLinks.length === 1 ? "none" : "";
          container.appendChild(group);
        });
      }
    }
  }
  formatActivityDate(iso) {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString(void 0, { year: "numeric", month: "short", day: "numeric" }),
      time: d.toLocaleTimeString(void 0, { hour: "numeric", minute: "2-digit" })
    };
  }
  activityStatusBadge(item) {
    if (item.status === "success" && item.isCurrent) {
      return '<span class="pa-session-current">Current Session</span>';
    }
    if (item.status === "failed") {
      return '<span class="pa-session-status failed">Failed</span>';
    }
    if (item.status === "logout") {
      return '<span class="pa-session-status logout">Logged out</span>';
    }
    if (item.status === "success") {
      return '<span class="pa-session-status success">Success</span>';
    }
    return "";
  }
  renderLoginActivityItem(item) {
    const { date, time } = this.formatActivityDate(item.createdAt);
    const icon = escapeHtml(item.deviceIcon || "ri-device-line");
    const location = escapeHtml(item.location || "Unknown location");
    const device = escapeHtml(item.deviceLabel || "Unknown device");
    const detail = item.status === "failed" && item.failureReason ? `${device} \xB7 ${escapeHtml(item.failureReason)}` : device;
    const itemClass = item.status === "failed" ? " pa-session-item--failed" : "";
    const userLine = this._loginActivityScope === "all" && (item.userName || item.userEmail) ? `<div class="pa-session-user">${escapeHtml(item.userName || "Staff")}${item.userEmail ? ` \xB7 ${escapeHtml(item.userEmail)}` : ""}</div>` : "";
    return `<div class="pa-session-item${itemClass}">
      <div class="pa-session-device">
        <div class="pa-session-icon"><i class="${icon}"></i></div>
        <div class="pa-session-info">
          ${userLine}
          <div class="pa-session-location">${location}</div>
          <div class="pa-session-detail">${detail}</div>
        </div>
      </div>
      <div class="pa-session-meta">
        <div class="pa-text fw-500">${escapeHtml(date)}</div>
        <div class="${item.isCurrent ? "mb-12" : ""}">${escapeHtml(time)}</div>
        ${this.activityStatusBadge(item)}
      </div>
    </div>`;
  }
  async loadLoginActivity() {
    const list = $id("loginActivityList");
    if (!list) return;
    list.innerHTML = '<div class="pa-session-empty">Loading activity\u2026</div>';
    try {
      const { items, scope } = await authService.getLoginActivity();
      this._loginActivityScope = scope === "all" ? "all" : "self";
      if (!items?.length) {
        list.innerHTML = this._loginActivityScope === "all" ? '<div class="pa-session-empty">No staff login activity recorded yet.</div>' : '<div class="pa-session-empty">No login activity yet. Sign-in attempts will appear here.</div>';
        return;
      }
      list.innerHTML = items.map((item) => this.renderLoginActivityItem(item)).join("");
    } catch (err) {
      list.innerHTML = '<div class="pa-session-empty">Could not load login activity.</div>';
      console.warn("[Settings] login activity load failed:", err);
    }
  }
  async logoutAllDevices() {
    if (!document.body.classList.contains("pa-role-admin")) {
      showToast("Only administrators can log out of all devices.", "warning");
      return;
    }
    if (!confirm("Log out of all devices? You will need to sign in again on every device.")) return;
    try {
      await authService.logoutAllDevices();
      showToast("Logged out of all devices", "success");
      window.location.href = getLoginPath();
    } catch (err) {
      showToast(err.message || "Could not log out of all devices.", "danger");
    }
  }
  setupSecurityPasswordToggles() {
    const securityPanel = document.querySelector('.pa-tab-panel[data-content="security"]');
    if (securityPanel) setupAllPasswordToggles(securityPanel);
  }
  hydrateFromSettings() {
    const s = this.store.get("settings") || {};
    const setVal = (id, value) => {
      const el = $field(id);
      if (el && value != null) el.value = String(value);
    };
    const setCheck = (id, value) => {
      const el = $input(id);
      if (el) el.checked = !!value;
    };
    this.wireGeneralFormFields();
    setVal("siteTitle", s.siteTitle || s.title || "");
    setVal("siteTagline", s.siteTagline || s.tagline || "");
    setVal("siteUrl", s.siteUrl || s.url || "");
    setVal("adminEmail", s.adminEmail || s.email || "");
    setVal("siteDescription", s.siteDescription || s.description || "");
    this.setSelectValue("dateFormat", s.dateFormat, "May 19, 2024");
    this.setSelectValue("timeFormat", s.timeFormat, "12 Hour (AM/PM)");
    this.setSelectValue("timezone", s.timezone, "(GMT+05:00) Islamabad, Pakistan");
    this.setSelectValue("itemsPerPage", s.itemsPerPage, "12");
    this.setSelectValue(
      "defaultView",
      s.defaultView === "list" || String(s.defaultView).toLowerCase().includes("list") ? "list" : "grid",
      "grid"
    );
    this.setSelectValue("language", s.language, "en");
    setCheck("maintenanceMode", s.maintenanceMode);
  }
  bindEvents() {
    const saveGeneralBtn = document.querySelector('[data-save="general"]');
    if (saveGeneralBtn) {
      this.on(saveGeneralBtn, "click", () => {
        void this.saveGeneralSettings();
      });
    }
    this.wireGeneralFormFields();
    const saveOtherBtn = document.querySelector('[data-save="other"]');
    if (saveOtherBtn) {
      this.on(saveOtherBtn, "click", () => {
        void this.saveOtherSettings();
      });
    }
    const saveSecurityBtn = document.querySelector('[data-save="security"]');
    if (saveSecurityBtn) {
      this.on(saveSecurityBtn, "click", () => {
        void this.updatePassword();
      });
    }
    this.wireNotificationFormFields();
    this.wireGeneralFormFields();
    const saveNotificationsBtn = document.querySelector('[data-save="notifications"]');
    if (saveNotificationsBtn) {
      this.on(saveNotificationsBtn, "click", () => {
        void this.saveNotificationPreferences();
      });
    }
    const profileSaveBtn = $id("profileSaveBtn");
    if (profileSaveBtn) {
      this.on(profileSaveBtn, "click", (e) => {
        e.preventDefault();
        void this.saveProfile();
      });
    }
    const fullNameInput = $id("profileFullName");
    if (fullNameInput) {
      this.on(fullNameInput, "input", (e) => {
        const preview = $id("previewName");
        const target = e.target;
        if (preview) preview.textContent = target.value || "User";
      });
    }
    const usernameInput = $id("profileUsername");
    if (usernameInput) {
      this.on(usernameInput, "input", (e) => {
        const preview = $id("previewUsername");
        const target = e.target;
        if (preview) preview.textContent = "@" + (target.value || "user");
      });
    }
    const bioInput = $id("profileBio");
    if (bioInput) {
      this.on(bioInput, "input", (e) => {
        const preview = $id("previewBio");
        const target = e.target;
        if (preview) preview.textContent = target.value || "No bio yet";
      });
    }
    const locationInput = $id("profileLocation");
    if (locationInput) {
      this.on(locationInput, "input", (e) => {
        const preview = $id("previewLocation");
        const target = e.target;
        if (preview) preview.textContent = target.value || "Not set";
      });
    }
    const websiteInput = $id("profileWebsite");
    if (websiteInput) {
      this.on(websiteInput, "input", (e) => {
        const preview = $id("previewWebsite");
        const target = e.target;
        if (preview) preview.textContent = target.value || "Not set";
      });
    }
    const coverFileInput = document.getElementById("coverFileInput");
    const coverUploadBtn = $id("coverUploadBtn");
    const previewCover = $id("previewCover");
    if (coverFileInput) {
      this.on(coverFileInput, "change", (e) => {
        const target = e.target;
        void this.handleCoverFile(target.files?.[0], coverFileInput);
      });
    }
    const openCoverPicker = () => document.getElementById("coverFileInput")?.click();
    if (coverUploadBtn) {
      this.on(coverUploadBtn, "click", (e) => {
        e.stopPropagation();
        openCoverPicker();
      });
    }
    if (previewCover) {
      this.on(previewCover, "click", (e) => {
        const target = e.target;
        if (target.closest("#previewAvatarWrap, .pa-preview-avatar")) return;
        if (target.closest("#coverUploadBtn")) return;
        openCoverPicker();
      });
    }
    const avatarFileInput = document.getElementById("avatarFileInput");
    const avatarUploadBtn = $id("avatarUploadBtn");
    const previewAvatarWrap = $id("previewAvatarWrap");
    const openAvatarPicker = () => document.getElementById("avatarFileInput")?.click();
    if (avatarFileInput) {
      this.on(avatarFileInput, "change", (e) => {
        const target = e.target;
        void this.handleAvatarFile(target.files?.[0], avatarFileInput);
      });
    }
    if (avatarUploadBtn) {
      this.on(avatarUploadBtn, "click", (e) => {
        e.stopPropagation();
        openAvatarPicker();
      });
    }
    if (previewAvatarWrap) {
      this.on(previewAvatarWrap, "click", (e) => {
        const target = e.target;
        if (target.closest("#avatarUploadBtn")) return;
        openAvatarPicker();
      });
    }
    const viewProfileBtn = $id("viewPublicProfile");
    if (viewProfileBtn) {
      this.on(viewProfileBtn, "click", () => {
        showToast("Opening public profile in new tab...", "info");
        window.open("#", "_blank");
      });
    }
    const addSocialBtn = $id("addSocialBtn");
    if (addSocialBtn) {
      this.on(addSocialBtn, "click", () => this.addSocialLink());
    }
    const container = $id("socialLinksContainer");
    if (container) {
      this.on(container, "click", (e) => {
        const removeBtn = e.target.closest(".pa-social-remove");
        if (removeBtn) {
          const group = removeBtn.closest(".pa-social-group");
          if (group && container.children.length > 1) {
            group.remove();
            showToast("Social link removed", "info");
          } else {
            showToast("You need at least one social link", "info");
          }
        }
      });
    }
    const updatePasswordBtn = $id("updatePasswordBtn");
    if (updatePasswordBtn) {
      this.on(updatePasswordBtn, "click", () => {
        void this.updatePassword();
      });
    }
    this.security.bindEvents();
    const logoutAllBtn = $id("logoutAllBtn");
    if (logoutAllBtn) {
      this.on(logoutAllBtn, "click", () => {
        void this.logoutAllDevices();
      });
    }
    const refreshSessionsBtn = $id("refreshSessionsBtn");
    if (refreshSessionsBtn) {
      this.on(refreshSessionsBtn, "click", () => {
        void this.loadLoginActivity();
      });
    }
    const logoutAllDevicesBtn = $id("logoutAllDevicesBtn");
    if (logoutAllDevicesBtn) {
      this.on(logoutAllDevicesBtn, "click", () => {
        void this.logoutAllDevices();
      });
    }
    const saveQuietHours = $id("saveQuietHours");
    if (saveQuietHours) {
      this.on(saveQuietHours, "click", () => {
        void this.saveNotificationPreferences({ quietOnly: true });
      });
    }
    const sendTestNotification = $id("sendTestNotification");
    if (sendTestNotification) {
      this.on(sendTestNotification, "click", () => {
        void this.sendTestNotification();
      });
    }
    const browserChannel = $input("notifChannelBrowser");
    if (browserChannel) {
      this.on(browserChannel, "change", async (e) => {
        const target = e.target;
        if (!target.checked) return;
        const permission = await requestBrowserNotificationPermission();
        if (permission !== "granted") {
          target.checked = false;
          showToast("Browser notifications are blocked. Enable them in your browser settings.", "warning");
        }
      });
    }
    this.system.bindEvents();
    document.querySelectorAll('.pa-tab-panel[data-content]:not([data-content="notifications"]) .pa-toggle-switch input[type="checkbox"]').forEach((checkbox) => {
      this.on(checkbox, "change", (e) => {
        const label = checkbox.closest(".pa-toggle-wrap")?.querySelector(".pa-toggle-label");
        const target = e.target;
        const state = target.checked ? "enabled" : "disabled";
        if (label) {
          showToast(`${label.textContent} ${state}`, "info");
        }
      });
    });
    initSettingsCardCollapse();
  }
  updateSettingsPageHeader(tab) {
    const meta = getSettingsPageMeta(tab);
    const titleEl = $id("settingsPageTitle");
    const subtitleEl = $id("settingsPageSubtitle");
    const eyebrowEl = $id("settingsPageEyebrow");
    if (titleEl) titleEl.textContent = meta.title;
    if (subtitleEl) subtitleEl.textContent = meta.subtitle;
    if (eyebrowEl) eyebrowEl.textContent = "Settings";
    document.title = `Portfolio Admin \u2014 ${meta.title}`;
  }
  applySettingsPage(tab) {
    const resolved = SETTINGS_TABS.includes(tab) ? tab : "general";
    this.store.set("activeTab", resolved);
    this.updateSettingsPageHeader(resolved);
    syncSettingsNavTab(resolved);
    if (resolved === "general") {
      void this.reloadSiteSettings();
    }
    if (resolved === "security") {
      void this.loadLoginActivity();
      void this.security.load();
      const role = this.store.get("profile")?.role;
      if (role) void initRoleRequestCard(role);
      else {
        void this.loadProfile().then(() => initRoleRequestCard(this.store.get("profile")?.role));
      }
    }
    if (resolved === "profile") {
      if (this.store.get("profile")) this.hydrateProfile();
      else void this.loadProfile();
    }
    if (resolved === "system") {
      void (async () => {
        if (!this.store.get("profile")) await this.loadProfile();
        await this.system.load();
      })();
    }
    if (resolved === "notifications") {
      this.wireNotificationFormFields();
      void this.loadNotificationPreferences();
    }
  }
  syncUI() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    const segment = path.match(/\/settings\/([^/]+)$/)?.[1];
    if (segment && !SETTINGS_TABS.includes(segment)) {
      window.location.replace(getSettingsTabPath("general"));
      return;
    }
    this.applySettingsPage(getSettingsTabFromPath(path));
  }
  async saveGeneralSettings() {
    if (!this.isAdminRole(this.store.get("profile")?.role)) {
      showToast("Only administrators can change site settings.", "danger");
      return;
    }
    const general = this.collectGeneralSettings();
    const validationError = this.validateGeneralSettings(general);
    if (validationError) {
      showToast(validationError, "danger");
      return;
    }
    const settings = {
      ...this.store.get("settings") || {},
      ...this.collectOtherSettings(),
      ...general
    };
    this.store.set("settings", settings);
    const saveBtn = asHtmlButton(document.querySelector('[data-save="general"]'));
    if (saveBtn) saveBtn.disabled = true;
    try {
      await this.persist();
      storage.invalidate("pa_settings");
      await storage.set("pa_settings", settings);
      showStatusToast("General settings saved successfully!", "success");
      addNotification("General settings were updated", "ri-settings-3-line", {
        category: "system_alerts",
        linkPath: "/settings/general"
      });
    } catch (err) {
      showStatusToast(err?.message || "Could not save general settings.", "danger");
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }
  async saveOtherSettings() {
    if (!this.isAdminRole(this.store.get("profile")?.role)) {
      showToast("Only administrators can change site settings.", "danger");
      return;
    }
    const settings = {
      ...this.store.get("settings") || {},
      ...this.collectGeneralSettings(),
      ...this.collectOtherSettings()
    };
    this.store.set("settings", settings);
    const saveBtn = asHtmlButton(document.querySelector('[data-save="other"]'));
    if (saveBtn) saveBtn.disabled = true;
    try {
      await this.persist();
      storage.invalidate("pa_settings");
      await storage.set("pa_settings", settings);
      showStatusToast("Other settings saved successfully!", "success");
      addNotification("Dashboard preferences were updated", "ri-settings-3-line", {
        category: "system_alerts",
        linkPath: "/settings/general"
      });
    } catch (err) {
      showStatusToast(err?.message || "Could not save settings.", "danger");
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }
  async applyProfileUpdate(profile, { toastMessage, notify = false, bumpSeq = true } = {}) {
    if (!profile || typeof profile !== "object") {
      throw new Error("Server did not return an updated profile.");
    }
    if (bumpSeq) this._profileLoadSeq += 1;
    this.store.set("profile", profile);
    this.hydrateProfile();
    applyUserDisplay({
      fullName: profile.fullName,
      username: profile.username,
      email: profile.email,
      role: profile.role,
      avatarUrl: profile.avatarUrl
    });
    eventBus.emit("profile:updated", profile);
    if (toastMessage) showStatusToast(toastMessage, "success");
    if (notify) addNotification("Profile information was updated", "ri-user-settings-line");
  }
  collectProfileFormPayload() {
    const current = this.store.get("profile") || {};
    const socialLinks = [];
    document.querySelectorAll(".pa-social-group").forEach((group) => {
      const input = asFormField(group.querySelector(".pa-form-input"));
      if (input?.value.trim()) {
        socialLinks.push(input.value.trim());
      }
    });
    const payload = {
      fullName: $field("profileFullName")?.value?.trim() || "",
      username: $field("profileUsername")?.value?.trim() || "",
      email: $field("profileEmail")?.value?.trim() || "",
      phone: $field("profilePhone")?.value?.trim() || "",
      dob: $field("profileDob")?.value || null,
      bio: $field("profileBio")?.value?.trim() || "",
      location: $field("profileLocation")?.value?.trim() || "",
      website: $field("profileWebsite")?.value?.trim() || "",
      socialLinks
    };
    if (current.role === "super_admin") {
      payload.role = $field("profileRole")?.value || current.role || "viewer";
    }
    return payload;
  }
  async saveProfileImages(patch) {
    this._profileLoadSeq += 1;
    const data = await authService.updateProfile(patch);
    const profile = data?.profile ?? data;
    if (!profile || typeof profile !== "object") {
      throw new Error("Server did not return an updated profile.");
    }
    this._profileLoadSeq += 1;
    this.store.set("profile", profile);
    this.hydrateProfile();
    applyUserDisplay({
      fullName: profile.fullName,
      username: profile.username,
      email: profile.email,
      role: profile.role,
      avatarUrl: profile.avatarUrl
    });
    eventBus.emit("profile:updated", profile);
    return profile;
  }
  async readImageDataUrl(file, optimize) {
    if (!optimize) return readFileAsDataUrl(file);
    try {
      return await readOptimizedImageDataUrl(file, optimize);
    } catch {
      return readFileAsDataUrl(file);
    }
  }
  async handleAvatarFile(file, inputEl) {
    if (!file) return;
    if (!handleFileValidation(file)) {
      if (inputEl) inputEl.value = "";
      return;
    }
    showStatusToast("Saving avatar\u2026", "info", 12e4);
    try {
      const dataUrl = await this.readImageDataUrl(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.88
      });
      renderPreviewAvatar($id("previewAvatar"), dataUrl);
      await this.saveProfileImages({ avatarUrl: dataUrl });
      showStatusToast("Avatar updated successfully!", "success");
    } catch (err) {
      const current = this.store.get("profile") || {};
      renderPreviewAvatar($id("previewAvatar"), current.avatarUrl);
      showStatusToast(err?.message || "Could not save avatar.", "danger");
    }
    if (inputEl) inputEl.value = "";
  }
  async handleCoverFile(file, inputEl) {
    if (!file) return;
    if (!handleFileValidation(file)) {
      if (inputEl) inputEl.value = "";
      return;
    }
    showStatusToast("Saving cover image\u2026", "info", 12e4);
    try {
      const dataUrl = await this.readImageDataUrl(file, {
        maxWidth: 1200,
        maxHeight: 400,
        quality: 0.85
      });
      setCoverImage($id("coverImage"), dataUrl);
      await this.saveProfileImages({ coverImageUrl: dataUrl });
      showStatusToast("Cover image updated successfully!", "success");
    } catch (err) {
      const current = this.store.get("profile") || {};
      setCoverImage($id("coverImage"), current.coverImageUrl);
      showStatusToast(err?.message || "Could not save cover image.", "danger");
    }
    if (inputEl) inputEl.value = "";
  }
  async saveProfile() {
    const saveBtn = $id("profileSaveBtn");
    saveBtn?.setAttribute("disabled", "");
    try {
      const data = await authService.updateProfile(this.collectProfileFormPayload());
      const profile = data?.profile ?? data;
      await this.applyProfileUpdate(profile, {
        toastMessage: "Profile updated successfully!",
        notify: true
      });
    } catch (err) {
      showStatusToast(err?.message || "Could not save profile.", "danger");
    } finally {
      saveBtn?.removeAttribute("disabled");
    }
  }
  addSocialLink() {
    const container = $id("socialLinksContainer");
    if (!container) return;
    const lastGroup = container.querySelector(".pa-social-group:last-child");
    if (lastGroup) {
      const newGroup = lastGroup.cloneNode(true);
      const input = asFormField(newGroup.querySelector(".pa-form-input"));
      if (input) input.value = "";
      const removeBtn = newGroup.querySelector(".pa-social-remove");
      if (removeBtn) {
        removeBtn.style.display = "";
        this.on(removeBtn, "click", () => {
          if (container.children.length > 1) {
            newGroup.remove();
            showToast("Social link removed", "info");
          } else {
            showToast("You need at least one social link", "info");
          }
        });
      }
      container.appendChild(newGroup);
      showToast("New social link added", "info");
    }
  }
  validatePasswordStrength(password) {
    const value = String(password || "");
    if (value.length < 8) return "Password must be at least 8 characters long.";
    if (!/[a-z]/.test(value)) return "Password must include a lowercase letter.";
    if (!/[A-Z]/.test(value)) return "Password must include an uppercase letter.";
    if (!/[0-9]/.test(value)) return "Password must include a number.";
    if (!/[^A-Za-z0-9]/.test(value)) return "Password must include a symbol.";
    return null;
  }
  async updatePassword() {
    const current = $field("secCurrentPassword")?.value || "";
    const newPass = $field("secNewPassword")?.value || "";
    const confirm2 = $field("secConfirmPassword")?.value || "";
    if (!current) {
      showToast("Please enter your current password", "danger");
      return;
    }
    const policyError = this.validatePasswordStrength(newPass);
    if (policyError) {
      showToast(policyError, "danger");
      return;
    }
    if (newPass !== confirm2) {
      showToast("Passwords do not match", "danger");
      return;
    }
    const updateBtn = asHtmlButton($id("updatePasswordBtn"));
    if (updateBtn) updateBtn.disabled = true;
    try {
      await authService.changePassword(current, newPass);
      showToast("Password updated successfully!", "success");
      addNotification("Your password was changed", "ri-lock-2-line", {
        category: "system_alerts",
        linkPath: "/settings/security"
      });
      ["secCurrentPassword", "secNewPassword", "secConfirmPassword"].forEach((id) => {
        const el = $field(id);
        if (el) el.value = "";
      });
    } catch (err) {
      showToast(err.message || "Could not update password.", "danger");
    } finally {
      if (updateBtn) updateBtn.disabled = false;
    }
  }
  async saveNotificationPreferences({ quietOnly = false } = {}) {
    this.wireNotificationFormFields();
    const payload = this.collectNotificationPreferences();
    const browserChannel = $input("notifChannelBrowser");
    if (browserChannel?.checked) {
      const permission = await requestBrowserNotificationPermission();
      if (permission !== "granted") {
        showToast("Enable browser notifications in your browser to use the browser channel.", "warning");
        browserChannel.checked = false;
        payload.channelBrowser = false;
      }
    }
    try {
      const res = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload)
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not save notification preferences.");
      const prefs = body.preferences || payload;
      this.store.set("notificationPreferences", prefs);
      storage.invalidate("pa_notification_preferences");
      await storage.set("pa_notification_preferences", prefs);
      this.hydrateNotificationPreferences(prefs);
      showToast(quietOnly ? "Quiet hours saved successfully!" : "Notification preferences saved!", "success");
      addNotification("Notification preferences were updated", "ri-notification-3-line", {
        category: "system_alerts",
        linkPath: "/settings/notifications"
      });
    } catch (err) {
      showToast(err?.message || "Could not save notification preferences.", "danger");
    }
  }
  async sendTestNotification() {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ test: true })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not send test notification.");
      storage.invalidate("pa_notifications");
      await loadNotifications();
      showToast("Test notification sent!", "success");
    } catch (err) {
      showToast(err?.message || "Could not send test notification.", "danger");
    }
  }
  async persist() {
    await this.saveRecords(this.store.get("settings"));
  }
}
export {
  SettingsModule
};
