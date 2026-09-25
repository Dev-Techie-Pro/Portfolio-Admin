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

// client/modules/auth/ForgotPasswordModule.ts
var ForgotPasswordModule = class extends AuthModule {
  constructor() {
    super({
      name: "ForgotPassword",
      storageKey: null
    });
    this.resendTimer = null;
  }
  async load() {
  }
  render() {
  }
  bindEvents() {
    if (this._boundEvents) return;
    this._boundEvents = true;
    const form = $id("paForgotForm");
    const emailInput = $id("paForgotEmail");
    const submitBtn = $id("paForgotSubmit");
    const resendBtn = $id("paResendBtn");
    this.on(emailInput, "input", () => {
      this.clearFieldError("paForgotEmail", "paForgotEmailError");
    });
    this.handleEnterSubmit("paForgotEmail", "paForgotForm");
    this.on(form, "submit", (e) => {
      e.preventDefault();
      void this.handleForgotSubmit();
    });
    this.on(resendBtn, "click", (e) => {
      e.preventDefault();
      void this.handleResend();
    });
  }
  async handleForgotSubmit() {
    const emailInput = $id("paForgotEmail");
    const submitBtn = $id("paForgotSubmit");
    const emailValue = emailInput.value.trim();
    if (!emailValue || !this.isValidEmail(emailValue)) {
      this.setFieldError("paForgotEmail", "paForgotEmailError", true);
      emailInput.focus();
      return;
    }
    this.clearFieldError("paForgotEmail", "paForgotEmailError");
    this.setButtonLoading("paForgotSubmit", true);
    try {
      await authService.forgotPassword(emailValue);
      const successEmail = $id("paSuccessEmail");
      if (successEmail) successEmail.textContent = emailValue;
      this.showSuccess("paSuccessBox", "paForgotForm");
      this.showSuccessToast(`Password reset link sent to ${emailValue}`);
    } catch (err) {
      this.showError(err.message || "Could not send reset email.");
    } finally {
      this.setButtonLoading("paForgotSubmit", false);
    }
  }
  async handleResend() {
    const resendBtn = $id("paResendBtn");
    const emailInput = $id("paForgotEmail");
    const emailValue = emailInput.value.trim();
    if (!emailValue || !this.isValidEmail(emailValue)) {
      this.showError("Please enter a valid email address.");
      return;
    }
    this.setButtonLoading("paResendBtn", true);
    try {
      await authService.forgotPassword(emailValue);
      this.showSuccessToast(`Reset link resent to ${emailValue}`);
    } catch (err) {
      this.showError(err.message || "Could not resend reset email.");
    } finally {
      this.setButtonLoading("paResendBtn", false);
    }
  }
  destroy() {
    if (this.resendTimer) {
      clearTimeout(this.resendTimer);
      this.resendTimer = null;
    }
    super.destroy();
  }
};
export {
  ForgotPasswordModule
};
