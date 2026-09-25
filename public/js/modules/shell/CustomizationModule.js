import { Module } from "../../core/Module.js";
import { $id, escapeHtml } from "../../utils/dom.js";
import { storage } from "../../core/StorageService.js";
import { closePanels, activateTab, registerPanel } from "./panels.js";
import { getThemeBackground, updateFavicon } from "../../utils/favicon.js";
import {
  buildCustomFontFromFile,
  MAX_CUSTOM_FONTS
} from "../../utils/customFonts.js";
import {
  APPEARANCE_DEFAULTS,
  ICON_PREVIEW_SIZES,
  VALID_FONT_SIZES,
  VALID_FONT_WEIGHTS,
  VALID_ICON_SIZES,
  VALID_SPACINGS,
  applyAppearanceSettings,
  getFontById,
  getFontGroups,
  normalizeAppearanceSettings,
  readAppearanceCache,
  writeAppearanceCache
} from "../../utils/appearanceCache.js";
const CUSTOM_STORE_KEY = "appearance_settings_v2";
class CustomizationModule extends Module {
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
}
export {
  CustomizationModule
};
