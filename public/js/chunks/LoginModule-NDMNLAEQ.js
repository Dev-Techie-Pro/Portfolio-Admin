import {
  AuthModule
} from "./chunk-O4ZWPPUI.js";
import "./chunk-5SJ7MEVC.js";
import {
  authService
} from "./chunk-MRY75FFO.js";
import {
  $id
} from "./chunk-OGR5OR6D.js";

// client/modules/auth/LoginModule.ts
var LoginModule = class extends AuthModule {
  constructor() {
    super({
      name: "Login",
      storageKey: null
    });
    this._mfaState = {
      active: false,
      factorId: null,
      useBackupCode: false
    };
  }
  async load() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth_callback_failed") {
      this.showError("Authentication link expired or is invalid. Please try again.");
    }
    if (params.get("mfa") === "1") {
      this.showMfaStep();
    }
  }
  render() {
    this.ensureMfaUi();
  }
  ensureMfaUi() {
    const form = $id("paLoginForm");
    if (!form || $id("paMfaStep")) return;
    const wrap = document.createElement("div");
    wrap.id = "paMfaStep";
    wrap.hidden = true;
    wrap.innerHTML = `
      <div class="pa-form-group">
        <label class="pa-form-label" for="paMfaCode">Authenticator code</label>
        <div class="pa-auth-input-wrap">
          <i class="ri-shield-keyhole-line pa-auth-input-icon" aria-hidden="true"></i>
          <input class="pa-form-input" id="paMfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="12" placeholder="Enter 6-digit code" />
        </div>
        <div class="pa-form-hint"><i class="ri-information-line"></i> Open your authenticator app to get the verification code.</div>
      </div>
      <label class="pa-auth-check mt-8" for="paMfaUseBackup">
        <input type="checkbox" id="paMfaUseBackup" />
        <span class="pa-auth-check-box"><i class="ri-check-line"></i></span>
        Use a backup code instead
      </label>
      <div class="pa-auth-submit-wrap">
        <button class="pa-btn pa-btn-primary" type="button" id="paMfaSubmit">
          <span class="pa-spinner"></span>
          <span class="pa-btn-label">Verify & Continue <i class="ri-arrow-right-line" aria-hidden="true"></i></span>
        </button>
      </div>
      <button type="button" class="pa-btn pa-btn-cancel mt-8" id="paMfaBack">Back to sign in</button>`;
    form.appendChild(wrap);
  }
  showMfaStep(factorId = null) {
    this.ensureMfaUi();
    this._mfaState.active = true;
    this._mfaState.factorId = factorId;
    const step = $id("paMfaStep");
    const emailGroup = $id("paLoginEmail")?.closest(".pa-form-group");
    const passwordGroup = $id("paLoginPassword")?.closest(".pa-form-group");
    const row = document.querySelector("#paLoginForm .pa-auth-row");
    const submitWrap = document.querySelector("#paLoginForm > .pa-auth-submit-wrap");
    if (step) step.hidden = false;
    emailGroup?.setAttribute("hidden", "");
    passwordGroup?.setAttribute("hidden", "");
    row?.setAttribute("hidden", "");
    submitWrap?.setAttribute("hidden", "");
    $id("paMfaCode")?.focus();
  }
  hideMfaStep() {
    this._mfaState.active = false;
    const step = $id("paMfaStep");
    const emailGroup = $id("paLoginEmail")?.closest(".pa-form-group");
    const passwordGroup = $id("paLoginPassword")?.closest(".pa-form-group");
    const row = document.querySelector("#paLoginForm .pa-auth-row");
    const submitWrap = document.querySelector("#paLoginForm > .pa-auth-submit-wrap");
    if (step) step.hidden = true;
    emailGroup?.removeAttribute("hidden");
    passwordGroup?.removeAttribute("hidden");
    row?.removeAttribute("hidden");
    submitWrap?.removeAttribute("hidden");
  }
  bindEvents() {
    if (this._boundEvents) return;
    this._boundEvents = true;
    const form = $id("paLoginForm");
    const emailInput = $id("paLoginEmail");
    const passwordInput = $id("paLoginPassword");
    const submitBtn = $id("paLoginSubmit");
    const forgotLink = $id("paForgotPasswordLink");
    const createAccountLink = $id("paCreateAccountLink");
    this.setupPasswordToggle("paLoginPassword", "paPassToggle");
    this.on(emailInput, "input", () => {
      this.clearFieldError("paLoginEmail", "paLoginEmailError");
    });
    this.on(passwordInput, "input", () => {
      this.clearFieldError("paLoginPassword", "paLoginPasswordError");
    });
    this.handleEnterSubmit("paLoginPassword", "paLoginForm");
    this.on(forgotLink, "click", (e) => {
      e.preventDefault();
      window.location.href = "/forget-password";
    });
    this.on(createAccountLink, "click", (e) => {
      e.preventDefault();
      this.showToast("Account creation is not available in this demo.", "info");
    });
    this.on(form, "submit", (e) => {
      e.preventDefault();
      if (this._mfaState.active) {
        void this.handleMfaVerify();
      } else {
        void this.handleLogin();
      }
    });
    this.on($id("paMfaSubmit"), "click", () => {
      void this.handleMfaVerify();
    });
    this.on($id("paMfaBack"), "click", () => {
      this.hideMfaStep();
      void authService.logout().catch(() => {
      });
    });
    this.on($id("paMfaUseBackup"), "change", (e) => {
      this._mfaState.useBackupCode = !!e.target.checked;
      const input = $id("paMfaCode");
      if (input) {
        input.placeholder = this._mfaState.useBackupCode ? "XXXX-XXXX-XXXX" : "Enter 6-digit code";
      }
    });
  }
  async handleLogin() {
    const emailInput = $id("paLoginEmail");
    const passwordInput = $id("paLoginPassword");
    const submitBtn = $id("paLoginSubmit");
    let valid = true;
    const emailValue = emailInput.value.trim();
    if (!emailValue || !this.isValidEmail(emailValue)) {
      this.setFieldError("paLoginEmail", "paLoginEmailError", true);
      valid = false;
    } else {
      this.clearFieldError("paLoginEmail", "paLoginEmailError");
    }
    const passwordValue = passwordInput.value;
    if (!passwordValue || passwordValue.length < 6) {
      this.setFieldError("paLoginPassword", "paLoginPasswordError", true);
      valid = false;
    } else {
      this.clearFieldError("paLoginPassword", "paLoginPasswordError");
    }
    if (!valid) {
      const firstInvalid = document.querySelector("#paLoginForm .pa-form-input.error");
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    this.setButtonLoading("paLoginSubmit", true);
    try {
      const result = await authService.login(emailValue, passwordValue);
      if (result?.needsMfa) {
        this.setButtonLoading("paLoginSubmit", false);
        this.showMfaStep(result.factorId);
        this.showSuccessToast(result.message || "Enter your authenticator code to continue.");
        return;
      }
      this.showSuccessToast("Login successful! Redirecting...");
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/";
      setTimeout(() => {
        window.location.href = redirect;
      }, 600);
    } catch (err) {
      this.showError(err.message || "Login failed. Please check your credentials.");
      this.setButtonLoading("paLoginSubmit", false);
    }
  }
  async handleMfaVerify() {
    const code = $id("paMfaCode")?.value?.trim();
    if (!code) {
      this.showError("Enter your verification code.");
      return;
    }
    this.setButtonLoading("paMfaSubmit", true);
    try {
      await authService.verifyMfaLogin({
        code,
        factorId: this._mfaState.factorId,
        useBackupCode: this._mfaState.useBackupCode
      });
      this.showSuccessToast("Verification successful! Redirecting...");
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect") || "/";
      setTimeout(() => {
        window.location.href = redirect;
      }, 600);
    } catch (err) {
      this.showError(err.message || "Invalid verification code.");
      this.setButtonLoading("paMfaSubmit", false);
    }
  }
};
export {
  LoginModule
};
