import {
  applyRoleBasedAccess,
  applyUserDisplay,
  renderPreviewAvatar,
  setCoverImage,
  syncSettingsNavTab
} from "./chunk-AR4ZME25.js";
import {
  setupAllPasswordToggles
} from "./chunk-5SJ7MEVC.js";
import {
  authService
} from "./chunk-MRY75FFO.js";
import {
  handleFileValidation,
  readFileAsDataUrl,
  readOptimizedImageDataUrl
} from "./chunk-QJVHZZLM.js";
import {
  SETTINGS_TABS,
  getLoginPath,
  getSettingsPageMeta,
  getSettingsTabFromPath,
  getSettingsTabPath
} from "./chunk-RDJAJ7S3.js";
import {
  closeAllCardMenus,
  requestConfirm,
  toggleCardMenu
} from "./chunk-WGXNH5AX.js";
import {
  $field,
  $id,
  $input,
  $select,
  Module,
  addNotification,
  asFormField,
  asHtmlButton,
  asHtmlInput,
  escapeHtml,
  eventBus,
  loadNotifications,
  requestBrowserNotificationPermission,
  showStatusToast,
  showToast,
  storage
} from "./chunk-OGR5OR6D.js";

// client/modules/settings/SecurityManager.ts
function getTotpQrSource(payload = {}) {
  const svg = payload.qrCodeSvg || (String(payload.qrCode || "").trim().startsWith("<svg") ? payload.qrCode : "");
  const dataUrl = payload.qrCode && !String(payload.qrCode).trim().startsWith("<svg") ? payload.qrCode : "";
  return { svg, dataUrl, hasQr: !!(svg || dataUrl) };
}
function setTotpQrDownloadVisible(visible) {
  const actions = $id("sec2faQrActions");
  const btn = $id("sec2faDownloadQrBtn");
  if (actions) actions.hidden = !visible;
  if (btn) btn.disabled = !visible;
}
function renderTotpQr(wrap, payload = {}) {
  if (!wrap) return;
  wrap.hidden = false;
  wrap.classList.remove("pa-sec-2fa-qr--svg");
  wrap.innerHTML = "";
  const { svg, dataUrl, hasQr } = getTotpQrSource(payload);
  setTotpQrDownloadVisible(hasQr);
  if (svg) {
    wrap.classList.add("pa-sec-2fa-qr--svg");
    wrap.innerHTML = svg;
    return;
  }
  if (dataUrl) {
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "Authenticator QR code";
    img.width = 180;
    img.height = 180;
    wrap.appendChild(img);
    return;
  }
  const secret = payload.secret || "";
  const uri = payload.uri || "";
  wrap.innerHTML = `
    <div class="pa-sec-2fa-fallback">
      ${secret ? `<code class="pa-sec-2fa-secret">${escapeHtml(secret)}</code>` : ""}
      ${uri ? `<p class="pa-text-mute fs-sm mt-8">If the QR code does not appear, add this key manually in your authenticator app.</p>` : ""}
    </div>`;
}
function triggerFileDownload(href, filename) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
function renderTotpQrToPngBlob(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not create QR image."));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not create QR image."));
      }, "image/png");
    };
    img.onerror = () => reject(new Error("Could not load QR image."));
    img.src = source;
  });
}
async function downloadTotpQr(payload = {}) {
  const { svg, dataUrl, hasQr } = getTotpQrSource(payload);
  if (!hasQr) throw new Error("No QR code available to download.");
  const filename = "authenticator-qr-code.png";
  if (svg) {
    const blob2 = await renderTotpQrToPngBlob(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    const url2 = URL.createObjectURL(blob2);
    triggerFileDownload(url2, filename);
    URL.revokeObjectURL(url2);
    return;
  }
  if (/^data:image\/(?:png|jpe?g|webp)/i.test(dataUrl)) {
    triggerFileDownload(dataUrl, filename);
    return;
  }
  const blob = await renderTotpQrToPngBlob(dataUrl);
  const url = URL.createObjectURL(blob);
  triggerFileDownload(url, filename);
  URL.revokeObjectURL(url);
}
var SecurityManager = class {
  constructor({ on, getProfile }) {
    this.on = on;
    this.getProfile = getProfile;
    this.state = {
      twoFactorEnabled: false,
      factorId: null,
      backupCodesRemaining: 0,
      pendingEnrollment: null,
      backupCodes: []
    };
    this._wired = false;
    this._enrolling = false;
  }
  wireDom() {
    if (this._wired) return;
    const panel = document.querySelector('.pa-tab-panel[data-content="security"]');
    if (!panel) return;
    const badge = panel.querySelector(".pa-badge");
    if (badge && !badge.id) badge.id = "sec2faStatusBadge";
    const backupWrap = panel.querySelector(".pa-backup-codes");
    if (backupWrap && !backupWrap.id) backupWrap.id = "secBackupCodes";
    const actionBtns = panel.querySelectorAll(".pa-security-card .pa-settings-actions .pa-btn-secondary");
    actionBtns.forEach((btn) => {
      const text = btn.textContent || "";
      if (text.includes("Regenerate") && !btn.id) btn.id = "secRegenBackupBtn";
      if (text.includes("Copy Codes") && !btn.id) btn.id = "secCopyBackupBtn";
    });
    if (!panel.querySelector("#sec2faModal")) {
      panel.insertAdjacentHTML("beforeend", `
        <div class="pa-confirm-overlay" id="sec2faModal" aria-hidden="true">
          <div class="pa-confirm-box pa-sec-2fa-modal" role="dialog" aria-modal="true" aria-labelledby="sec2faModalTitle">
            <div class="pa-confirm-title" id="sec2faModalTitle">Set up authenticator app</div>
            <div class="pa-confirm-text" id="sec2faModalText">Scan the QR code with your authenticator app, then enter the 6-digit code.</div>
            <div class="pa-sec-2fa-qr-wrap">
              <div class="pa-sec-2fa-qr" id="sec2faQrWrap" hidden></div>
              <div class="pa-sec-2fa-qr-actions" id="sec2faQrActions" hidden>
                <button type="button" class="pa-btn pa-btn-secondary pa-btn-sm" id="sec2faDownloadQrBtn">
                  <i class="ri-download-2-line"></i></button>
              </div>
            </div>
            <div class="pa-form-group mt-12">
              <label class="pa-form-label" for="sec2faCodeInput">Verification code</label>
              <input class="pa-form-input" id="sec2faCodeInput" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456" />
            </div>
            <div class="pa-confirm-actions mt-16">
              <button type="button" class="pa-btn pa-btn-cancel flex-1" id="sec2faModalCancel">Cancel</button>
              <button type="button" class="pa-btn pa-btn-primary flex-1" id="sec2faModalConfirm">Verify & Enable</button>
            </div>
          </div>
        </div>
        <div class="pa-confirm-overlay" id="secDisable2faModal" aria-hidden="true">
          <div class="pa-confirm-box" role="dialog" aria-modal="true" aria-labelledby="secDisable2faTitle">
            <div class="pa-confirm-title" id="secDisable2faTitle">Disable two-factor authentication</div>
            <div class="pa-confirm-text">Enter your current password to disable 2FA on this account.</div>
            <div class="pa-form-group mt-12">
              <label class="pa-form-label" for="secDisablePassword">Current password</label>
              <input class="pa-form-input" type="password" id="secDisablePassword" autocomplete="current-password" />
            </div>
            <div class="pa-form-group mt-8">
              <label class="pa-form-label" for="secDisableCode">Authenticator code (optional)</label>
              <input class="pa-form-input" id="secDisableCode" inputmode="numeric" maxlength="8" placeholder="123456" />
            </div>
            <div class="pa-confirm-actions mt-16">
              <button type="button" class="pa-btn pa-btn-cancel flex-1" id="secDisableCancel">Cancel</button>
              <button type="button" class="pa-btn pa-btn-primary pa-red flex-1" id="secDisableConfirm">Disable 2FA</button>
            </div>
          </div>
        </div>
        <div class="pa-confirm-overlay" id="secDeleteAccountModal" aria-hidden="true">
          <div class="pa-confirm-box" role="dialog" aria-modal="true" aria-labelledby="secDeleteAccountTitle">
            <div class="pa-confirm-title" id="secDeleteAccountTitle">Delete account</div>
            <div class="pa-confirm-text">This permanently deletes your account and cannot be undone. Type <strong>DELETE</strong> and enter your password.</div>
            <div class="pa-form-group mt-12">
              <label class="pa-form-label" for="secDeleteConfirmText">Confirmation</label>
              <input class="pa-form-input" id="secDeleteConfirmText" placeholder="DELETE" />
            </div>
            <div class="pa-form-group mt-8">
              <label class="pa-form-label" for="secDeletePassword">Current password</label>
              <input class="pa-form-input" type="password" id="secDeletePassword" autocomplete="current-password" />
            </div>
            <div class="pa-confirm-actions mt-16">
              <button type="button" class="pa-btn pa-btn-cancel flex-1" id="secDeleteCancel">Cancel</button>
              <button type="button" class="pa-btn pa-btn-primary pa-red flex-1" id="secDeleteConfirm">Delete Account</button>
            </div>
          </div>
        </div>`);
    } else if (!panel.querySelector("#sec2faQrActions")) {
      panel.querySelector("#sec2faQrWrap")?.insertAdjacentHTML("afterend", `
        <div class="pa-sec-2fa-qr-actions" id="sec2faQrActions" hidden>
          <button type="button" class="pa-btn pa-btn-secondary pa-btn-sm" id="sec2faDownloadQrBtn">
            <i class="ri-download-2-line"></i> Download QR code
          </button>
        </div>`);
    }
    this._wired = true;
    setupAllPasswordToggles(panel);
  }
  bindEvents() {
    this.wireDom();
    this.on($id("setup2faBtn"), "click", () => {
      void this.startEnrollment();
    });
    this.on($id("disable2faBtn"), "click", () => this.openModal("secDisable2faModal"));
    this.on($id("sec2faModalCancel"), "click", () => this.closeModal("sec2faModal"));
    this.on($id("secDisableCancel"), "click", () => this.closeModal("secDisable2faModal"));
    this.on($id("secDeleteCancel"), "click", () => this.closeModal("secDeleteAccountModal"));
    this.on($id("sec2faModalConfirm"), "click", () => {
      void this.confirmEnrollment();
    });
    this.on($id("sec2faDownloadQrBtn"), "click", () => {
      void this.downloadEnrollmentQr();
    });
    this.on($id("secDisableConfirm"), "click", () => {
      void this.disableTwoFactor();
    });
    this.on($id("secRegenBackupBtn"), "click", () => {
      void this.regenerateBackupCodes();
    });
    this.on($id("secCopyBackupBtn"), "click", () => this.copyBackupCodes());
    this.on($id("deleteAccountBtn"), "click", () => this.openModal("secDeleteAccountModal"));
    this.on($id("secDeleteConfirm"), "click", () => {
      void this.deleteAccount();
    });
  }
  openModal(id) {
    const el = $id(id);
    if (!el) return;
    el.classList.add("visible");
    el.setAttribute("aria-hidden", "false");
  }
  closeModal(id) {
    const el = $id(id);
    if (!el) return;
    el.classList.remove("visible");
    el.setAttribute("aria-hidden", "true");
  }
  async load() {
    this.wireDom();
    try {
      const payload = await authService.getSecuritySettings();
      this.state.twoFactorEnabled = !!payload?.mfa?.verified || !!payload?.settings?.twoFactorEnabled;
      this.state.factorId = payload?.mfa?.factorId || null;
      this.state.backupCodesRemaining = payload?.backupCodesRemaining || 0;
      this.render();
    } catch (err) {
      console.warn("[Security] settings load failed:", err);
    }
  }
  render() {
    const badge = $id("sec2faStatusBadge");
    const setupBtn = $id("setup2faBtn");
    const disableBtn = $id("disable2faBtn");
    const backupWrap = $id("secBackupCodes");
    const regenBtn = $id("secRegenBackupBtn");
    const copyBtn = $id("secCopyBackupBtn");
    if (badge) {
      if (this.state.twoFactorEnabled) {
        badge.className = "pa-badge pa-badge--success";
        badge.innerHTML = '<i class="ri-check-line"></i> Enabled';
      } else {
        badge.className = "pa-badge pa-badge--muted";
        badge.innerHTML = '<i class="ri-close-line"></i> Disabled';
      }
    }
    if (setupBtn) {
      setupBtn.textContent = "";
      setupBtn.innerHTML = this.state.twoFactorEnabled ? '<i class="ri-settings-line"></i> Reconfigure' : '<i class="ri-shield-check-line"></i> Enable 2FA';
    }
    if (disableBtn) disableBtn.disabled = !this.state.twoFactorEnabled;
    if (backupWrap) {
      if (this.state.backupCodes.length) {
        backupWrap.innerHTML = this.state.backupCodes.map((code) => `<span>${escapeHtml(code)}</span>`).join("");
      } else if (this.state.twoFactorEnabled) {
        backupWrap.innerHTML = `<span class="pa-text-mute">${this.state.backupCodesRemaining} unused backup codes on file</span>`;
      } else {
        backupWrap.innerHTML = '<span class="pa-text-mute">Enable 2FA to generate backup codes</span>';
      }
    }
    if (regenBtn) regenBtn.disabled = !this.state.twoFactorEnabled;
    if (copyBtn) copyBtn.disabled = !this.state.backupCodes.length;
  }
  async startEnrollment() {
    if (this._enrolling) return;
    this._enrolling = true;
    const setupBtn = $id("setup2faBtn");
    if (setupBtn) setupBtn.disabled = true;
    try {
      const payload = await authService.enrollMfa();
      this.state.pendingEnrollment = payload;
      const qrWrap = $id("sec2faQrWrap");
      const codeInput = $id("sec2faCodeInput");
      renderTotpQr(qrWrap, payload);
      if (codeInput) codeInput.value = "";
      this.openModal("sec2faModal");
    } catch (err) {
      showToast(err.message || "Could not start 2FA setup.", "danger");
    } finally {
      this._enrolling = false;
      if (setupBtn) setupBtn.disabled = false;
    }
  }
  async downloadEnrollmentQr() {
    const payload = this.state.pendingEnrollment;
    if (!payload) {
      showToast("No QR code available to download.", "info");
      return;
    }
    const btn = $id("sec2faDownloadQrBtn");
    if (btn) btn.disabled = true;
    try {
      await downloadTotpQr(payload);
      showToast("QR code downloaded. Open the image to scan it in your authenticator app.", "success");
    } catch (err) {
      showToast(err.message || "Could not download QR code.", "danger");
    } finally {
      if (btn && getTotpQrSource(payload).hasQr) btn.disabled = false;
    }
  }
  async confirmEnrollment() {
    const code = $id("sec2faCodeInput")?.value?.trim();
    const factorId = this.state.pendingEnrollment?.factorId;
    if (!factorId || !code) {
      showToast("Enter the verification code from your authenticator app.", "danger");
      return;
    }
    try {
      const payload = await authService.verifyMfaEnrollment(factorId, code);
      this.state.twoFactorEnabled = true;
      this.state.factorId = factorId;
      this.state.backupCodes = payload.backupCodes || [];
      this.state.backupCodesRemaining = this.state.backupCodes.length;
      this.state.pendingEnrollment = null;
      this.closeModal("sec2faModal");
      this.render();
      showToast("Two-factor authentication enabled!", "success");
      addNotification("Two-factor authentication was enabled", "ri-shield-check-line", {
        category: "system_alerts",
        linkPath: "/settings/security"
      });
    } catch (err) {
      showToast(err.message || "Invalid verification code.", "danger");
    }
  }
  async disableTwoFactor() {
    const currentPassword = $id("secDisablePassword")?.value || "";
    const code = $id("secDisableCode")?.value?.trim() || "";
    if (!currentPassword) {
      showToast("Enter your current password.", "danger");
      return;
    }
    try {
      await authService.unenrollMfa({ currentPassword, code });
      this.state.twoFactorEnabled = false;
      this.state.factorId = null;
      this.state.backupCodes = [];
      this.state.backupCodesRemaining = 0;
      this.closeModal("secDisable2faModal");
      this.render();
      showToast("Two-factor authentication disabled.", "success");
      addNotification("Two-factor authentication was disabled", "ri-shield-line", {
        category: "system_alerts",
        linkPath: "/settings/security"
      });
    } catch (err) {
      showToast(err.message || "Could not disable 2FA.", "danger");
    }
  }
  async regenerateBackupCodes() {
    const currentPassword = window.prompt("Enter your current password to regenerate backup codes:");
    if (!currentPassword) return;
    try {
      const payload = await authService.regenerateBackupCodes(currentPassword);
      this.state.backupCodes = payload.backupCodes || [];
      this.state.backupCodesRemaining = this.state.backupCodes.length;
      this.render();
      showToast("New backup codes generated. Copy and store them safely.", "success");
    } catch (err) {
      showToast(err.message || "Could not regenerate backup codes.", "danger");
    }
  }
  copyBackupCodes() {
    if (!this.state.backupCodes.length) {
      showToast("No backup codes to copy. Regenerate codes first.", "info");
      return;
    }
    const text = this.state.backupCodes.join("\n");
    navigator.clipboard?.writeText(text).then(() => {
      showToast("Backup codes copied to clipboard", "success");
    }).catch(() => {
      showToast("Could not copy backup codes", "danger");
    });
  }
  async deleteAccount() {
    const confirmText = $id("secDeleteConfirmText")?.value?.trim();
    const currentPassword = $id("secDeletePassword")?.value || "";
    if (confirmText !== "DELETE") {
      showToast("Type DELETE to confirm.", "danger");
      return;
    }
    if (!currentPassword) {
      showToast("Enter your current password.", "danger");
      return;
    }
    try {
      await authService.deleteAccount({ currentPassword, confirmText });
      this.closeModal("secDeleteAccountModal");
      showToast("Account deleted. Redirecting\u2026", "info");
      window.location.href = "/login";
    } catch (err) {
      showToast(err.message || "Could not delete account.", "danger");
    }
  }
};

// client/modules/settings/SystemManager.ts
var UNCHANGED_SECRET = "__UNCHANGED__";
var SECRET_FIELDS = /* @__PURE__ */ new Set([
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "SMTP_PASS"
]);
var ENV_FIELD_MAP = {
  NEXT_PUBLIC_SUPABASE_URL: "envNextPublicSupabaseUrl",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "envNextPublicSupabaseAnonKey",
  SUPABASE_SERVICE_ROLE_KEY: "envSupabaseServiceRoleKey",
  NEXT_PUBLIC_SITE_URL: "envNextPublicSiteUrl",
  CRON_SECRET: "envCronSecret",
  SMTP_HOST: "envSmtpHost",
  SMTP_PORT: "envSmtpPort",
  SMTP_USER: "envSmtpUser",
  SMTP_PASS: "envSmtpPass",
  SMTP_FROM: "envSmtpFrom",
  EMAIL_BRAND_NAME: "envEmailBrandName",
  EMAIL_BRAND_ROLE: "envEmailBrandRole",
  EMAIL_PORTFOLIO_LABEL: "envEmailPortfolioLabel",
  EMAIL_PORTFOLIO_URL: "envEmailPortfolioUrl",
  EMAIL_GITHUB_URL: "envEmailGithubUrl",
  EMAIL_LINKEDIN_URL: "envEmailLinkedinUrl"
};
var TABLE_META = {
  sites: { desc: "Site configuration records", category: "system", icon: "ri-global-line", tone: "tone-blue" },
  profiles: { desc: "User profile data", category: "auth", icon: "ri-user-line", tone: "tone-green" },
  site_settings: { desc: "Dashboard and site preferences", category: "system", icon: "ri-settings-3-line", tone: "tone-orange" },
  notification_preferences: { desc: "Per-user notification settings", category: "system", icon: "ri-notification-3-line", tone: "tone-purple" },
  security_settings: { desc: "Account security configuration", category: "auth", icon: "ri-shield-keyhole-line", tone: "tone-green" },
  two_factor_backup_codes: { desc: "MFA backup codes", category: "auth", icon: "ri-key-2-line", tone: "tone-green" },
  user_sessions: { desc: "Active user sessions", category: "auth", icon: "ri-login-circle-line", tone: "tone-green" },
  categories: { desc: "Project category definitions", category: "content", icon: "ri-folder-line", tone: "tone-orange" },
  media_assets: { desc: "Media files and assets", category: "content", icon: "ri-image-line", tone: "tone-purple" },
  projects: { desc: "Portfolio project entries", category: "content", icon: "ri-apps-line", tone: "tone-orange" },
  project_tags: { desc: "Project tag associations", category: "content", icon: "ri-price-tag-3-line", tone: "tone-teal" },
  project_gallery_images: { desc: "Project gallery images", category: "content", icon: "ri-gallery-line", tone: "tone-purple" },
  technologies: { desc: "Technology stack items", category: "content", icon: "ri-code-s-slash-line", tone: "tone-blue" },
  experience_entries: { desc: "Work experience records", category: "content", icon: "ri-briefcase-line", tone: "tone-teal" },
  testimonials: { desc: "Client testimonials", category: "content", icon: "ri-chat-quote-line", tone: "tone-green" },
  blog_posts: { desc: "Blog post content", category: "content", icon: "ri-article-line", tone: "tone-orange" },
  blog_post_tags: { desc: "Blog post tag links", category: "content", icon: "ri-hashtag", tone: "tone-teal" },
  blog_categories: { desc: "Blog post categories", category: "content", icon: "ri-bookmark-line", tone: "tone-purple" },
  contact_messages: { desc: "Inbound contact form messages", category: "communication", icon: "ri-mail-line", tone: "tone-blue" },
  contact_message_replies: { desc: "Replies to contact messages", category: "communication", icon: "ri-reply-line", tone: "tone-blue" },
  recent_activities: { desc: "Dashboard activity feed", category: "system", icon: "ri-history-line", tone: "tone-orange" },
  login_activity: { desc: "User login audit log", category: "auth", icon: "ri-fingerprint-line", tone: "tone-green" },
  tool_categories: { desc: "Tool category definitions", category: "content", icon: "ri-folder-settings-line", tone: "tone-teal" },
  tool_items: { desc: "Tools and utilities", category: "content", icon: "ri-tools-line", tone: "tone-orange" },
  user_notifications: { desc: "In-app user notifications", category: "system", icon: "ri-bell-line", tone: "tone-purple" },
  backup_snapshots: { desc: "Stores backup snapshot information", category: "system", icon: "ri-database-2-line", tone: "tone-blue" }
};
var CATEGORY_LABELS = {
  all: "All Categories",
  content: "Content",
  auth: "Auth & Security",
  system: "System",
  communication: "Communication"
};
function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return "\u2014";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const scaled = value / 1024 ** index;
  return `${scaled.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
function formatDateTime(value) {
  if (!value) return { date: "\u2014", time: "", relative: "" };
  try {
    const d = new Date(value);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffHours = Math.floor(diffMs / (1e3 * 60 * 60));
    let relative = "";
    if (diffHours < 1) relative = "Just now";
    else if (diffHours < 24) relative = `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    else {
      const days = Math.floor(diffHours / 24);
      relative = `${days} day${days === 1 ? "" : "s"} ago`;
    }
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      relative
    };
  } catch {
    return { date: "\u2014", time: "", relative: "" };
  }
}
function parseDownloadFilename(contentDisposition, fallback) {
  if (!contentDisposition) return fallback;
  const match = /filename="([^"]+)"/i.exec(contentDisposition);
  return match?.[1] || fallback;
}
function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
function getTableMeta(name) {
  const known = TABLE_META[name];
  if (known) return known;
  const label = name.replace(/_/g, " ");
  return {
    desc: `${label.charAt(0).toUpperCase()}${label.slice(1)} data`,
    category: "system",
    icon: "ri-table-line",
    tone: "tone-blue"
  };
}
function sizeBucket(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) return "small";
  if (value < 100 * 1024) return "small";
  if (value < 1024 * 1024) return "medium";
  return "large";
}
var SystemManager = class {
  constructor({ on, getProfile }) {
    this.on = on;
    this.getProfile = getProfile;
    this.state = {
      tables: [],
      history: [],
      selectedTables: /* @__PURE__ */ new Set(),
      focusedTable: null,
      tableFilter: "",
      categoryFilter: "all",
      sizeFilter: "all",
      viewMode: "grid",
      page: 1,
      pageSize: 10,
      exportRunning: false,
      env: null
    };
    this._bound = false;
  }
  bindEvents() {
    if (this._bound) return;
    this._bound = true;
    const refreshBtn = $id("systemBackupRefreshBtn");
    if (refreshBtn) this.on(refreshBtn, "click", () => {
      void this.loadTables();
    });
    const searchInput = $id("systemTableSearch");
    if (searchInput) {
      this.on(searchInput, "input", (e) => {
        const target = e.target;
        this.state.tableFilter = target.value.trim().toLowerCase();
        this.state.page = 1;
        this.renderTables();
      });
    }
    const categoryFilter = $id("systemTableCategoryFilter");
    if (categoryFilter) {
      this.on(categoryFilter, "change", (e) => {
        const target = e.target;
        this.state.categoryFilter = target.value;
        this.state.page = 1;
        this.renderTables();
      });
    }
    const sizeFilter = $id("systemTableSizeFilter");
    if (sizeFilter) {
      this.on(sizeFilter, "change", (e) => {
        const target = e.target;
        this.state.sizeFilter = target.value;
        this.state.page = 1;
        this.renderTables();
      });
    }
    const selectAllBtn = $id("systemTableSelectAll");
    if (selectAllBtn) this.on(selectAllBtn, "click", () => this.selectAllVisibleTables());
    const clearAllBtn = $id("systemTableClearAll");
    if (clearAllBtn) this.on(clearAllBtn, "click", () => this.clearSelectedTables());
    const masterCheck = $id("systemTableMasterCheck");
    if (masterCheck) {
      this.on(masterCheck, "change", (e) => {
        const target = e.target;
        if (target.checked) this.selectAllVisibleTables();
        else this.clearSelectedTables();
      });
    }
    const gridViewBtn = $id("systemTableGridViewBtn");
    if (gridViewBtn) this.on(gridViewBtn, "click", () => this.setViewMode("grid"));
    const listViewBtn = $id("systemTableListViewBtn");
    if (listViewBtn) this.on(listViewBtn, "click", () => this.setViewMode("list"));
    const pageSizeSelect = $id("systemTablePageSize");
    if (pageSizeSelect) {
      this.on(pageSizeSelect, "change", (e) => {
        const target = e.target;
        this.state.pageSize = parseInt(target.value, 10) || 10;
        this.state.page = 1;
        this.renderTables();
      });
    }
    const exportSqlBtn = $id("systemExportSqlBtn");
    if (exportSqlBtn) this.on(exportSqlBtn, "click", () => {
      void this.exportSqlBackup();
    });
    const exportSchemaBtn = $id("systemExportSchemaBtn");
    if (exportSchemaBtn) this.on(exportSchemaBtn, "click", () => {
      void this.downloadSchemaGuide();
    });
    const bulkExportSqlBtn = $id("systemBulkExportSqlBtn");
    if (bulkExportSqlBtn) this.on(bulkExportSqlBtn, "click", () => {
      void this.exportSqlBackup();
    });
    const bulkExportSchemaBtn = $id("systemBulkExportSchemaBtn");
    if (bulkExportSchemaBtn) this.on(bulkExportSchemaBtn, "click", () => {
      void this.downloadSchemaGuide();
    });
    const gridBody = $id("systemTableGridBody");
    if (gridBody) {
      this.on(gridBody, "change", (e) => {
        const target = e.target;
        const checkbox = target.closest("[data-table-select]");
        if (!checkbox || checkbox.tagName !== "INPUT") return;
        e.stopPropagation();
        this.toggleTableSelection(checkbox.dataset.tableName, checkbox.checked);
        this.focusTable(checkbox.dataset.tableName);
      });
      this.on(gridBody, "click", (e) => {
        const target = e.target;
        const menuItem = target.closest("[data-table-action]");
        if (menuItem) {
          e.preventDefault();
          e.stopPropagation();
          closeAllCardMenus();
          this.handleTableAction(menuItem.dataset.tableName, menuItem.dataset.tableAction);
          return;
        }
        const menuBtn = target.closest("[data-table-menu-btn]");
        if (menuBtn) {
          e.preventDefault();
          e.stopPropagation();
          const menu = menuBtn.parentElement?.querySelector(".pa-card-menu");
          if (menu) toggleCardMenu(menu, menuBtn);
          return;
        }
        const selectBox = target.closest("[data-table-select]");
        if (selectBox) {
          e.stopPropagation();
          const name = selectBox.dataset.tableName;
          this.toggleTableSelection(name, !this.state.selectedTables.has(name));
          this.focusTable(name);
          return;
        }
        if (target.closest(".pa-bkp-table-card-actions, .pa-card-menu")) return;
        const card = target.closest("[data-table-card]");
        if (!card) return;
        this.checkTable(card.dataset.tableName);
      });
      this.on(gridBody, "keydown", (e) => {
        const event = e;
        const target = event.target;
        const selectBox = target.closest("[data-table-select]");
        if (!selectBox || selectBox.tagName === "INPUT") return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const name = selectBox.dataset.tableName;
        this.toggleTableSelection(name, !this.state.selectedTables.has(name));
        this.focusTable(name);
      });
    }
    const tableList = $id("systemTableListBody");
    if (tableList) {
      this.on(tableList, "change", (e) => {
        const target = e.target;
        const checkbox = target.closest("[data-table-select]");
        if (!checkbox || checkbox.tagName !== "INPUT") return;
        e.stopPropagation();
        this.toggleTableSelection(checkbox.dataset.tableName, checkbox.checked);
        this.focusTable(checkbox.dataset.tableName);
      });
      this.on(tableList, "click", (e) => {
        const target = e.target;
        const row = target.closest("[data-table-row]");
        if (!row) return;
        const actionBtn = target.closest("[data-table-action]");
        if (actionBtn) {
          e.preventDefault();
          e.stopPropagation();
          this.handleTableAction(actionBtn.dataset.tableName, actionBtn.dataset.tableAction);
          return;
        }
        if (target.closest("[data-table-select]")) return;
        this.checkTable(row.dataset.tableName);
      });
    }
    const historyBody = $id("systemExportHistoryBody");
    if (historyBody) {
      this.on(historyBody, "click", (e) => {
        const target = e.target;
        const deleteBtn = target.closest('[data-export-action="delete"]');
        if (!deleteBtn) return;
        e.preventDefault();
        this.confirmDeleteExport(deleteBtn.dataset.exportId);
      });
    }
    const viewStructureBtn = $id("systemDbViewStructureBtn");
    if (viewStructureBtn) this.on(viewStructureBtn, "click", () => this.viewTableStructure());
    const exportTableBtn = $id("systemDbExportTableBtn");
    if (exportTableBtn) {
      this.on(exportTableBtn, "click", () => {
        if (this.state.focusedTable) void this.exportSingleTable(this.state.focusedTable);
      });
    }
    const sqlEditorBtn = $id("systemDbSqlEditorBtn");
    if (sqlEditorBtn) {
      this.on(sqlEditorBtn, "click", () => {
        if (this.state.focusedTable) this.copySqlQuery(this.state.focusedTable);
      });
    }
    const reloadBtn = $id("systemEnvReloadBtn");
    if (reloadBtn) this.on(reloadBtn, "click", () => {
      void this.loadEnvironment();
    });
    const form = $id("systemEnvForm");
    if (form) {
      this.on(form, "submit", (e) => {
        e.preventDefault();
        void this.saveEnvironment();
      });
    }
    setupAllPasswordToggles($id("systemEnvForm"));
  }
  setViewMode(mode) {
    this.state.viewMode = mode;
    this.syncViewMode();
    this.renderTables();
  }
  syncViewMode() {
    const mode = this.state.viewMode;
    const gridBtn = $id("systemTableGridViewBtn");
    const listBtn = $id("systemTableListViewBtn");
    const gridWrap = $id("systemTableGridWrap");
    const listWrap = $id("systemTableListWrap");
    if (gridBtn) gridBtn.classList.toggle("active", mode === "grid");
    if (listBtn) listBtn.classList.toggle("active", mode === "list");
    if (gridWrap) {
      gridWrap.hidden = mode !== "grid";
      gridWrap.classList.toggle("is-active-view", mode === "grid");
    }
    if (listWrap) {
      listWrap.hidden = mode !== "list";
      listWrap.classList.toggle("is-active-view", mode === "list");
    }
  }
  async ensureAdminAccess() {
    const profile = await this.getProfile?.();
    if (!profile) return false;
    if (!["super_admin", "admin"].includes(profile.role)) {
      showToast("Only administrators can access system settings.", "danger");
      return false;
    }
    return true;
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
  async load() {
    if (!await this.ensureAdminAccess()) {
      this.renderAccessDenied();
      return;
    }
    this.bindEvents();
    this.syncViewMode();
    this.populateCategoryFilter();
    await Promise.all([
      this.loadTables(),
      this.loadEnvironment()
    ]);
  }
  populateCategoryFilter() {
    const select = $id("systemTableCategoryFilter");
    if (!select) return;
    const options = Object.entries(CATEGORY_LABELS).map(
      ([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`
    );
    select.innerHTML = options.join("");
  }
  renderAccessDenied() {
    const panel = document.querySelector('.pa-tab-panel[data-content="system"]');
    if (!panel) return;
    panel.innerHTML = '<div class="pa-session-empty">You do not have permission to view system settings.</div>';
  }
  getVisibleTables() {
    const filter = this.state.tableFilter;
    const category = this.state.categoryFilter;
    const size = this.state.sizeFilter;
    return this.state.tables.filter((table) => {
      const meta = getTableMeta(table.name);
      if (filter && !table.name.toLowerCase().includes(filter) && !meta.desc.toLowerCase().includes(filter)) {
        return false;
      }
      if (category !== "all" && meta.category !== category) return false;
      if (size !== "all" && sizeBucket(table.sizeBytes) !== size) return false;
      return true;
    });
  }
  getPageTables() {
    const visible = this.getVisibleTables();
    const start = (this.state.page - 1) * this.state.pageSize;
    return { visible, pageItems: visible.slice(start, start + this.state.pageSize), totalPages: Math.max(1, Math.ceil(visible.length / this.state.pageSize)) };
  }
  getTotalSizeBytes() {
    return this.state.tables.reduce((sum, table) => sum + (Number(table.sizeBytes) || 0), 0);
  }
  getSelectedSizeBytes() {
    return this.state.tables.filter((table) => this.state.selectedTables.has(table.name)).reduce((sum, table) => sum + (Number(table.sizeBytes) || 0), 0);
  }
  selectAllVisibleTables() {
    for (const table of this.getVisibleTables()) {
      this.state.selectedTables.add(table.name);
    }
    this.renderTables();
  }
  clearSelectedTables() {
    this.state.selectedTables.clear();
    this.renderTables();
  }
  toggleTableSelection(name, selected) {
    if (!name) return;
    if (selected) this.state.selectedTables.add(name);
    else this.state.selectedTables.delete(name);
    this.renderTables();
  }
  focusTable(name) {
    if (!name) return;
    this.state.focusedTable = name;
    this.renderTables();
    this.renderSidebar();
  }
  checkTable(name) {
    if (!name) return;
    this.state.selectedTables.add(name);
    this.focusTable(name);
  }
  renderTableCheckbox(tableName, selected, mode = "grid") {
    const safeName = escapeHtml(tableName);
    if (mode === "list") {
      return `<input type="checkbox" class="pa-msg-bulk-checkbox" data-table-select data-table-name="${safeName}" ${selected ? "checked" : ""} aria-label="Include ${safeName}" />`;
    }
    return `<div class="pa-select-checkbox${selected ? " selected" : ""}" data-table-select data-table-name="${safeName}" role="checkbox" aria-checked="${selected}" aria-label="Include ${safeName}" tabindex="0"><i class="${selected ? "ri-checkbox-fill" : "ri-checkbox-blank-line"}"></i></div>`;
  }
  handleTableAction(name, action) {
    if (!name || !action) return;
    if (action === "focus") this.focusTable(name);
    else if (action === "export") void this.exportSingleTable(name);
    else if (action === "sql") this.copySqlQuery(name);
  }
  renderTableCardMenu(tableName) {
    const safeName = escapeHtml(tableName);
    return `<div class="pa-bkp-table-card-actions pa-card-actions">
      <button type="button" class="pa-action-btn pa-action-more" data-table-menu-btn data-table-name="${safeName}" title="More options" aria-label="More options for ${safeName}"><i class="ri-more-2-fill"></i></button>
      <div class="pa-card-menu" data-table-name="${safeName}">
        <div class="pa-card-menu-item" data-table-action="focus" data-table-name="${safeName}"><i class="ri-eye-line"></i> View Details</div>
        <div class="pa-card-menu-item" data-table-action="sql" data-table-name="${safeName}"><i class="ri-code-line"></i> Copy SQL Query</div>
        <div class="pa-card-menu-item" data-table-action="export" data-table-name="${safeName}"><i class="ri-download-2-line"></i> Export Data</div>
      </div>
    </div>`;
  }
  updateSelectionMeta() {
    const countEl = $id("systemTableSelectedCount");
    const exportBtn = $id("systemExportSqlBtn");
    const bulkBar = $id("systemTableBulkBar");
    const bulkCount = $id("systemTableBulkCount");
    const bulkSize = $id("systemTableBulkSize");
    const bulkExportSql = $id("systemBulkExportSqlBtn");
    const total = this.state.tables.length;
    const selected = this.state.selectedTables.size;
    if (countEl) {
      countEl.textContent = `${selected} of ${total} table${total === 1 ? "" : "s"} selected`;
    }
    if (exportBtn) {
      exportBtn.disabled = this.state.exportRunning || selected === 0;
    }
    if (bulkExportSql) {
      bulkExportSql.disabled = this.state.exportRunning || selected === 0;
    }
    if (bulkBar) {
      bulkBar.hidden = selected === 0;
    }
    if (bulkCount) {
      bulkCount.textContent = `${selected} table${selected === 1 ? "" : "s"} selected`;
    }
    if (bulkSize) {
      bulkSize.textContent = `Total size: ${formatBytes(this.getSelectedSizeBytes())} (approx.)`;
    }
  }
  renderStats() {
    const tables = this.state.tables;
    const totalSize = this.getTotalSizeBytes();
    const setText = (id, text) => {
      const el = $id(id);
      if (el) el.textContent = text;
    };
    setText("systemTableCount", String(tables.length));
    setText("systemDbOverviewTables", String(tables.length));
    setText("systemDbOverviewSize", formatBytes(totalSize));
    setText("systemDbOverviewAvg", tables.length && totalSize > 0 ? formatBytes(totalSize / tables.length) : "\u2014");
  }
  async loadTables() {
    const gridBody = $id("systemTableGridBody");
    const listBody = $id("systemTableListBody");
    const historyBody = $id("systemExportHistoryBody");
    const activityBody = $id("systemDbRecentActivity");
    const loadingGrid = '<div class="pa-bkp-loading"><span class="pa-spinner"></span> Loading tables\u2026</div>';
    if (gridBody) gridBody.innerHTML = loadingGrid;
    if (listBody) {
      listBody.innerHTML = `<tr><td colspan="7">${loadingGrid}</td></tr>`;
    }
    if (historyBody) {
      historyBody.innerHTML = '<div class="pa-bkp-loading"><span class="pa-spinner"></span> Loading export history\u2026</div>';
    }
    if (activityBody) {
      activityBody.innerHTML = '<div class="pa-bkp-loading"><span class="pa-spinner"></span> Loading\u2026</div>';
    }
    try {
      const payload = await this.fetchJson("/api/admin/database-backup");
      this.state.tables = payload.tables || [];
      this.state.history = payload.history || [];
      if (this.state.focusedTable && !this.state.tables.find((t) => t.name === this.state.focusedTable)) {
        this.state.focusedTable = null;
      }
      for (const name of [...this.state.selectedTables]) {
        if (!this.state.tables.find((t) => t.name === name)) {
          this.state.selectedTables.delete(name);
        }
      }
      this.renderStats();
      this.renderTables();
      this.renderExportHistory();
      this.renderSidebarActivity();
      this.renderSidebar();
      this.setBackupStatus("");
    } catch (err) {
      const errorHtml = `<div class="pa-bkp-empty"><i class="ri-error-warning-line"></i><div class="pa-bkp-empty-title">Could not load tables</div><div class="pa-bkp-empty-text">${escapeHtml(err.message || "Please try again.")}</div></div>`;
      if (gridBody) gridBody.innerHTML = errorHtml;
      if (listBody) listBody.innerHTML = `<tr><td colspan="7">${errorHtml}</td></tr>`;
    }
  }
  renderTables() {
    this.syncViewMode();
    if (this.state.viewMode === "grid") {
      this.renderGridView();
    } else {
      this.renderListView();
    }
    this.updateSelectionMeta();
    this.updateMasterCheckbox();
    this.renderSidebar();
  }
  renderGridView() {
    const body = $id("systemTableGridBody");
    if (!body) return;
    const { visible } = this.getPageTables();
    if (!visible.length) {
      body.innerHTML = `<div class="pa-bkp-empty"><div class="pa-bkp-empty-title">${this.state.tables.length ? "No tables match your filters" : "No tables found"}</div></div>`;
      return;
    }
    body.innerHTML = visible.map((table) => {
      const meta = getTableMeta(table.name);
      const selected = this.state.selectedTables.has(table.name);
      const focused = this.state.focusedTable === table.name;
      return `<div class="pa-bkp-table-card${selected ? " is-selected pa-selected" : ""}${focused ? " is-focused" : ""}" data-table-card data-table-name="${escapeHtml(table.name)}" role="button" tabindex="0">
        ${this.renderTableCheckbox(table.name, selected, "grid")}
        <div class="pa-bkp-table-card-icon ${meta.tone}"><i class="${meta.icon}"></i></div>
        <div class="pa-bkp-table-card-name">${escapeHtml(table.name)}</div>
        <div class="pa-bkp-table-card-desc">${escapeHtml(meta.desc)}</div>
        <div class="pa-bkp-table-card-foot">
          <div class="pa-bkp-table-card-foot-meta">
            <span><i class="ri-list-check-2"></i> ${Number(table.rowCount || 0).toLocaleString()} rows</span>
            <span><i class="ri-hard-drive-2-line"></i> ${escapeHtml(formatBytes(table.sizeBytes))}</span>
          </div>
          ${this.renderTableCardMenu(table.name)}
        </div>
      </div>`;
    }).join("");
  }
  renderListView() {
    const body = $id("systemTableListBody");
    if (!body) return;
    const { visible, pageItems, totalPages } = this.getPageTables();
    if (this.state.page > totalPages) {
      this.state.page = totalPages;
    }
    if (!visible.length) {
      body.innerHTML = `<tr><td colspan="7"><div class="pa-bkp-empty"><div class="pa-bkp-empty-title">${this.state.tables.length ? "No tables match your filters" : "No tables found"}</div></div></td></tr>`;
      this.renderPagination(0, 1);
      return;
    }
    body.innerHTML = pageItems.map((table) => {
      const meta = getTableMeta(table.name);
      const selected = this.state.selectedTables.has(table.name);
      const focused = this.state.focusedTable === table.name;
      return `<tr class="pa-act-row pa-bkp-data-row${selected ? " selected" : ""}${focused ? " is-focused" : ""}" data-table-row data-table-name="${escapeHtml(table.name)}">
        <td class="pa-bkp-col-check">
          ${this.renderTableCheckbox(table.name, selected, "list")}
        </td>
        <td>
          <div class="pa-bkp-data-name">
            <span class="pa-bkp-table-card-icon ${meta.tone}"><i class="${meta.icon}"></i></span>
            <span class="pa-bkp-table-name">${escapeHtml(table.name)}</span>
          </div>
        </td>
        <td class="pa-bkp-data-desc">${escapeHtml(meta.desc)}</td>
        <td class="pa-bkp-col-num">${Number(table.rowCount || 0).toLocaleString()}</td>
        <td class="pa-bkp-col-num">${escapeHtml(formatBytes(table.sizeBytes))}</td>
        <td><span class="pa-act-type-badge"><i class="ri-database-2-line"></i> PostgreSQL</span></td>
        <td class="pa-bkp-col-actions">
          <div class="pa-bkp-row-actions">
            <button type="button" class="pa-bkp-card-action" data-table-action="focus" data-table-name="${escapeHtml(table.name)}" title="View details" aria-label="View ${escapeHtml(table.name)}"><i class="ri-eye-line"></i></button>
            <button type="button" class="pa-bkp-card-action" data-table-action="export" data-table-name="${escapeHtml(table.name)}" title="Export data" aria-label="Export ${escapeHtml(table.name)}"><i class="ri-download-2-line"></i></button>
            <button type="button" class="pa-bkp-card-action" data-table-action="sql" data-table-name="${escapeHtml(table.name)}" title="Copy SQL" aria-label="Copy SQL for ${escapeHtml(table.name)}"><i class="ri-code-line"></i></button>
          </div>
        </td>
      </tr>`;
    }).join("");
    this.renderPagination(visible.length, totalPages);
  }
  renderPagination(totalItems, totalPages) {
    const btnsWrap = $id("systemTablePaginationBtns");
    const info = $id("systemTablePaginationInfo");
    const page = this.state.page;
    const pageSize = this.state.pageSize;
    if (!btnsWrap || !info) return;
    if (totalItems === 0) {
      btnsWrap.innerHTML = "";
      info.textContent = "Showing 0 of 0";
      return;
    }
    let html = `<div class="pa-page-nav ${page === 1 ? "disabled" : ""}" id="systemTablePagePrev" role="button" aria-label="Previous page"><i class="ri-arrow-left-s-line"></i></div>`;
    let lastShown = 0;
    for (let p = 1; p <= totalPages; p++) {
      const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
      if (!show) continue;
      if (p - lastShown > 1) html += '<span class="pa-bkp-page-ellipsis">\u2026</span>';
      html += `<button type="button" class="pa-page-btn ${p === page ? "active" : ""}" data-page="${p}">${p}</button>`;
      lastShown = p;
    }
    html += `<div class="pa-page-nav ${page === totalPages ? "disabled" : ""}" id="systemTablePageNext" role="button" aria-label="Next page"><i class="ri-arrow-right-s-line"></i></div>`;
    btnsWrap.innerHTML = html;
    const startN = (page - 1) * pageSize + 1;
    const endN = Math.min(page * pageSize, totalItems);
    info.textContent = `Showing ${startN} to ${endN} of ${totalItems}`;
    btnsWrap.querySelectorAll(".pa-page-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.state.page = parseInt(btn.dataset.page, 10);
        this.renderTables();
      });
    });
    const prev = $id("systemTablePagePrev");
    const next = $id("systemTablePageNext");
    if (prev && page > 1) {
      prev.addEventListener("click", () => {
        this.state.page -= 1;
        this.renderTables();
      });
    }
    if (next && page < totalPages) {
      next.addEventListener("click", () => {
        this.state.page += 1;
        this.renderTables();
      });
    }
  }
  updateMasterCheckbox() {
    const master = $id("systemTableMasterCheck");
    if (!master) return;
    const visible = this.getVisibleTables();
    if (!visible.length) {
      master.checked = false;
      master.indeterminate = false;
      return;
    }
    const selectedVisible = visible.filter((table) => this.state.selectedTables.has(table.name)).length;
    master.checked = selectedVisible === visible.length;
    master.indeterminate = selectedVisible > 0 && selectedVisible < visible.length;
  }
  renderSidebar() {
    const panel = $id("systemDbDetailPanel");
    const chart = $id("systemDbSizeChart");
    const viewBtn = $id("systemDbViewStructureBtn");
    const exportBtn = $id("systemDbExportTableBtn");
    const sqlBtn = $id("systemDbSqlEditorBtn");
    const name = this.state.focusedTable;
    const table = name ? this.state.tables.find((t) => t.name === name) : null;
    const hasTable = !!table;
    if (viewBtn) viewBtn.disabled = !hasTable;
    if (exportBtn) exportBtn.disabled = !hasTable || this.state.exportRunning;
    if (sqlBtn) sqlBtn.disabled = !hasTable;
    if (!panel) return;
    if (!table) {
      panel.innerHTML = `<div class="pa-bkp-detail-empty"><i class="ri-cursor-line"></i><div>Select a table to view details</div></div>`;
      if (chart) {
        chart.innerHTML = `<div class="pa-bkp-detail-empty"><i class="ri-pie-chart-line"></i><div>Select a table to see size share</div></div>`;
      }
      return;
    }
    const meta = getTableMeta(table.name);
    const totalSize = this.getTotalSizeBytes();
    const pct = totalSize > 0 && table.sizeBytes ? Math.min(100, Number(table.sizeBytes) / totalSize * 100) : 0;
    const selected = this.state.selectedTables.has(table.name);
    panel.innerHTML = `<div class="pa-bkp-detail-hero">
      <div class="pa-bkp-detail-icon ${meta.tone}"><i class="${meta.icon}"></i></div>
      <div>
        <div class="pa-bkp-detail-name">${escapeHtml(table.name)}</div>
        ${selected ? '<span class="pa-bkp-status success">Selected</span>' : ""}
        <div class="pa-bkp-detail-desc">${escapeHtml(meta.desc)}</div>
      </div>
    </div>
    <div class="pa-bkp-detail-meta">
      <div class="pa-bkp-detail-meta-item"><div class="pa-bkp-detail-meta-label">Rows</div><div class="pa-bkp-detail-meta-value">${Number(table.rowCount || 0).toLocaleString()}</div></div>
      <div class="pa-bkp-detail-meta-item"><div class="pa-bkp-detail-meta-label">Size</div><div class="pa-bkp-detail-meta-value">${escapeHtml(formatBytes(table.sizeBytes))}</div></div>
      <div class="pa-bkp-detail-meta-item"><div class="pa-bkp-detail-meta-label">Type</div><div class="pa-bkp-detail-meta-value">PostgreSQL</div></div>
      <div class="pa-bkp-detail-meta-item"><div class="pa-bkp-detail-meta-label">Category</div><div class="pa-bkp-detail-meta-value">${escapeHtml(CATEGORY_LABELS[meta.category] || meta.category)}</div></div>
    </div>`;
    if (chart) {
      chart.innerHTML = `<div class="pa-bkp-donut" style="--pct: ${pct.toFixed(1)}">
        <div class="pa-bkp-donut-inner">${pct.toFixed(1)}%</div>
      </div>
      <div class="pa-bkp-size-chart-meta">
        <strong>${escapeHtml(table.name)}</strong> is ${pct.toFixed(1)}% of total database size (${escapeHtml(formatBytes(table.sizeBytes))} of ${escapeHtml(formatBytes(totalSize))}).
      </div>`;
    }
  }
  renderSidebarActivity() {
    const body = $id("systemDbRecentActivity");
    if (!body) return;
    const history = this.state.history.slice(0, 5);
    if (!history.length) {
      body.innerHTML = `<div class="pa-bkp-empty"><div class="pa-bkp-empty-title">No activity yet</div><div class="pa-bkp-empty-text">Exports and backups will appear here.</div></div>`;
      return;
    }
    body.innerHTML = history.map((item) => {
      const { relative } = formatDateTime(item.created_at);
      const meta = item.record_counts?._meta || {};
      const exportKind = meta.exportKind === "schema" ? "Schema guide exported" : "Backup completed";
      const icon = meta.exportKind === "schema" ? "ri-file-code-line" : "ri-check-line";
      const tone = meta.exportKind === "schema" ? "warning" : "success";
      return `<div class="pa-bkp-history-item pa-bkp-activity-item">
        <div class="pa-bkp-history-main">
          <div class="pa-bkp-history-name"><i class="${icon} pa-bkp-status ${tone}"></i> ${escapeHtml(exportKind)}</div>
          <div class="pa-bkp-history-meta"><span>${escapeHtml(item.filename)}</span><span>${escapeHtml(relative)}</span></div>
        </div>
      </div>`;
    }).join("");
  }
  viewTableStructure() {
    const table = this.state.tables.find((t) => t.name === this.state.focusedTable);
    if (!table) return;
    const meta = getTableMeta(table.name);
    requestConfirm({
      title: `Structure: ${table.name}`,
      message: `<div class="pa-bkp-structure-preview">
        <p><strong>Table:</strong> ${escapeHtml(table.name)}</p>
        <p><strong>Description:</strong> ${escapeHtml(meta.desc)}</p>
        <p><strong>Rows:</strong> ${Number(table.rowCount || 0).toLocaleString()}</p>
        <p><strong>Size:</strong> ${escapeHtml(formatBytes(table.sizeBytes))}</p>
        <p><strong>Type:</strong> PostgreSQL (public schema)</p>
        <p class="pa-text-mute fs-sm mt-10">Download the full schema &amp; setup guide for complete DDL, indexes, and RLS policies.</p>
      </div>`,
      confirmLabel: "Download Schema Guide",
      iconClass: "ri-database-2-line",
      onConfirm: () => {
        void this.downloadSchemaGuide();
      }
    });
  }
  copySqlQuery(name) {
    if (!name) return;
    const sql = `SELECT * FROM public.${name} LIMIT 100;`;
    navigator.clipboard.writeText(sql).then(() => {
      showStatusToast("SQL query copied to clipboard.", "success");
    }).catch(() => {
      showToast("Could not copy to clipboard.", "danger");
    });
  }
  async exportSingleTable(name) {
    if (!name || this.state.exportRunning) return;
    if (!await this.ensureAdminAccess()) return;
    await this.exportSqlBackup([name]);
  }
  renderExportHistory() {
    const body = $id("systemExportHistoryBody");
    const countEl = $id("systemExportHistoryCount");
    const history = this.state.history;
    if (countEl) {
      countEl.textContent = `${history.length} item${history.length === 1 ? "" : "s"}`;
    }
    if (!body) return;
    if (!history.length) {
      body.innerHTML = `<div class="pa-bkp-empty"><div class="pa-bkp-empty-title">No exports yet</div><div class="pa-bkp-empty-text">SQL downloads will appear here as metadata-only audit entries.</div></div>`;
      return;
    }
    body.innerHTML = history.map((item) => {
      const { date, time } = formatDateTime(item.created_at);
      const meta = item.record_counts?._meta || {};
      const exportKind = meta.exportKind === "schema" ? "Schema guide" : "SQL data";
      const tableEntries = item.record_counts && typeof item.record_counts === "object" ? Object.entries(item.record_counts).filter(([key]) => key !== "_meta") : [];
      const tableSummary = exportKind === "SQL data" && tableEntries.length ? `${tableEntries.length} tables \xB7 ${tableEntries.reduce((sum, [, count]) => sum + Number(count || 0), 0).toLocaleString()} rows` : exportKind;
      return `<div class="pa-bkp-history-item">
        <div class="pa-bkp-history-main">
          <div class="pa-bkp-history-name">${escapeHtml(item.filename)}</div>
          <div class="pa-bkp-history-meta">
            <span><i class="ri-file-code-line"></i> ${escapeHtml(exportKind)}</span>
            <span><i class="ri-hard-drive-2-line"></i> ${escapeHtml(formatBytes(item.size_bytes))}</span>
            <span><i class="ri-calendar-line"></i> ${escapeHtml(date)} \xB7 ${escapeHtml(time)}</span>
          </div>
          <div class="pa-bkp-history-sub">${escapeHtml(tableSummary)}</div>
        </div>
        <button type="button" class="pa-bkp-card-action pa-bkp-card-action--danger" data-export-action="delete" data-export-id="${escapeHtml(item.id)}" title="Remove export log" aria-label="Remove ${escapeHtml(item.filename)}"><i class="ri-delete-bin-line"></i></button>
      </div>`;
    }).join("");
    this.renderSidebarActivity();
  }
  confirmDeleteExport(id) {
    const item = this.state.history.find((entry) => entry.id === id);
    if (!item) return;
    requestConfirm({
      title: "Remove export log?",
      message: `This removes the audit entry for <strong>${escapeHtml(item.filename)}</strong>. Downloaded SQL files on your computer are not affected.`,
      confirmLabel: "Remove Entry",
      iconClass: "ri-delete-bin-line",
      danger: true,
      onConfirm: () => this.deleteExportRecord(id)
    });
  }
  async deleteExportRecord(id) {
    if (!await this.ensureAdminAccess()) return;
    try {
      await this.fetchJson(`/api/admin/database-backup?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      showStatusToast("Export log removed.", "success");
      await this.loadTables();
    } catch (err) {
      showToast(err.message || "Could not remove export log.", "danger");
    }
  }
  setBackupStatus(message, tone = "info") {
    const box = $id("systemBackupStatus");
    if (!box) return;
    if (!message) {
      box.hidden = true;
      box.textContent = "";
      return;
    }
    box.hidden = false;
    box.className = `pa-info-box mb-16 ${tone === "danger" ? "pa-info-box-danger" : ""}`.trim();
    box.innerHTML = `<i class="ri-information-line"></i> ${escapeHtml(message)}`;
  }
  setExportRunning(running) {
    this.state.exportRunning = running;
    const sqlBtn = $id("systemExportSqlBtn");
    const schemaBtn = $id("systemExportSchemaBtn");
    const bulkSql = $id("systemBulkExportSqlBtn");
    const exportTableBtn = $id("systemDbExportTableBtn");
    const selected = this.state.selectedTables.size;
    if (sqlBtn) sqlBtn.disabled = running || selected === 0;
    if (schemaBtn) schemaBtn.disabled = running;
    if (bulkSql) bulkSql.disabled = running || selected === 0;
    if (exportTableBtn) exportTableBtn.disabled = running || !this.state.focusedTable;
  }
  async downloadFileResponse(res, fallbackName) {
    if (res.status === 401) {
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || res.statusText || "Download failed");
    }
    const blob = await res.blob();
    const filename = parseDownloadFilename(res.headers.get("Content-Disposition"), fallbackName);
    triggerBlobDownload(blob, filename);
    return filename;
  }
  async exportSqlBackup(overrideTables) {
    if (this.state.exportRunning) return;
    if (!await this.ensureAdminAccess()) return;
    const tables = overrideTables ? [...overrideTables] : [...this.state.selectedTables];
    if (!tables.length) {
      showToast("Select at least one table to export.", "danger");
      return;
    }
    this.setExportRunning(true);
    this.setBackupStatus(`Exporting ${tables.length} table${tables.length === 1 ? "" : "s"} to SQL\u2026`);
    try {
      const res = await fetch("/api/admin/database-backup", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/sql",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ tables, format: "sql" })
      });
      const filename = await this.downloadFileResponse(res, "backup-data.sql");
      this.setBackupStatus(`SQL backup downloaded: ${filename}`);
      showStatusToast("SQL backup downloaded successfully.", "success");
      await this.loadTables();
    } catch (err) {
      this.setBackupStatus(err.message || "Export failed.", "danger");
      showToast(err.message || "Export failed.", "danger");
    } finally {
      this.setExportRunning(false);
    }
  }
  async downloadSchemaGuide() {
    if (this.state.exportRunning) return;
    if (!await this.ensureAdminAccess()) return;
    this.setExportRunning(true);
    this.setBackupStatus("Preparing schema and setup guide\u2026");
    try {
      const res = await fetch("/api/admin/database-backup?schema=1", {
        credentials: "same-origin",
        headers: { Accept: "application/sql" }
      });
      const filename = await this.downloadFileResponse(res, "schema-setup.sql");
      this.setBackupStatus(`Schema guide downloaded: ${filename}`);
      showStatusToast("Schema & setup guide downloaded.", "success");
      await this.loadTables();
    } catch (err) {
      this.setBackupStatus(err.message || "Schema export failed.", "danger");
      showToast(err.message || "Schema export failed.", "danger");
    } finally {
      this.setExportRunning(false);
    }
  }
  hydrateEnvironmentForm(values = {}) {
    for (const [key, fieldId] of Object.entries(ENV_FIELD_MAP)) {
      const el = $id(fieldId);
      if (!el) continue;
      const value = values[key] ?? "";
      if (SECRET_FIELDS.has(key)) {
        el.value = "";
        el.placeholder = value ? `Configured (${value})` : "Leave blank to keep current value";
      } else {
        el.value = value;
      }
    }
  }
  collectEnvironmentUpdates() {
    const updates = {};
    for (const [key, fieldId] of Object.entries(ENV_FIELD_MAP)) {
      const el = $id(fieldId);
      if (!el) continue;
      const value = el.value.trim();
      if (SECRET_FIELDS.has(key)) {
        updates[key] = value ? value : UNCHANGED_SECRET;
      } else {
        updates[key] = value;
      }
    }
    return updates;
  }
  renderEnvironmentMeta(config) {
    const meta = $id("systemEnvMeta");
    if (!meta || !config) return;
    const source = config.source ? `Loaded from ${config.source}` : "Environment settings loaded";
    const target = config.targetFile ? ` \xB7 writes to ${config.targetFile}` : "";
    const writable = config.writable === false ? " \xB7 file writes may be unavailable in this deployment" : "";
    meta.innerHTML = `<i class="ri-information-line"></i> ${escapeHtml(source)}${escapeHtml(target)}${escapeHtml(writable)}`;
  }
  async loadEnvironment() {
    try {
      const config = await this.fetchJson("/api/admin/environment");
      this.state.env = config;
      this.hydrateEnvironmentForm(config.values || {});
      this.renderEnvironmentMeta(config);
    } catch (err) {
      showToast(err.message || "Could not load environment configuration.", "danger");
    }
  }
  async saveEnvironment() {
    if (!await this.ensureAdminAccess()) return;
    const values = this.collectEnvironmentUpdates();
    const saveBtn = $id("systemEnvSaveBtn");
    if (saveBtn) saveBtn.disabled = true;
    try {
      const payload = await this.fetchJson("/api/admin/environment", {
        method: "PUT",
        body: JSON.stringify({ values })
      });
      this.state.env = payload;
      this.hydrateEnvironmentForm(payload.values || {});
      this.renderEnvironmentMeta(payload);
      showStatusToast(payload.message || "Environment saved to .env.local.", "success");
    } catch (err) {
      showToast(err.message || "Could not save environment configuration.", "danger");
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }
};

// client/modules/settings/settingsCardCollapse.ts
var STORAGE_KEY = "pa_settings_card_collapse";
var SCOPE = '.pa-tab-panel[data-panel="settings"]';
var CARD_SELECTORS = [
  ".pa-card-settings",
  ".pa-profile-card",
  ".pa-security-card",
  ".pa-notification-card"
].join(", ");
var delegationBound = false;
function loadCollapsedState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveCollapsedState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}
function getCardKey(card, title) {
  if (card.id) return card.id;
  const tab = card.closest(".pa-tab-panel")?.dataset.content || "settings";
  const label = title.textContent.replace(/\s+/g, " ").trim().toLowerCase();
  return `${tab}-${label}`;
}
function setCardCollapsed(card, title, collapsed) {
  card.classList.toggle("is-collapsed", collapsed);
  title.setAttribute("aria-expanded", collapsed ? "false" : "true");
}
function wrapCardBody(card, title) {
  if (title.nextElementSibling?.classList.contains("pa-card-collapse-body")) return;
  const body = document.createElement("div");
  body.className = "pa-card-collapse-body";
  let sibling = title.nextElementSibling;
  while (sibling) {
    const next = sibling.nextElementSibling;
    body.appendChild(sibling);
    sibling = next;
  }
  title.insertAdjacentElement("afterend", body);
}
function enhanceCard(card) {
  if (card.dataset.collapseReady) return;
  const title = card.querySelector(".pa-card-title");
  if (!title) return;
  card.dataset.collapseReady = "1";
  card.classList.add("pa-settings-card");
  title.classList.add("pa-card-collapse-trigger");
  title.setAttribute("role", "button");
  title.setAttribute("tabindex", "0");
  if (!title.querySelector(".pa-card-collapse-icon")) {
    const icon = document.createElement("i");
    icon.className = "ri-arrow-down-s-line pa-card-collapse-icon";
    icon.setAttribute("aria-hidden", "true");
    title.appendChild(icon);
  }
  wrapCardBody(card, title);
  const key = getCardKey(card, title);
  card.dataset.collapseKey = key;
  const state = loadCollapsedState();
  setCardCollapsed(card, title, Boolean(state[key]));
}
function toggleCard(card) {
  const title = card.querySelector(".pa-card-collapse-trigger");
  if (!title) return;
  const collapsed = !card.classList.contains("is-collapsed");
  setCardCollapsed(card, title, collapsed);
  const state = loadCollapsedState();
  const key = card.dataset.collapseKey;
  if (key) {
    if (collapsed) state[key] = true;
    else delete state[key];
    saveCollapsedState(state);
  }
}
function bindDelegation() {
  if (delegationBound) return;
  delegationBound = true;
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".pa-card-collapse-trigger");
    if (!trigger) return;
    const card = trigger.closest(".pa-settings-card");
    if (!card?.closest(SCOPE)) return;
    e.preventDefault();
    toggleCard(card);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const trigger = e.target.closest(".pa-card-collapse-trigger");
    if (!trigger) return;
    const card = trigger.closest(".pa-settings-card");
    if (!card?.closest(SCOPE)) return;
    e.preventDefault();
    toggleCard(card);
  });
}
function initSettingsCardCollapse() {
  document.querySelectorAll(`${SCOPE} ${CARD_SELECTORS}`).forEach(enhanceCard);
  bindDelegation();
}

// client/modules/settings/roleRequest.ts
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var wired = false;
function isRestrictedRole(role) {
  return role === "editor" || role === "viewer";
}
function roleOptions(currentRole) {
  if (currentRole === "viewer") {
    return [
      { value: "editor", label: "Editor" },
      { value: "admin", label: "Admin" }
    ];
  }
  if (currentRole === "editor") {
    return [{ value: "admin", label: "Admin" }];
  }
  return [];
}
function ensureCard() {
  const securityPanel = document.querySelector('.pa-tab-panel[data-content="security"]');
  if (!securityPanel || $id("paRoleRequestCard")) return;
  const card = document.createElement("div");
  card.className = "pa-security-card pa-role-request-card pa-staff-only-item";
  card.id = "paRoleRequestCard";
  card.innerHTML = `
    <div class="pa-card-title"><i class="ri-user-settings-line"></i> Request role update</div>
    <p class="pa-role-request-lead">Need more access? Send a request to the administrators with your preferred contact email.</p>
    <form id="paRoleRequestForm" class="pa-role-request-form" novalidate>
      <div class="pa-form-group">
        <label class="pa-form-label" for="paRoleRequestEmail">Contact email</label>
        <input class="pa-form-input" id="paRoleRequestEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required>
        <div class="pa-form-hint"><i class="ri-information-line"></i> Use a valid email where an administrator can reach you.</div>
      </div>
      <div class="pa-form-group">
        <label class="pa-form-label" for="paRoleRequestRole">Requested role</label>
        <select class="pa-form-select" id="paRoleRequestRole"></select>
      </div>
      <div class="pa-form-group">
        <label class="pa-form-label" for="paRoleRequestMessage">Message</label>
        <textarea class="pa-form-textarea" id="paRoleRequestMessage" rows="4" maxlength="2000" placeholder="Explain why you need this access level..." required></textarea>
      </div>
      <div class="pa-settings-actions">
        <button type="submit" class="pa-btn pa-btn-primary" id="paRoleRequestSubmit">
          <i class="ri-send-plane-line"></i> Contact administrator
        </button>
      </div>
    </form>`;
  const loginCard = securityPanel.querySelector("#loginActivityList")?.closest(".pa-security-card");
  if (loginCard?.parentElement) {
    loginCard.parentElement.insertBefore(card, loginCard.nextSibling);
  } else {
    securityPanel.appendChild(card);
  }
}
function populateDefaults(role, profile) {
  const emailInput = $id("paRoleRequestEmail");
  const roleSelect = $id("paRoleRequestRole");
  if (emailInput && !emailInput.value) {
    emailInput.value = profile?.email || "";
  }
  if (!roleSelect) return;
  const options = roleOptions(role);
  roleSelect.innerHTML = options.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join("");
}
function bindForm(role) {
  if (wired) return;
  wired = true;
  const form = $id("paRoleRequestForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const contactEmail = $id("paRoleRequestEmail")?.value?.trim() || "";
    const requestedRole = $id("paRoleRequestRole")?.value?.trim() || "";
    const message = $id("paRoleRequestMessage")?.value?.trim() || "";
    const submitBtn = $id("paRoleRequestSubmit");
    if (!EMAIL_RE.test(contactEmail)) {
      showToast("Enter a valid contact email address.", "warning");
      return;
    }
    if (message.length < 10) {
      showToast("Please write a short message (at least 10 characters).", "warning");
      return;
    }
    submitBtn?.setAttribute("disabled", "true");
    try {
      const result = await authService.requestRoleUpdate({
        contactEmail,
        requestedRole,
        message
      });
      showToast(result?.message || "Request sent to administrators.", "success");
      const messageInput = $id("paRoleRequestMessage");
      if (messageInput) messageInput.value = "";
    } catch (err) {
      showToast(err?.message || "Could not send role request.", "danger");
    } finally {
      submitBtn?.removeAttribute("disabled");
    }
  });
}
async function initRoleRequestCard(role) {
  if (!isRestrictedRole(role)) {
    $id("paRoleRequestCard")?.remove();
    return;
  }
  ensureCard();
  bindForm(role);
  try {
    const profile = await authService.getProfile();
    populateDefaults(role, profile);
  } catch {
    populateDefaults(role, null);
  }
}

// client/modules/settings/SettingsModule.ts
var SettingsModule = class extends Module {
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
};
export {
  SettingsModule
};
