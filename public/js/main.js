import {
  applyRoleBasedAccess,
  applyUserDisplay,
  hideNavFlyout,
  initSettingsNav,
  initSidebarCollapse,
  initSidebarGroupNav,
  isSidebarCollapsedDesktop,
  previewUserAvatar,
  showNavFlyout,
  syncSidebarGroupNav
} from "./chunks/chunk-K2XQHGPR.js";
import {
  initPasswordToggles
} from "./chunks/chunk-5SJ7MEVC.js";
import {
  clearUserCredentials,
  formatStaffRoleLabel,
  initUserCredentialsPanel,
  notifyCredentialsEmailStatus,
  populateStaffRoleSelect,
  showUserCredentialsPanel
} from "./chunks/chunk-CXIDBH2N.js";
import {
  authService
} from "./chunks/chunk-MRY75FFO.js";
import {
  getThemeBackground,
  updateFavicon
} from "./chunks/chunk-4MPBDRPZ.js";
import {
  initAllPaSelects
} from "./chunks/chunk-BHVLEK4H.js";
import {
  handleFileValidation,
  readOptimizedImageDataUrl
} from "./chunks/chunk-QJVHZZLM.js";
import {
  PAGE,
  getCurrentPage,
  getLoginPath,
  getSettingsTabFromPath
} from "./chunks/chunk-DUXXWVBL.js";
import {
  activateTab,
  anyPanelOpen,
  closeAllCardMenus,
  closeConfirm,
  closePanels,
  initConfirmDialog,
  isConfirmOpen,
  openPanel,
  registerPanel,
  requestLogout
} from "./chunks/chunk-WGXNH5AX.js";
import {
  $all,
  $id,
  APPEARANCE_DEFAULTS,
  ICON_PREVIEW_SIZES,
  MAX_CUSTOM_FONTS,
  Module,
  VALID_FONT_SIZES,
  VALID_FONT_WEIGHTS,
  VALID_ICON_SIZES,
  VALID_SPACINGS,
  addNotification,
  applyAppearanceSettings,
  bootstrapAppearanceFromCache,
  buildCustomFontFromFile,
  clearDomCache,
  clearNotifications,
  escapeHtml,
  eventBus,
  getFontById,
  getFontGroups,
  loadNotifications,
  markNotificationRead,
  normalizeAppearanceSettings,
  readAppearanceCache,
  renderNotifications,
  showStatusToast,
  showToast,
  storage,
  writeAppearanceCache
} from "./chunks/chunk-OGR5OR6D.js";

// client/core/BodyLoader.ts
var BodyLoader = class {
  constructor() {
    this._count = 0;
    this._host = null;
    this._el = null;
    this._labelEl = null;
    this._defaultMessage = "Loading your data\u2026";
    this._hideTimer = null;
    this._showFrame = null;
    this._EXIT_MS = 220;
  }
  _resolveHost() {
    return document.body;
  }
  _findLoader() {
    return document.getElementById("paBodyLoader");
  }
  _ensureOnBody(el) {
    if (el && el.parentElement !== document.body) {
      document.body.appendChild(el);
    }
  }
  _cancelShowFrame() {
    if (this._showFrame) {
      cancelAnimationFrame(this._showFrame);
      this._showFrame = null;
    }
  }
  mount() {
    if (typeof window.__paEnsureBodyLoader === "function") {
      this._el = window.__paEnsureBodyLoader(false);
      this._host = this._resolveHost();
      if (this._el) {
        this._labelEl = this._el.querySelector(".pa-body-loader__label");
      }
      return;
    }
    this._host = this._resolveHost();
    if (!this._host) return;
    const existing = this._findLoader();
    if (existing) {
      this._ensureOnBody(existing);
      this._el = existing;
      this._labelEl = existing.querySelector(".pa-body-loader__label");
      return;
    }
    const el = document.createElement("div");
    el.className = "pa-body-loader";
    el.id = "paBodyLoader";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-busy", "true");
    el.innerHTML = `
      <div class="pa-body-loader__veil" aria-hidden="true"></div>
      <div class="pa-body-loader__panel">
        <div class="pa-body-loader__orbit" aria-hidden="true">
          <span class="pa-body-loader__ring"></span>
          <span class="pa-body-loader__ring pa-body-loader__ring--delay"></span>
          <span class="pa-body-loader__core"><i class="ri-database-2-line"></i></span>
        </div>
        <p class="pa-body-loader__label">${this._defaultMessage}</p>
        <div class="pa-body-loader__stream" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="pa-body-loader__skeleton" aria-hidden="true">
          <div class="pa-body-loader__skel-card"></div>
          <div class="pa-body-loader__skel-card"></div>
          <div class="pa-body-loader__skel-card"></div>
          <div class="pa-body-loader__skel-card"></div>
        </div>
      </div>
    `;
    this._host.appendChild(el);
    this._el = el;
    this._labelEl = el.querySelector(".pa-body-loader__label");
  }
  begin(message) {
    const msg = message || this._defaultMessage;
    if (typeof window.__paEnsureBodyLoader === "function") {
      this._el = window.__paEnsureBodyLoader(true, msg);
      this._host = this._resolveHost();
      this._labelEl = this._el?.querySelector(".pa-body-loader__label") || null;
    } else {
      this.mount();
    }
    if (!this._host || !this._el) return;
    this._cancelShowFrame();
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
    if (msg && this._labelEl) this._labelEl.textContent = msg;
    this._count += 1;
    document.body.classList.add("pa-loading-active");
    this._el.classList.remove("is-hiding");
    this._el.classList.add("visible");
    this._el.setAttribute("aria-busy", "true");
  }
  end() {
    if (!this._el) return;
    this._count = Math.max(0, this._count - 1);
    if (this._count === 0) this._hide();
  }
  reset() {
    this._count = 0;
    this._hide();
  }
  _hide() {
    this._cancelShowFrame();
    this._host = this._resolveHost();
    if (!this._host || !this._el) return;
    this._el.classList.add("is-hiding");
    this._el.classList.remove("visible");
    if (this._count === 0) document.body.classList.remove("pa-loading-active");
    if (this._labelEl) this._labelEl.textContent = this._defaultMessage;
    this._el.setAttribute("aria-busy", "false");
    if (this._hideTimer) clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => {
      this._el?.classList.remove("is-hiding");
      this._hideTimer = null;
    }, this._EXIT_MS);
  }
  async wrap(promise, message) {
    this.begin(message);
    try {
      return await promise;
    } finally {
      this.end();
    }
  }
};
var bodyLoader = new BodyLoader();

// client/modules/shell/AddUserManager.ts
var ADMIN_ROLES = ["super_admin", "admin"];
var AddUserManager = class {
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
};

// client/modules/shell/CustomizationModule.ts
var CUSTOM_STORE_KEY = "appearance_settings_v2";
var CustomizationModule = class extends Module {
  constructor() {
    super({ name: "Customization", storageKey: CUSTOM_STORE_KEY });
    this.settings = { ...APPEARANCE_DEFAULTS };
    this.systemMq = window.matchMedia("(prefers-color-scheme: dark)");
  }
  async init() {
    this.ensureFontSizeUI();
    this.ensureFontUploadUI();
    this.ensureIconSizeUI();
    this.bindEvents();
    const cached = readAppearanceCache();
    if (cached) {
      this.settings = { ...cached };
      this.render();
    }
    await this.load();
    this.render();
  }
  async load() {
    const saved = await storage.get(CUSTOM_STORE_KEY, null);
    if (saved && typeof saved === "object") {
      this.settings = normalizeAppearanceSettings(saved);
      writeAppearanceCache(this.settings);
    }
  }
  async save() {
    writeAppearanceCache(this.settings);
    await this.saveRecords(this.settings, { feedback: false });
  }
  render() {
    applyAppearanceSettings(this.settings, { systemDark: this.systemMq.matches });
    this.syncFavicon();
    this.syncUI();
  }
  applyTheme(t) {
    this.settings.theme = t;
    applyAppearanceSettings(this.settings, { systemDark: this.systemMq.matches });
    this.syncFavicon();
  }
  applyAccent(hex) {
    this.settings.accent = hex;
    applyAppearanceSettings(this.settings, { systemDark: this.systemMq.matches });
    this.syncFavicon();
  }
  syncFavicon() {
    updateFavicon(this.settings.accent, getThemeBackground());
  }
  applyFontSize(fs) {
    this.settings.fontSize = fs;
    applyAppearanceSettings(this.settings, { systemDark: this.systemMq.matches });
  }
  applyFontFamily(id) {
    this.settings.fontFamily = id;
    const font = getFontById(id, this.settings.customFonts);
    const nameEl = $id("customFontTriggerName");
    const previewEl = $id("customFontTriggerPreview");
    if (nameEl) nameEl.textContent = font.name;
    if (previewEl) {
      previewEl.textContent = font.sample;
      previewEl.style.fontFamily = font.stack;
    }
    applyAppearanceSettings(this.settings, { systemDark: this.systemMq.matches });
  }
  applyFontWeight(weight) {
    this.settings.fontWeight = weight;
    applyAppearanceSettings(this.settings, { systemDark: this.systemMq.matches });
  }
  applyCornerRadius(val) {
    this.settings.cornerRadius = val;
    applyAppearanceSettings(this.settings, { systemDark: this.systemMq.matches });
  }
  applyCardSpacing(spacing) {
    this.settings.cardSpacing = spacing;
    applyAppearanceSettings(this.settings, { systemDark: this.systemMq.matches });
  }
  applyIconSize(size) {
    this.settings.iconSize = size;
    applyAppearanceSettings(this.settings, { systemDark: this.systemMq.matches });
  }
  /** Normalize font-size controls to 10px / 14px / 16px on every page panel. */
  ensureFontSizeUI() {
    document.querySelectorAll('[data-panel="custom"][data-content="typography"]').forEach((panel) => {
      const sizeBtn = panel.querySelector(".custom-fs-btn[data-size]");
      const seg = sizeBtn?.closest(".custom-fs-seg");
      if (!seg || seg.dataset.fontSizeNormalized === "true") return;
      seg.dataset.fontSizeNormalized = "true";
      seg.innerHTML = VALID_FONT_SIZES.map((size) => `<button type="button" class="custom-fs-btn" data-size="${size}" role="radio" aria-checked="false">${size}</button>`).join("");
    });
  }
  ensureIconSizeUI() {
    const typographyPanel = document.querySelector('[data-panel="custom"][data-content="typography"]');
    if (!typographyPanel || $id("customIconSizeSection")) return;
    const section = document.createElement("div");
    section.className = "pa-form-group mt-8";
    section.id = "customIconSizeSection";
    section.innerHTML = `
      <label class="pa-form-label">Icon Size</label>
      <div class="custom-icon-size-group" id="customIconSizeGroup" role="radiogroup" aria-label="Icon size">
        ${VALID_ICON_SIZES.map((size) => {
      const label = size.charAt(0).toUpperCase() + size.slice(1);
      const preview = ICON_PREVIEW_SIZES[size];
      return `
          <button type="button" class="custom-icon-size-card" data-icon-size="${size}" role="radio" aria-checked="false" aria-label="${label} icon size">
            <div class="custom-icon-size-preview" aria-hidden="true">
              <i class="ri-home-4-line" style="font-size:${preview}"></i>
              <i class="ri-settings-3-line" style="font-size:${preview}"></i>
              <i class="ri-notification-3-line" style="font-size:${preview}"></i>
            </div>
            <span class="custom-icon-size-label">${label}</span>
          </button>`;
    }).join("")}
      </div>`;
    typographyPanel.appendChild(section);
  }
  ensureFontUploadUI() {
    const typographyPanel = document.querySelector('[data-panel="custom"][data-content="typography"]');
    if (!typographyPanel || $id("customFontUploadSection")) return;
    const section = document.createElement("div");
    section.className = "pa-form-group mt-8";
    section.id = "customFontUploadSection";
    section.innerHTML = `
      <label class="pa-form-label">Upload Custom Font</label>
      <div class="pa-font-upload" id="customFontUpload" role="button" tabindex="0" aria-label="Upload a custom font file">
        <i class="ri-font-size-2" aria-hidden="true"></i>
        <div class="pa-media-upload-text">Click or drag a font file here</div>
        <div class="pa-media-upload-hint">WOFF, WOFF2, TTF, OTF \u2014 Max 2MB (up to ${MAX_CUSTOM_FONTS} fonts)</div>
        <input type="file" id="customFontFileInput" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf" hidden />
      </div>
      <div class="custom-font-upload-list" id="customFontUploadList" aria-live="polite"></div>`;
    const fontSizeGroup = typographyPanel.querySelector(".pa-form-group.mt-8");
    if (fontSizeGroup) typographyPanel.insertBefore(section, fontSizeGroup);
    else typographyPanel.appendChild(section);
  }
  renderUploadedFontsList() {
    const list = $id("customFontUploadList");
    const dropzone = $id("customFontUpload");
    if (!list) return;
    const fonts = this.settings.customFonts || [];
    if (!fonts.length) {
      list.innerHTML = "";
      dropzone?.classList.remove("is-full");
      return;
    }
    dropzone?.classList.toggle("is-full", fonts.length >= MAX_CUSTOM_FONTS);
    list.innerHTML = fonts.map((font) => `
      <div class="custom-font-upload-item" data-font-id="${escapeHtml(font.id)}">
        <div class="custom-font-upload-item-main">
          <span class="custom-font-upload-item-name" style="font-family:'${escapeHtml(font.familyName)}', sans-serif">${escapeHtml(font.name)}</span>
          <span class="custom-font-upload-item-meta">${escapeHtml(font.fileName || "Custom font")}</span>
        </div>
        <div class="custom-font-upload-item-actions">
          <button type="button" class="custom-font-upload-use" data-font-id="${escapeHtml(font.id)}" title="Use this font" aria-label="Use ${escapeHtml(font.name)}">Use</button>
          <button type="button" class="custom-font-upload-delete" data-font-id="${escapeHtml(font.id)}" title="Remove font" aria-label="Remove ${escapeHtml(font.name)}"><i class="ri-delete-bin-line"></i></button>
        </div>
      </div>`).join("");
  }
  async handleFontUpload(fileList) {
    const file = Array.from(fileList || [])[0];
    if (!file) return;
    const current = this.settings.customFonts || [];
    if (current.length >= MAX_CUSTOM_FONTS) {
      this.showCustomToast(`Maximum of ${MAX_CUSTOM_FONTS} custom fonts reached`);
      return;
    }
    const dropzone = $id("customFontUpload");
    dropzone?.classList.add("is-uploading");
    try {
      const entry = await buildCustomFontFromFile(file);
      this.settings.customFonts = [...current, entry];
      this.settings.fontFamily = entry.id;
      this.applyFontFamily(entry.id);
      this.renderUploadedFontsList();
      this.buildFontList($id("customFontSearch")?.value);
      await this.save();
      this.showCustomToast(`Font uploaded \u2192 ${entry.name}`);
    } catch (err) {
      this.showCustomToast(err?.message || "Could not upload font", "danger");
    } finally {
      dropzone?.classList.remove("is-uploading");
      const input = $id("customFontFileInput");
      if (input) input.value = "";
    }
  }
  async removeCustomFont(id) {
    const fonts = this.settings.customFonts || [];
    const next = fonts.filter((f) => f.id !== id);
    if (next.length === fonts.length) return;
    this.settings.customFonts = next;
    if (this.settings.fontFamily === id) {
      this.settings.fontFamily = APPEARANCE_DEFAULTS.fontFamily;
      this.applyFontFamily(this.settings.fontFamily);
    }
    this.renderUploadedFontsList();
    this.buildFontList($id("customFontSearch")?.value);
    await this.save();
    this.showCustomToast("Custom font removed");
  }
  buildFontList(query) {
    const list = $id("customFontList");
    const noRes = $id("customFontNoResults");
    if (!list) return;
    list.innerHTML = "";
    const q = (query || "").toLowerCase().trim();
    let total = 0;
    getFontGroups(this.settings.customFonts).forEach((group) => {
      const filtered = group.fonts.filter(
        (f) => !q || f.name.toLowerCase().includes(q) || f.sample.toLowerCase().includes(q)
      );
      if (!filtered.length) return;
      const groupEl = document.createElement("div");
      groupEl.className = "custom-font-group-label";
      groupEl.textContent = group.group;
      list.appendChild(groupEl);
      filtered.forEach((font) => {
        total++;
        const btn = document.createElement("button");
        btn.className = "custom-font-option" + (font.id === this.settings.fontFamily ? " active" : "");
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", String(font.id === this.settings.fontFamily));
        btn.setAttribute("data-font-id", font.id);
        btn.innerHTML = `
          <div class="custom-font-option-left">
            <span class="custom-font-option-name">${escapeHtml(font.name)}</span>
            <span class="custom-font-option-sample" style="font-family:${font.stack}">${escapeHtml(font.sample)}</span>
          </div>
          <div class="custom-font-option-right">
            <span class="custom-font-option-tag">${font.isCustom ? "custom" : escapeHtml(font.id)}</span>
            <svg class="custom-font-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          </div>`;
        this.on(btn, "click", () => {
          this.settings.fontFamily = font.id;
          this.applyFontFamily(font.id);
          this.buildFontList($id("customFontSearch")?.value);
          this.closeFontDropdown();
          this.save();
          this.showCustomToast(`Font \u2192 ${font.name}`);
        });
        list.appendChild(btn);
      });
    });
    if (noRes) noRes.style.display = total === 0 ? "block" : "none";
  }
  openFontDropdown() {
    const wrap = $id("customFontDropdownWrap");
    const trigger = $id("customFontTrigger");
    const search = $id("customFontSearch");
    if (!wrap) return;
    wrap.classList.add("open");
    trigger?.setAttribute("aria-expanded", "true");
    this.buildFontList("");
    setTimeout(() => search?.focus(), 60);
  }
  closeFontDropdown() {
    $id("customFontDropdownWrap")?.classList.remove("open");
    $id("customFontTrigger")?.setAttribute("aria-expanded", "false");
  }
  toggleFontDropdown() {
    $id("customFontDropdownWrap")?.classList.contains("open") ? this.closeFontDropdown() : this.openFontDropdown();
  }
  syncUI() {
    document.querySelectorAll(".custom-theme-card").forEach((el) => {
      const active = el.dataset.theme === this.settings.theme;
      el.classList.toggle("active", active);
      el.setAttribute("aria-checked", String(active));
    });
    document.querySelectorAll(".custom-swatch").forEach((el) => {
      const active = el.dataset.color === this.settings.accent;
      el.classList.toggle("active", active);
      el.setAttribute("aria-checked", String(active));
    });
    document.querySelectorAll(".custom-fs-btn[data-size]").forEach((el) => {
      const active = el.dataset.size === this.settings.fontSize;
      el.classList.toggle("active", active);
      el.setAttribute("aria-checked", String(active));
    });
    document.querySelectorAll(".custom-fs-btn[data-weight]").forEach((el) => {
      const active = el.dataset.weight === this.settings.fontWeight;
      el.classList.toggle("active", active);
      el.setAttribute("aria-checked", String(active));
    });
    document.querySelectorAll(".custom-fs-btn[data-spacing]").forEach((el) => {
      const active = el.dataset.spacing === this.settings.cardSpacing;
      el.classList.toggle("active", active);
      el.setAttribute("aria-checked", String(active));
    });
    document.querySelectorAll(".custom-cr-btn").forEach((el) => {
      const active = el.dataset.radius === this.settings.cornerRadius;
      el.classList.toggle("active", active);
      el.setAttribute("aria-checked", String(active));
    });
    document.querySelectorAll(".custom-icon-size-card").forEach((el) => {
      const active = el.dataset.iconSize === this.settings.iconSize;
      el.classList.toggle("active", active);
      el.setAttribute("aria-checked", String(active));
    });
    const font = getFontById(this.settings.fontFamily, this.settings.customFonts);
    const nameEl = $id("customFontTriggerName");
    const previewEl = $id("customFontTriggerPreview");
    if (nameEl) nameEl.textContent = font.name;
    if (previewEl) {
      previewEl.textContent = font.sample;
      previewEl.style.fontFamily = font.stack;
    }
    this.renderUploadedFontsList();
  }
  showCustomToast(msg, variant = "info") {
    const wrap = $id("paCustomToastWrap");
    if (!wrap) return;
    const el = document.createElement("div");
    el.className = `pa-toast ${variant}`;
    el.innerHTML = `<i class="pa-toast-icon ri-palette-line"></i><span>${msg}</span><button class="pa-toast-close" aria-label="Dismiss"><i class="ri-close-line"></i></button>`;
    const dismiss = () => {
      el.classList.add("removing");
      setTimeout(() => el.remove(), 200);
    };
    el.querySelector(".pa-toast-close").addEventListener("click", dismiss);
    wrap.appendChild(el);
    setTimeout(() => {
      if (el.parentElement) dismiss();
    }, 2500);
  }
  togglePanel() {
    const panel = $id("paCustomPanel");
    const toggleBtn = $id("paCustomToggle") || document.querySelector(".pa-custom-toggle");
    if (!panel) return;
    if (panel.classList.contains("visible")) {
      this.closePanel();
    } else {
      closePanels();
      panel.classList.add("visible");
      $id("paPanelOverlay")?.classList.add("visible");
      toggleBtn?.classList.add("active");
      document.body.style.overflow = "hidden";
      this.syncUI();
      activateTab("custom", "theme");
      setTimeout(() => panel.querySelector("button, input, select")?.focus(), 100);
    }
  }
  closePanel() {
    $id("paCustomPanel")?.classList.remove("visible");
    $id("paPanelOverlay")?.classList.remove("visible");
    ($id("paCustomToggle") || document.querySelector(".pa-custom-toggle"))?.classList.remove("active");
    document.body.style.overflow = "";
    this.closeFontDropdown();
  }
  bindFontUploadEvents() {
    const dropzone = $id("customFontUpload");
    const fileInput = $id("customFontFileInput");
    const list = $id("customFontUploadList");
    if (!dropzone || !fileInput) return;
    this.on(dropzone, "click", (e) => {
      if (e.target.closest(".custom-font-upload-delete, .custom-font-upload-use")) return;
      if (dropzone.classList.contains("is-full")) {
        this.showCustomToast(`Maximum of ${MAX_CUSTOM_FONTS} custom fonts reached`);
        return;
      }
      fileInput.click();
    });
    this.on(dropzone, "keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        dropzone.click();
      }
    });
    this.on(fileInput, "change", (e) => this.handleFontUpload(e.target.files));
    ["dragenter", "dragover"].forEach((evt) => {
      this.on(dropzone, evt, (e) => {
        e.preventDefault();
        if (!dropzone.classList.contains("is-full")) dropzone.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach((evt) => {
      this.on(dropzone, evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
      });
    });
    this.on(dropzone, "drop", (e) => {
      if (dropzone.classList.contains("is-full")) return;
      const files = e.dataTransfer?.files;
      if (files?.length) this.handleFontUpload(files);
    });
    if (list) {
      this.on(list, "click", (e) => {
        const useBtn = e.target.closest(".custom-font-upload-use");
        const deleteBtn = e.target.closest(".custom-font-upload-delete");
        if (useBtn) {
          const id = useBtn.dataset.fontId;
          this.settings.fontFamily = id;
          this.applyFontFamily(id);
          this.syncUI();
          this.save();
          this.showCustomToast(`Font \u2192 ${getFontById(id, this.settings.customFonts).name}`);
        } else if (deleteBtn) {
          this.removeCustomFont(deleteBtn.dataset.fontId);
        }
      });
    }
  }
  bindEvents() {
    registerPanel("paCustomPanel");
    this.bindFontUploadEvents();
    const toggleBtn = $id("paCustomToggle") || document.querySelector(".pa-custom-toggle");
    this.on(toggleBtn, "click", () => this.togglePanel());
    this.on($id("paCustomPanelClose"), "click", () => this.closePanel());
    this.on($id("paCustomCancel"), "click", () => this.closePanel());
    this.on($id("paPanelOverlay"), "click", (e) => {
      if (e.target.id === "paPanelOverlay" && $id("paCustomPanel")?.classList.contains("visible")) {
        this.closePanel();
      }
    });
    this.on(document, "keydown", (e) => {
      if (e.key === "Escape" && $id("paCustomPanel")?.classList.contains("visible")) this.closePanel();
    });
    document.querySelectorAll(".custom-theme-card").forEach((btn) => {
      this.on(btn, "click", () => {
        this.settings.theme = btn.dataset.theme;
        this.applyTheme(this.settings.theme);
        this.syncUI();
        this.save();
        this.showCustomToast(`Theme \u2192 ${this.settings.theme}`);
      });
    });
    document.querySelectorAll(".custom-swatch").forEach((btn) => {
      this.on(btn, "click", () => {
        this.settings.accent = btn.dataset.color;
        this.applyAccent(this.settings.accent);
        this.syncUI();
        this.save();
        this.showCustomToast("Accent color updated");
      });
    });
    const customPanel = $id("paCustomPanel");
    this.on(customPanel, "click", (e) => {
      const btn = e.target.closest(".custom-fs-btn");
      if (!btn || !customPanel?.contains(btn)) return;
      if (btn.dataset.size && VALID_FONT_SIZES.includes(btn.dataset.size)) {
        this.settings.fontSize = btn.dataset.size;
        this.applyFontSize(this.settings.fontSize);
        this.syncUI();
        this.save();
        this.showCustomToast(`Font size \u2192 ${this.settings.fontSize}`);
      } else if (btn.dataset.weight && VALID_FONT_WEIGHTS.includes(btn.dataset.weight)) {
        this.settings.fontWeight = btn.dataset.weight;
        this.applyFontWeight(this.settings.fontWeight);
        this.syncUI();
        this.save();
        this.showCustomToast(`Font weight \u2192 ${this.settings.fontWeight}`);
      } else if (btn.dataset.spacing && VALID_SPACINGS.includes(btn.dataset.spacing)) {
        this.settings.cardSpacing = btn.dataset.spacing;
        this.applyCardSpacing(this.settings.cardSpacing);
        this.syncUI();
        this.save();
        this.showCustomToast(`Card spacing \u2192 ${this.settings.cardSpacing}`);
      }
    });
    document.querySelectorAll(".custom-icon-size-card").forEach((btn) => {
      this.on(btn, "click", () => {
        if (!VALID_ICON_SIZES.includes(btn.dataset.iconSize)) return;
        this.settings.iconSize = btn.dataset.iconSize;
        this.applyIconSize(this.settings.iconSize);
        this.syncUI();
        this.save();
        const label = btn.dataset.iconSize.charAt(0).toUpperCase() + btn.dataset.iconSize.slice(1);
        this.showCustomToast(`Icon size \u2192 ${label}`);
      });
    });
    const radiusLabels = { "0px": "None", "5px": "Small", "14px": "Medium", "25px": "Large" };
    document.querySelectorAll(".custom-cr-btn").forEach((btn) => {
      this.on(btn, "click", () => {
        this.settings.cornerRadius = btn.dataset.radius;
        this.applyCornerRadius(this.settings.cornerRadius);
        this.syncUI();
        this.save();
        this.showCustomToast(`Corner radius \u2192 ${radiusLabels[this.settings.cornerRadius] || this.settings.cornerRadius}`);
      });
      this.on(btn, "keydown", (e) => {
        const all = [...document.querySelectorAll(".custom-cr-btn")];
        const idx = all.indexOf(btn);
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          all[(idx + 1) % all.length]?.focus();
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          all[(idx - 1 + all.length) % all.length]?.focus();
        } else if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          btn.click();
        }
      });
    });
    this.on($id("customFontTrigger"), "click", () => this.toggleFontDropdown());
    this.on($id("customFontSearch"), "input", (e) => this.buildFontList(e.target.value));
    this.on(document, "click", (e) => {
      const wrap = $id("customFontDropdownWrap");
      if (wrap && !wrap.contains(e.target)) this.closeFontDropdown();
    });
    this.on($id("customFontDropdownWrap"), "keydown", (e) => {
      if (e.key === "Escape") {
        this.closeFontDropdown();
        $id("customFontTrigger")?.focus();
      }
    });
    this.on(this.systemMq, "change", () => {
      if (this.settings.theme === "system") this.applyTheme("system");
    });
    document.querySelectorAll('.pa-panel-tab[data-panel="custom"]').forEach((btn) => {
      this.on(btn, "click", () => {
        activateTab("custom", btn.dataset.tab);
        this.syncUI();
      });
    });
    const observer = new MutationObserver(() => {
      if ($id("paCustomPanel")?.classList.contains("visible")) this.syncUI();
    });
    const panel = $id("paCustomPanel");
    if (panel) observer.observe(panel, { attributes: true, attributeFilter: ["class"] });
    this._observer = observer;
  }
  destroy() {
    this._observer?.disconnect();
    super.destroy();
  }
};

// client/utils/avatar-upload.ts
var AVATAR_OPTS = { maxWidth: 192, maxHeight: 192, quality: 0.78 };
async function uploadUserAvatar(file, opts = {}) {
  if (!file) return null;
  if (!handleFileValidation(file)) return null;
  const previousImg = document.querySelector("#paUserDropdownAvatar .pa-avatar img");
  const previousAvatarUrl = previousImg?.src || null;
  const previewUrl = URL.createObjectURL(file);
  previewUserAvatar(previewUrl);
  opts.onPreview?.(previewUrl);
  const avatarBtn = document.getElementById("paUserDropdownAvatar");
  avatarBtn?.classList.add("is-uploading");
  try {
    const avatarUrl = await readOptimizedImageDataUrl(file, AVATAR_OPTS);
    const data = await authService.updateProfile({ avatarUrl });
    const profile = data?.profile ?? data;
    if (!profile || typeof profile !== "object") {
      throw new Error("Server did not return an updated profile.");
    }
    applyUserDisplay({
      fullName: profile.fullName,
      username: profile.username,
      email: profile.email,
      role: profile.role,
      avatarUrl: profile.avatarUrl
    });
    eventBus.emit("profile:updated", profile);
    showToast("Avatar updated!", "success", 2200);
    opts.onComplete?.(profile);
    return profile;
  } catch (err) {
    if (previousAvatarUrl) {
      previewUserAvatar(previousAvatarUrl);
    } else {
      try {
        const profile = await authService.getProfile();
        applyUserDisplay(profile);
      } catch {
      }
    }
    showToast(err?.message || "Could not save avatar.", "danger");
    opts.onComplete?.(null);
    return null;
  } finally {
    URL.revokeObjectURL(previewUrl);
    avatarBtn?.classList.remove("is-uploading");
  }
}

// client/modules/shell/mobileHeaderSearch.ts
var MOBILE_SEARCH_MAX = 899;
var abortController = null;
var headerTop = null;
function getSearchWrap() {
  return document.querySelector(".pa-header-top-left .pa-search, .pa-header-right .pa-search");
}
function getSearchInput() {
  return getSearchWrap()?.querySelector("input");
}
function isMobileSearchViewport() {
  return window.innerWidth <= MOBILE_SEARCH_MAX;
}
function isMobileHeaderSearchOpen() {
  return headerTop?.classList.contains("pa-header-top--search-open") ?? false;
}
function closeMobileHeaderSearch() {
  if (!headerTop) return;
  headerTop.classList.remove("pa-header-top--search-open");
  document.documentElement.classList.remove("pa-mobile-search-active");
  const toggle = document.getElementById("paMobileSearchToggle");
  toggle?.setAttribute("aria-expanded", "false");
}
function openMobileHeaderSearch() {
  const wrap = getSearchWrap();
  if (!wrap || !headerTop || !isMobileSearchViewport()) return false;
  document.getElementById("paNotifWrap")?.classList.remove("open");
  headerTop.classList.add("pa-header-top--search-open");
  document.documentElement.classList.add("pa-mobile-search-active");
  const toggle = document.getElementById("paMobileSearchToggle");
  toggle?.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => getSearchInput()?.focus());
  return true;
}
function initMobileHeaderSearch() {
  abortController?.abort();
  abortController = new AbortController();
  const { signal } = abortController;
  headerTop = document.querySelector(".pa-header-top");
  const searchWrap = getSearchWrap();
  const headerTopRight = document.querySelector(".pa-header-top-right");
  if (!headerTop || !searchWrap || !headerTopRight) {
    headerTop = null;
    return;
  }
  closeMobileHeaderSearch();
  let toggle = document.getElementById("paMobileSearchToggle");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.id = "paMobileSearchToggle";
    toggle.className = "pa-mobile-search-toggle";
    toggle.setAttribute("aria-label", "Open search");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", searchWrap.id || "paSearchWrap");
    toggle.innerHTML = '<i class="ri-search-line" aria-hidden="true"></i>';
    headerTopRight.insertBefore(toggle, headerTopRight.firstChild);
  }
  let dismiss = searchWrap.querySelector(".pa-mobile-search-dismiss");
  if (!dismiss) {
    dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "pa-mobile-search-dismiss";
    dismiss.setAttribute("aria-label", "Close search");
    dismiss.innerHTML = '<i class="ri-close-line" aria-hidden="true"></i>';
    searchWrap.appendChild(dismiss);
  }
  toggle.addEventListener("click", () => {
    if (isMobileHeaderSearchOpen()) closeMobileHeaderSearch();
    else openMobileHeaderSearch();
  }, { signal });
  dismiss.addEventListener("click", (e) => {
    e.preventDefault();
    closeMobileHeaderSearch();
  }, { signal });
  window.addEventListener("resize", () => {
    if (!isMobileSearchViewport()) closeMobileHeaderSearch();
  }, { signal });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !isMobileHeaderSearchOpen()) return;
    e.preventDefault();
    e.stopPropagation();
    closeMobileHeaderSearch();
  }, { signal, capture: true });
}

// client/modules/shell/roleAccessModal.ts
var BRIEFING_VERSION = "v1";
var STORAGE_PREFIX = "pa_role_access_briefing";
var ROLE_BRIEFINGS = {
  editor: {
    title: "Editor account",
    subtitle: "You can manage portfolio content and update selected settings.",
    icon: "ri-edit-box-line",
    allowed: [
      "View every dashboard and content page",
      "Create, edit, and delete projects, media, blog posts, and other CMS data",
      "Update General, Notifications, Profile, and Security settings",
      "Use appearance and customization options"
    ],
    restricted: [
      "User management or adding new staff accounts",
      "System settings and database tools",
      "Admin-only sidebar links stay hidden for your role"
    ]
  },
  viewer: {
    title: "Viewer account",
    subtitle: "Your access is read-only across the portfolio dashboard.",
    icon: "ri-eye-line",
    allowed: [
      "View dashboard stats and all content pages",
      "Browse projects, media, messages, and other records",
      "Update Notifications, Profile, and Security settings",
      "Use appearance and customization options"
    ],
    restricted: [
      "Create, edit, or delete any content or records",
      "Dashboard add actions, bulk actions, and edit panels",
      "Changing General site settings (view only)",
      "User management and system settings"
    ]
  }
};
var bindingsReady = false;
function storageKey(userId, role) {
  return `${STORAGE_PREFIX}_${BRIEFING_VERSION}_${userId}_${role}`;
}
function hasSeenBriefing(userId, role) {
  try {
    return localStorage.getItem(storageKey(userId, role)) === "1";
  } catch {
    return false;
  }
}
function markBriefingSeen(userId, role) {
  try {
    localStorage.setItem(storageKey(userId, role), "1");
  } catch {
  }
}
function formatRoleLabel(role) {
  return (role || "staff").replace(/_/g, " ");
}
function renderList(items, variant) {
  return items.map((item) => `<li class="pa-role-access-item pa-role-access-item--${variant}">
      <i class="${variant === "allowed" ? "ri-check-line" : "ri-close-line"}" aria-hidden="true"></i>
      <span>${item}</span>
    </li>`).join("");
}
function ensureModalInDom() {
  if ($id("paRoleAccessOverlay")) return;
  const overlay = document.createElement("div");
  overlay.className = "pa-role-access-overlay";
  overlay.id = "paRoleAccessOverlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "paRoleAccessTitle");
  overlay.innerHTML = `
    <div class="pa-role-access-box">
      <div class="pa-role-access-head">
        <div class="pa-role-access-icon" id="paRoleAccessIcon" aria-hidden="true">
          <i class="ri-shield-user-line"></i>
        </div>
        <div>
          <div class="pa-role-access-eyebrow" id="paRoleAccessEyebrow">Account access</div>
          <div class="pa-role-access-title" id="paRoleAccessTitle">Your permissions</div>
          <div class="pa-role-access-subtitle" id="paRoleAccessSubtitle"></div>
        </div>
      </div>
      <div class="pa-role-access-body">
        <div class="pa-role-access-section">
          <div class="pa-role-access-section-title allowed"><i class="ri-check-double-line"></i> You can</div>
          <ul class="pa-role-access-list" id="paRoleAccessAllowed"></ul>
        </div>
        <div class="pa-role-access-section">
          <div class="pa-role-access-section-title restricted"><i class="ri-forbid-line"></i> You cannot</div>
          <ul class="pa-role-access-list" id="paRoleAccessRestricted"></ul>
        </div>
      </div>
      <div class="pa-role-access-foot">
        <p class="pa-role-access-note">These limits are enforced in the sidebar, settings, and API. To request a role change, open Settings \u2192 Security and use the "Request role update" form.</p>
        <button type="button" class="pa-btn pa-btn-primary w-100" id="paRoleAccessOk">Got it</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}
function bindModalEvents() {
  if (bindingsReady) return;
  bindingsReady = true;
  const overlay = $id("paRoleAccessOverlay");
  const okBtn = $id("paRoleAccessOk");
  if (!overlay || !okBtn) return;
  const close = () => {
    overlay.classList.remove("visible");
    document.body.classList.remove("pa-role-access-open");
    overlay.dataset.userId = "";
    overlay.dataset.role = "";
  };
  okBtn.addEventListener("click", () => {
    const userId = overlay.dataset.userId;
    const role = overlay.dataset.role;
    if (userId && role) markBriefingSeen(userId, role);
    close();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("visible")) close();
  });
}
function populateModal(role) {
  const briefing = ROLE_BRIEFINGS[role];
  if (!briefing) return;
  const iconWrap = $id("paRoleAccessIcon");
  const eyebrow = $id("paRoleAccessEyebrow");
  const title = $id("paRoleAccessTitle");
  const subtitle = $id("paRoleAccessSubtitle");
  const allowed = $id("paRoleAccessAllowed");
  const restricted = $id("paRoleAccessRestricted");
  if (iconWrap) iconWrap.innerHTML = `<i class="${briefing.icon}"></i>`;
  if (eyebrow) eyebrow.textContent = `${formatRoleLabel(role)} access`;
  if (title) title.textContent = briefing.title;
  if (subtitle) subtitle.textContent = briefing.subtitle;
  if (allowed) allowed.innerHTML = renderList(briefing.allowed, "allowed");
  if (restricted) restricted.innerHTML = renderList(briefing.restricted, "restricted");
}
function openModal(userId, role) {
  ensureModalInDom();
  bindModalEvents();
  const overlay = $id("paRoleAccessOverlay");
  if (!overlay) return;
  populateModal(role);
  overlay.dataset.userId = userId;
  overlay.dataset.role = role;
  overlay.classList.add("visible");
  document.body.classList.add("pa-role-access-open");
  $id("paRoleAccessOk")?.focus();
}
async function maybeShowRoleAccessModal(profile = null) {
  if (typeof window === "undefined") return;
  if (window.location.pathname.includes("/login")) return;
  let userId = profile?.id;
  let role = profile?.role;
  if (!role || !userId) {
    try {
      const session = await authService.session();
      userId = userId || session?.user?.id;
      if (!role) {
        const loaded = await authService.getProfile().catch(() => null);
        role = loaded?.role || session?.user?.role;
        userId = userId || loaded?.id;
      }
    } catch {
      return;
    }
  }
  if (!userId || !role || !ROLE_BRIEFINGS[role]) return;
  if (hasSeenBriefing(userId, role)) return;
  requestAnimationFrame(() => {
    openModal(userId, role);
  });
}

// client/modules/shell/ShellModule.ts
var KNOWN_NAV_LABELS = [
  "Projects",
  "Categories",
  "Tags",
  "Technologies",
  "Tool Categories",
  "Tools",
  "Media Library",
  "Testimonials",
  "Blog Posts",
  "Blog Categories",
  "Experience",
  "Dashboard",
  "Contact Messages",
  "Recent Activities",
  "Settings",
  "Users"
];
var ShellModule = class extends Module {
  constructor() {
    super({ name: "Shell" });
    this._sessionExpiryTimer = null;
    this.customization = new CustomizationModule();
    this.addUser = new AddUserManager({
      on: this.on.bind(this),
      closeUserMenu: () => {
        this._userMenuWrap?.classList.remove("open");
        $id("paUserMenu")?.setAttribute("aria-expanded", "false");
      }
    });
  }
  async init() {
    initConfirmDialog();
    this.bindEvents();
    this.addUser.bindEvents();
    this.onBus("profile:updated", (profile) => {
      applyUserDisplay(profile);
      applyRoleBasedAccess(profile?.role);
      this.addUser.setProfileRole(profile?.role);
    });
    await Promise.all([
      this.loadUserSession(),
      this.customization.init(),
      loadNotifications()
    ]);
    renderNotifications();
    initSettingsNav();
    initSidebarGroupNav();
    initSidebarCollapse();
  }
  async loadUserSession() {
    try {
      const { user, sessionExpiresAt } = await authService.session();
      if (!user) return;
      this.scheduleSessionExpiry(sessionExpiresAt);
      try {
        const profile = await authService.getProfile();
        applyUserDisplay({
          fullName: profile.fullName,
          username: profile.username,
          email: profile.email || user.email,
          role: profile.role || user.role,
          avatarUrl: profile.avatarUrl
        });
        applyRoleBasedAccess(profile.role || user.role);
        this.addUser.setProfileRole(profile.role || user.role);
        void maybeShowRoleAccessModal({
          id: profile.id || user.id,
          role: profile.role || user.role
        });
      } catch {
        applyUserDisplay(user);
        applyRoleBasedAccess(user.role);
        this.addUser.setProfileRole(user.role);
        void maybeShowRoleAccessModal({ id: user.id, role: user.role });
      }
    } catch (err) {
      console.warn("[Shell] session load failed:", err);
    }
  }
  scheduleSessionExpiry(sessionExpiresAt) {
    if (this._sessionExpiryTimer) {
      window.clearTimeout(this._sessionExpiryTimer);
      this._sessionExpiryTimer = null;
    }
    if (!sessionExpiresAt) return;
    const ms = new Date(sessionExpiresAt).getTime() - Date.now();
    if (ms <= 0) {
      void this.expireSessionNow();
      return;
    }
    this._sessionExpiryTimer = window.setTimeout(() => {
      void this.expireSessionNow();
    }, ms);
  }
  async expireSessionNow() {
    try {
      await authService.logout();
    } catch {
    }
    window.location.assign(`${getLoginPath()}?session=expired`);
  }
  bindEvents() {
    const sidebar = $id("paSidebar");
    const overlay = $id("paSidebarOverlay");
    const toggle = $id("paMobileToggle");
    const closeMobileSidebar = () => {
      sidebar?.classList.remove("mobile-open");
      overlay?.classList.remove("visible");
    };
    this._closeMobileSidebar = closeMobileSidebar;
    this.on(toggle, "click", () => {
      sidebar?.classList.add("mobile-open");
      overlay?.classList.add("visible");
    });
    this.on(overlay, "click", closeMobileSidebar);
    const handleNavSelection = (item) => {
      const href = item.getAttribute("href");
      if (href === "#") return;
      document.querySelectorAll(".pa-nav-subitem").forEach((i) => i.classList.remove("active"));
      document.querySelectorAll(".pa-nav-toggle").forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      const label = item.dataset.nav;
      if (label && !KNOWN_NAV_LABELS.includes(label)) {
        showToast(`"${label}" section is not implemented in this demo`, "info");
      }
      closeMobileSidebar();
    };
    document.querySelectorAll(".pa-nav-subitem[data-nav], .pa-nav-subitem[data-settings-tab]").forEach((item) => {
      this.on(item, "click", (e) => {
        if (item.getAttribute("href") === "#") e.preventDefault();
        handleNavSelection(item);
      });
    });
    const userMenuWrap = $id("paUserMenuWrap");
    const userMenuBtn = $id("paUserMenu");
    this._userMenuWrap = userMenuWrap;
    if (userMenuBtn && userMenuWrap) {
      this.on(userMenuBtn, "click", (e) => {
        e.stopPropagation();
        const isOpen = userMenuWrap.classList.toggle("open");
        userMenuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        if (isOpen) notifWrap?.classList.remove("open");
      });
      this.on(userMenuBtn, "keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const isOpen = userMenuWrap.classList.toggle("open");
          userMenuBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        }
      });
    }
    this.bindHeaderAvatarUpload();
    const userDropdownLogout = $id("paUserDropdownLogout");
    if (userDropdownLogout) {
      this.on(userDropdownLogout, "click", (e) => {
        e.stopPropagation();
        userMenuWrap?.classList.remove("open");
        userMenuBtn?.setAttribute("aria-expanded", "false");
        this.handleLogout();
      });
    }
    const logoutBtn = $id("paLogoutBtn");
    if (logoutBtn) {
      this.on(logoutBtn, "click", () => this.handleLogout());
    }
    const notifWrap = $id("paNotifWrap");
    const notifBtn = $id("paNotifBtn");
    this._notifWrap = notifWrap;
    if (notifBtn && notifWrap) {
      this.on(notifBtn, "click", (e) => {
        e.stopPropagation();
        const opening = !notifWrap.classList.contains("open");
        notifWrap.classList.toggle("open");
        if (notifWrap.classList.contains("open")) {
          userMenuWrap?.classList.remove("open");
          userMenuBtn?.setAttribute("aria-expanded", "false");
          if (opening) void loadNotifications();
        }
      });
      this.on(notifBtn, "keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          notifWrap.classList.toggle("open");
        }
      });
      this.on($id("paNotifClearBtn"), "click", (e) => {
        e.stopPropagation();
        if (document.body.classList.contains("pa-role-readonly")) {
          showToast("Viewers cannot clear notifications.", "warning", 2200);
          return;
        }
        void clearNotifications().then(() => {
          showToast("Notifications cleared", "info", 1800);
        });
      });
      const notifList = $id("paNotifList");
      if (notifList) {
        this.on(notifList, "click", (e) => {
          const item = e.target.closest("[data-notif-id]");
          if (!item) return;
          const id = item.dataset.notifId;
          const link = item.dataset.notifLink;
          void markNotificationRead(id).then(() => {
            if (link) window.location.href = link;
          });
        });
      }
    }
    this.onBus("notifications:updated", () => {
      renderNotifications();
    });
    this.onBus("storage:invalidated", (key) => {
      if (key === "pa_notifications" || key === "pa_recent_activities") {
        void loadNotifications({ silent: true });
      }
    });
    this.on(document, "click", (e) => {
      if (notifWrap && !notifWrap.contains(e.target)) notifWrap.classList.remove("open");
      if (userMenuWrap && !userMenuWrap.contains(e.target)) {
        if (!userMenuWrap.classList.contains("pa-user-menu--locked")) {
          userMenuWrap.classList.remove("open");
          userMenuBtn?.setAttribute("aria-expanded", "false");
        }
      }
      if (!e.target.closest(".pa-card-actions, .pa-cat-card__list-actions, .pa-cat-card__footer-more, .pa-proj-card__head-more, .pa-proj-card__list-more, .pa-proj-card__list-actions, .pa-media-card__thumb-more, .pa-media-card__footer-more, .pa-media-card__list-more, .pa-media-card__list-actions")) closeAllCardMenus();
    });
    this.on(document, "keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === "k") {
        e.preventDefault();
        const search = $id("paSearchInput") || $id("paCatSearchInput");
        if (search && window.innerWidth <= 899) openMobileHeaderSearch();
        else search?.focus();
      }
      if (e.key === "Escape") {
        if (isMobileHeaderSearchOpen()) {
          closeMobileHeaderSearch();
        } else if (isConfirmOpen()) {
          closeConfirm();
        } else if ($id("paBulkConfirmOverlay")?.classList.contains("visible")) {
          eventBus.emit("bulk-confirm:close");
        } else if (anyPanelOpen()) {
          closePanels();
        } else {
          closeAllCardMenus();
          notifWrap?.classList.remove("open");
          userMenuWrap?.classList.remove("open");
          userMenuBtn?.setAttribute("aria-expanded", "false");
          closeMobileSidebar();
        }
      }
      if (e.key?.toLowerCase() === "n" && !anyPanelOpen() && !document.activeElement.matches("input, textarea, select, [contenteditable]")) {
        eventBus.emit("shortcut:new-item", { page: PAGE });
      }
    });
  }
  bindHeaderAvatarUpload() {
    const avatarBtn = $id("paUserDropdownAvatar");
    const userMenuWrap = this._userMenuWrap || $id("paUserMenuWrap");
    const userMenuBtn = $id("paUserMenu");
    if (!avatarBtn) return;
    let avatarInput = $id("paHeaderAvatarInput");
    if (!avatarInput) {
      avatarInput = document.createElement("input");
      avatarInput.type = "file";
      avatarInput.id = "paHeaderAvatarInput";
      avatarInput.accept = "image/png,image/jpeg,image/webp";
      avatarInput.hidden = true;
      document.body.appendChild(avatarInput);
    }
    const lockMenu = () => {
      userMenuWrap?.classList.add("pa-user-menu--locked", "open");
      userMenuBtn?.setAttribute("aria-expanded", "true");
    };
    const unlockMenu = (closeAfter = false) => {
      userMenuWrap?.classList.remove("pa-user-menu--locked");
      if (closeAfter) {
        userMenuWrap?.classList.remove("open");
        userMenuBtn?.setAttribute("aria-expanded", "false");
      }
    };
    this.on(avatarBtn, "click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      lockMenu();
      avatarInput.click();
    });
    this.on(avatarInput, "cancel", () => {
      unlockMenu(false);
      avatarInput.value = "";
    });
    this.on(window, "focus", () => {
      if (!userMenuWrap?.classList.contains("pa-user-menu--locked")) return;
      window.setTimeout(() => {
        if (!avatarInput.files?.length && !avatarBtn.classList.contains("is-uploading")) {
          unlockMenu(false);
        }
      }, 280);
    });
    this.on(avatarInput, "change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) {
        unlockMenu(false);
        e.target.value = "";
        return;
      }
      lockMenu();
      await uploadUserAvatar(file, {
        onComplete: (profile) => unlockMenu(!!profile)
      });
      e.target.value = "";
    });
  }
  handleLogout() {
    requestLogout(async () => {
      showToast("Logging out...", "info", 1500);
      try {
        await authService.logout();
      } catch (err) {
        console.warn("[Shell] logout failed:", err);
      }
      try {
        await storage.clearPersistentCache();
      } catch (err) {
        console.warn("[Shell] cache clear failed:", err);
      }
      window.location.href = getLoginPath();
    });
  }
  destroy() {
    this.customization.destroy();
    super.destroy();
  }
};

// client/modules/shell/sidebarRailNav.ts
var ROUTE_RAIL = [
  ["/settings", "settings"],
  ["/tool-categories", "tools"],
  ["/technologies", "tools"],
  ["/tools", "tools"],
  ["/blog-categories", "content"],
  ["/blog-post", "content"],
  ["/testimonials", "content"],
  ["/experience", "content"],
  ["/media-library", "content"],
  ["/projects", "projects"],
  ["/categories", "projects"],
  ["/tags", "projects"],
  ["/recent-activities", "home"],
  ["/contact-messages", "home"],
  ["/users", "home"]
];
function resolveRailSection(path = window.location.pathname) {
  if (path === "/" || path === "") return "home";
  for (const [needle, section] of ROUTE_RAIL) {
    if (path.includes(needle)) return section;
  }
  return "home";
}
function getNavGroup(section) {
  return document.querySelector(`.pa-nav-group[data-nav-group="${section}"]`);
}
function syncSidebarRailActive() {
  const section = resolveRailSection();
  document.querySelectorAll(".pa-rail-btn[data-rail-target]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.railTarget === section);
  });
}
function focusNavGroup(section) {
  const group = getNavGroup(section);
  if (!group) return;
  if (isSidebarCollapsedDesktop()) {
    showNavFlyout(group);
    return;
  }
  hideNavFlyout();
  group.classList.add("pa-nav-anim-ready", "open");
  group.querySelector(":scope > .pa-nav-parent-row .pa-nav-toggle")?.setAttribute("aria-expanded", "true");
  group.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
var railBound = false;
function initSidebarRailNav() {
  syncSidebarRailActive();
  if (railBound) return;
  railBound = true;
  document.querySelectorAll(".pa-rail-btn[data-rail-target]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const section = btn.dataset.railTarget;
      if (!section) return;
      document.querySelectorAll(".pa-rail-btn[data-rail-target]").forEach((el) => {
        el.classList.toggle("active", el === btn);
      });
      focusNavGroup(section);
    });
  });
  window.addEventListener("popstate", syncSidebarRailActive);
}

// client/modules/shell/sidebarNav.ts
var NAV_BY_PATH = [
  ["/tool-categories", "Tool Categories"],
  ["/recent-activities", "Recent Activities"],
  ["/users", "Users"],
  ["/contact-messages", "Contact Messages"],
  ["/media-library", "Media Library"],
  ["/technologies", "Technologies"],
  ["/blog-categories", "Blog Categories"],
  ["/categories", "Categories"],
  ["/tags", "Tags"],
  ["/testimonials", "Testimonials"],
  ["/experience", "Experience"],
  ["/blog-post", "Blog Posts"],
  ["/projects", "Projects"],
  ["/settings", "Settings"],
  ["/tools", "Tools"]
];
function resolveActiveNav(path = window.location.pathname) {
  if (path === "/" || path === "") return "Dashboard";
  for (const [needle, label] of NAV_BY_PATH) {
    if (path.includes(needle)) return label;
  }
  return null;
}
function syncSidebarActiveNav() {
  const active = resolveActiveNav();
  if (!active) return;
  document.querySelectorAll(".pa-nav-subitem[data-nav]").forEach((item) => {
    item.classList.toggle("active", item.dataset.nav === active);
  });
  if (active === "Settings" && window.location.pathname.includes("/settings")) {
    const tab = getSettingsTabFromPath();
    document.querySelectorAll(".pa-nav-subitem[data-settings-tab]").forEach((item) => {
      item.classList.toggle("active", item.dataset.settingsTab === tab);
    });
  } else {
    document.querySelectorAll(".pa-nav-subitem[data-settings-tab]").forEach((item) => {
      item.classList.remove("active");
    });
  }
  syncSidebarGroupNav();
  syncSidebarRailActive();
}
var sidebarNavBound = false;
function bindSidebarPrefetch() {
  const warm = typeof window.__paWarmPrefetchPath === "function" ? window.__paWarmPrefetchPath : null;
  if (!warm) return;
  document.querySelectorAll(".pa-nav-subitem[href], .pa-logo-link[href]").forEach((link) => {
    link.addEventListener("pointerenter", () => {
      const href = link.getAttribute("href");
      if (href) warm(href);
    }, { passive: true });
  });
}
function initSidebarNav() {
  syncSidebarActiveNav();
  if (!sidebarNavBound) {
    window.addEventListener("popstate", syncSidebarActiveNav);
    bindSidebarPrefetch();
    sidebarNavBound = true;
  }
}

// client/utils/appearanceApply.ts
async function loadPublicAppearance() {
  const cached = readAppearanceCache();
  if (cached) return cached;
  const bag = typeof window !== "undefined" ? window.__paPrefetch : null;
  const pending = bag?.appearance_settings_v2;
  if (pending && typeof pending.then === "function") {
    try {
      const value = await pending;
      if (value) {
        writeAppearanceCache(value);
        return value;
      }
    } catch {
    }
  }
  const res = await fetch("/api/appearance/public", {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data) writeAppearanceCache(data);
  return data;
}
async function initAuthAppearance() {
  try {
    const cached = readAppearanceCache();
    if (cached) applyAppearanceSettings(cached);
    const settings = await loadPublicAppearance();
    if (settings) applyAppearanceSettings(settings);
    const { updateFaviconFromAppearance } = await import("./chunks/favicon-XA5Y2BS6.js");
    updateFaviconFromAppearance(settings || cached || {});
  } catch {
  }
}

// client/main.ts
var AUTH_PAGES = /* @__PURE__ */ new Set(["login", "forgot-password", "reset-password"]);
var PREFETCH_BY_PAGE = window.__paPrefetchConfig?.PAGE_KEYS || {};
async function loadPageModuleClass(page) {
  switch (page) {
    case "dashboard":
      return (await import("./chunks/DashboardModule-TKWXYAUN.js")).DashboardModule;
    case "projects":
      return (await import("./chunks/ProjectsModule-UCF6O6DE.js")).ProjectsModule;
    case "categories":
      return (await import("./chunks/CategoriesModule-BAUYDXE7.js")).CategoriesModule;
    case "tags":
      return (await import("./chunks/TagsModule-6TAUCSM7.js")).TagsModule;
    case "technologies":
      return (await import("./chunks/TechnologiesModule-XULEGXOR.js")).TechnologiesModule;
    case "tool-categories":
      return (await import("./chunks/ToolCategoriesModule-2WUGYSUJ.js")).ToolCategoriesModule;
    case "blog-categories":
      return (await import("./chunks/BlogCategoriesModule-ZSAN6WG3.js")).BlogCategoriesModule;
    case "tools":
      return (await import("./chunks/ToolsModule-B5OIQAAX.js")).ToolsModule;
    case "media":
      return (await import("./chunks/MediaModule-VO2MIULM.js")).MediaModule;
    case "testimonials":
      return (await import("./chunks/TestimonialsModule-DXVKFHVA.js")).TestimonialsModule;
    case "blogposts":
      return (await import("./chunks/BlogModule-5NAJENVL.js")).BlogModule;
    case "experience":
      return (await import("./chunks/ExperienceModule-DRZ2RQKT.js")).ExperienceModule;
    case "contact-messages":
      return (await import("./chunks/ContactMessagesModule-EOQDEV4G.js")).ContactMessagesModule;
    case "users":
      return (await import("./chunks/UsersModule-YKM5ELJI.js")).UsersModule;
    case "recent-activities":
      return (await import("./chunks/RecentActivitiesModule-RXRMPU4M.js")).RecentActivitiesModule;
    case "settings":
      return (await import("./chunks/SettingsModule-NMMFHR7F.js")).SettingsModule;
    case "login":
      return (await import("./chunks/LoginModule-EZ27DCRP.js")).LoginModule;
    case "forgot-password":
      return (await import("./chunks/ForgotPasswordModule-GLZKYSWY.js")).ForgotPasswordModule;
    case "reset-password":
      return (await import("./chunks/ResetPasswordModule-BZCBTGBF.js")).ResetPasswordModule;
    default:
      return null;
  }
}
var activePageModule = null;
var shellInstance = null;
var bootPromise = null;
var appChromeInitialized = false;
function bindGlobalPanelChrome() {
  initUserCredentialsPanel();
  $all(".pa-panel-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      activateTab(btn.dataset.panel, btn.dataset.tab);
    });
  });
  $id("paPanelOverlay")?.addEventListener("click", (e) => {
    if (e.target.id === "paPanelOverlay") closePanels();
  });
}
var quickAddModule = null;
async function bindQuickAddButton(pageModule) {
  if (quickAddModule) return;
  const { QuickAddModule } = await import("./chunks/QuickAddModule-FY4WIENK.js");
  quickAddModule = new QuickAddModule(pageModule);
  quickAddModule.bindEvents();
}
async function initPageModule(pageModule) {
  await pageModule.load();
  bodyLoader.end();
  bodyLoader.reset();
  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      pageModule.render();
      pageModule.bindEvents();
      resolve();
    });
  });
}
async function ensureShell() {
  if (!shellInstance) {
    shellInstance = new ShellModule();
    await shellInstance.init().catch((err) => {
      console.warn("[main] shell init failed:", err);
    });
  }
}
function initAppChrome() {
  if (appChromeInitialized) {
    initSettingsNav();
    syncSidebarActiveNav();
    return;
  }
  appChromeInitialized = true;
  initSettingsNav();
  initSidebarNav();
  initSidebarGroupNav();
  initSidebarRailNav();
  initSidebarCollapse();
  initMobileHeaderSearch();
}
async function bootAuthPage(ModuleClass, page) {
  document.documentElement.classList.add("pa-auth-route");
  clearDomCache();
  initConfirmDialog();
  await initAuthAppearance();
  const pageModule = new ModuleClass();
  await pageModule.load();
  pageModule.render();
  pageModule.bindEvents();
  activePageModule = pageModule;
  window.__paDebug = { pageModule, page };
}
async function bootAppPage(ModuleClass, page) {
  bodyLoader.mount();
  bodyLoader.begin("Loading your data\u2026");
  const prefetchKeys = PREFETCH_BY_PAGE[page];
  if (prefetchKeys?.length) {
    await storage.hydrateFromPersistentCache(prefetchKeys);
    storage.prefetch(prefetchKeys);
  }
  clearDomCache();
  initConfirmDialog();
  const pageModule = new ModuleClass();
  const bootstrapPending = storage.isBootstrapPending();
  await Promise.all([initPageModule(pageModule), ensureShell()]);
  initAllPaSelects();
  bindGlobalPanelChrome();
  if (page === "dashboard") void bindQuickAddButton(pageModule);
  initAppChrome();
  activePageModule = pageModule;
  window.__paDebug = { pageModule, page };
  if (bootstrapPending) {
    void storage.waitForBootstrap().then(() => {
      if (activePageModule === pageModule && typeof pageModule.render === "function") {
        pageModule.render();
      }
    });
  }
}
async function runBoot() {
  bootstrapAppearanceFromCache();
  initPasswordToggles();
  const page = getCurrentPage();
  const ModuleClass = await loadPageModuleClass(page);
  if (!ModuleClass) {
    console.warn(`[main] no module registered for page "${page}"`);
    bodyLoader.reset();
    return;
  }
  try {
    if (AUTH_PAGES.has(page)) {
      await bootAuthPage(ModuleClass, page);
    } else {
      await bootAppPage(ModuleClass, page);
    }
  } catch (err) {
    if (!AUTH_PAGES.has(page)) {
      bodyLoader.end();
      bodyLoader.reset();
    }
    throw err;
  }
}
function teardownPortfolioApp(options = {}) {
  const keepShell = options.keepShell ?? false;
  if (activePageModule?.destroy) {
    try {
      activePageModule.destroy();
    } catch (err) {
      console.warn("[main] page teardown failed:", err);
    }
  }
  activePageModule = null;
  quickAddModule = null;
  if (!keepShell && shellInstance) {
    shellInstance.destroy();
    shellInstance = null;
    appChromeInitialized = false;
  }
  clearDomCache();
  bodyLoader.reset();
  closePanels();
}
function bootPortfolioApp() {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    const keepShell = Boolean(window.__paBooted);
    teardownPortfolioApp({ keepShell });
    window.__paBooted = true;
    if (typeof window.__paStartPrefetch === "function") {
      window.__paStartPrefetch(window.location.pathname);
    }
    await runBoot();
  })().catch((err) => {
    window.__paBooted = false;
    bodyLoader.reset();
    console.error("[main] fatal error during boot:", err);
    throw err;
  }).finally(() => {
    bootPromise = null;
  });
  return bootPromise;
}
window.__paBootPortfolioApp = bootPortfolioApp;
window.__paTeardownPortfolioApp = teardownPortfolioApp;
export {
  bootPortfolioApp,
  teardownPortfolioApp
};
