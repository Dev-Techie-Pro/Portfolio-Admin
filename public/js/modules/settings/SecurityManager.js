import { $id, escapeHtml } from "../../utils/dom.js";
import { showToast } from "../shell/toast.js";
import { addNotification } from "../shell/notifications.js";
import { authService } from "../../core/AuthService.js";
import { setupAllPasswordToggles } from "../../utils/password-toggle.js";
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
class SecurityManager {
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
}
export {
  SecurityManager
};
