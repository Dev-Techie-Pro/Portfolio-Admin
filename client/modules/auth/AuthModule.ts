import { Module } from '../../core/Module.js';
import { $id } from '../../utils/dom.js';
import { showToast } from '../shell/toast.js';
import { setupPasswordToggle as bindPasswordToggle } from '../../utils/password-toggle.js';

export class AuthModule extends Module {
  constructor({ name, storageKey } = {}) {
    super({ name, storageKey });
    this.submitBtn = null;
    this.form = null;
    this._boundEvents = false;
  }

  /**
   * Set field error state
   * @param {string} inputId - The input element ID
   * @param {string} errorId - The error element ID
   * @param {boolean} isError - Whether to show error
   * @param {string} [message] - Optional custom error message
   */
  setFieldError(inputId, errorId, isError, message) {
    const input = $id(inputId);
    const errorEl = $id(errorId);
    
    if (input) {
      input.classList.toggle('error', isError);
      input.setAttribute('aria-invalid', isError ? 'true' : 'false');
    }
    
    if (errorEl) {
      errorEl.classList.toggle('visible', isError);
      if (isError && message) {
        const span = errorEl.querySelector('span');
        if (span) span.textContent = message;
      }
    }
  }

  clearFieldError(inputId, errorId) {
    this.setFieldError(inputId, errorId, false);
  }

  isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  validatePassword(password) {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  }

  getPasswordStrength(password) {
    const checks = this.validatePassword(password);
    const passed = Object.values(checks).filter(Boolean).length;
    if (passed <= 2) return { level: 'weak', label: 'Weak' };
    if (passed <= 3) return { level: 'medium', label: 'Medium' };
    if (passed <= 4) return { level: 'strong', label: 'Strong' };
    return { level: 'strong', label: 'Very Strong' };
  }

  isPasswordValid(password) {
    const checks = this.validatePassword(password);
    return Object.values(checks).every(Boolean);
  }

  setButtonLoading(btnId, loading) {
    const btn = $id(btnId);
    if (!btn) return;
    btn.classList.toggle('loading', loading);
    btn.disabled = loading;
  }

  showSuccess(successBoxId, formId) {
    const successBox = $id(successBoxId);
    const form = $id(formId);
    if (successBox) successBox.style.display = 'block';
    if (form) form.style.display = 'none';
  }

  showError(message) {
    showToast(message, 'danger');
  }

  showSuccessToast(message) {
    showToast(message, 'success');
  }

  setupPasswordToggle(inputId, toggleBtnId) {
    bindPasswordToggle(inputId, toggleBtnId);
  }

  setupPasswordStrength(inputId, requirementsContainerId, strengthContainerId, strengthLabelId) {
    const input = $id(inputId);
    if (!input) return;

    this.on(input, 'input', () => {
      const password = input.value;
      const checks = this.validatePassword(password);
      
      const reqItems = document.querySelectorAll(`#${requirementsContainerId} .pa-req-item`);
      reqItems.forEach(item => {
        const req = item.dataset.req;
        const icon = item.querySelector('.pa-req-icon i');
        if (checks[req]) {
          item.classList.add('met');
          if (icon) icon.className = 'ri-check-line';
        } else {
          item.classList.remove('met');
          if (icon) icon.className = 'ri-close-line';
        }
      });

      const strength = this.getPasswordStrength(password);
      const bars = document.querySelectorAll(`#${strengthContainerId} .pa-strength-bar`);
      bars.forEach((bar, index) => {
        bar.className = 'pa-strength-bar';
        if (index < Object.values(checks).filter(Boolean).length) {
          bar.classList.add('active', strength.level);
        }
      });

      const label = $id(strengthLabelId);
      if (label) {
        if (password.length === 0) {
          label.textContent = 'Enter a password to see strength';
          label.style.color = '';
        } else {
          label.textContent = `Strength: ${strength.label}`;
          label.style.color = strength.level === 'weak' ? '#ef4444' : strength.level === 'medium' ? '#f59e0b' : '#22c55e';
        }
      }
    });
  }

  handleEnterSubmit(inputId, formId) {
    const input = $id(inputId);
    const form = $id(formId);
    if (!input || !form) return;

    this.on(input, 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
      }
    });
  }

  redirectToLogin() {
    window.location.href = '/login';
  }

  redirectToDashboard() {
    window.location.href = '/';
  }
}