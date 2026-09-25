import {
  AuthModule
} from "./chunk-LOEF5OWG.js";
import "./chunk-5SJ7MEVC.js";
import {
  authService
} from "./chunk-MRY75FFO.js";
import "./chunk-UVN7SZ5D.js";
import {
  $id
} from "./chunk-R5CPOL4O.js";

// client/modules/auth/ResetPasswordModule.ts
var ResetPasswordModule = class extends AuthModule {
  constructor() {
    super({
      name: "ResetPassword",
      storageKey: null
    });
    this.passwordValid = false;
  }
  async load() {
    try {
      await authService.session();
    } catch {
      this.showError("Invalid or expired reset link. Please request a new one.");
    }
  }
  render() {
  }
  bindEvents() {
    if (this._boundEvents) return;
    this._boundEvents = true;
    const form = $id("paResetForm");
    const passwordInput = $id("paNewPassword");
    const confirmInput = $id("paConfirmPassword");
    const submitBtn = $id("paResetSubmit");
    this.setupPasswordToggle("paNewPassword", "paPassToggle");
    this.setupPasswordToggle("paConfirmPassword", "paConfirmPassToggle");
    this.setupPasswordStrength(
      "paNewPassword",
      "paPasswordRequirements",
      "paPasswordStrength",
      "paStrengthLabel"
    );
    this.on(passwordInput, "input", () => {
      const password = passwordInput.value;
      this.passwordValid = this.isPasswordValid(password);
      this.clearFieldError("paNewPassword", "paNewPasswordError");
      if (confirmInput.value && password !== confirmInput.value) {
        this.setFieldError("paConfirmPassword", "paConfirmPasswordError", true);
      } else if (confirmInput.value) {
        this.clearFieldError("paConfirmPassword", "paConfirmPasswordError");
      }
    });
    this.on(confirmInput, "input", () => {
      if (confirmInput.value && confirmInput.value !== passwordInput.value) {
        this.setFieldError("paConfirmPassword", "paConfirmPasswordError", true);
      } else {
        this.clearFieldError("paConfirmPassword", "paConfirmPasswordError");
      }
    });
    this.on(form, "submit", (e) => {
      e.preventDefault();
      void this.handleResetSubmit();
    });
  }
  async handleResetSubmit() {
    const passwordInput = $id("paNewPassword");
    const confirmInput = $id("paConfirmPassword");
    const submitBtn = $id("paResetSubmit");
    let valid = true;
    const password = passwordInput.value;
    const confirm = confirmInput.value;
    if (!password || !this.isPasswordValid(password)) {
      this.setFieldError("paNewPassword", "paNewPasswordError", true);
      valid = false;
    } else {
      this.clearFieldError("paNewPassword", "paNewPasswordError");
    }
    if (!confirm || confirm !== password) {
      this.setFieldError("paConfirmPassword", "paConfirmPasswordError", true);
      valid = false;
    } else {
      this.clearFieldError("paConfirmPassword", "paConfirmPasswordError");
    }
    if (!valid) {
      const firstInvalid = document.querySelector("#paResetForm .pa-form-input.error");
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    this.setButtonLoading("paResetSubmit", true);
    try {
      await authService.resetPassword(password);
      this.showSuccess("paSuccessBox", "paResetForm");
      this.showSuccessToast("Password reset successfully!");
    } catch (err) {
      this.showError(err.message || "Could not reset password.");
      this.setButtonLoading("paResetSubmit", false);
    }
  }
};
export {
  ResetPasswordModule
};
