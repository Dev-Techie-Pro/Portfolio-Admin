import { $id } from '../../utils/dom.js';
import { authService } from '../../core/AuthService.js';
import { showToast } from '../shell/toast.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let wired = false;

function isRestrictedRole(role) {
  return role === 'editor' || role === 'viewer';
}

function roleOptions(currentRole) {
  if (currentRole === 'viewer') {
    return [
      { value: 'editor', label: 'Editor' },
      { value: 'admin', label: 'Admin' },
    ];
  }
  if (currentRole === 'editor') {
    return [{ value: 'admin', label: 'Admin' }];
  }
  return [];
}

function ensureCard() {
  const securityPanel = document.querySelector('.pa-tab-panel[data-content="security"]');
  if (!securityPanel || $id('paRoleRequestCard')) return;

  const card = document.createElement('div');
  card.className = 'pa-security-card pa-role-request-card pa-staff-only-item';
  card.id = 'paRoleRequestCard';
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

  const loginCard = securityPanel.querySelector('#loginActivityList')?.closest('.pa-security-card');
  if (loginCard?.parentElement) {
    loginCard.parentElement.insertBefore(card, loginCard.nextSibling);
  } else {
    securityPanel.appendChild(card);
  }
}

function populateDefaults(role, profile) {
  const emailInput = $id('paRoleRequestEmail');
  const roleSelect = $id('paRoleRequestRole');
  if (emailInput && !emailInput.value) {
    emailInput.value = profile?.email || '';
  }
  if (!roleSelect) return;
  const options = roleOptions(role);
  roleSelect.innerHTML = options.map((opt) => (
    `<option value="${opt.value}">${opt.label}</option>`
  )).join('');
}

function bindForm(role) {
  if (wired) return;
  wired = true;

  const form = $id('paRoleRequestForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const contactEmail = $id('paRoleRequestEmail')?.value?.trim() || '';
    const requestedRole = $id('paRoleRequestRole')?.value?.trim() || '';
    const message = $id('paRoleRequestMessage')?.value?.trim() || '';
    const submitBtn = $id('paRoleRequestSubmit');

    if (!EMAIL_RE.test(contactEmail)) {
      showToast('Enter a valid contact email address.', 'warning');
      return;
    }
    if (message.length < 10) {
      showToast('Please write a short message (at least 10 characters).', 'warning');
      return;
    }

    submitBtn?.setAttribute('disabled', 'true');
    try {
      const result = await authService.requestRoleUpdate({
        contactEmail,
        requestedRole,
        message,
      });
      showToast(result?.message || 'Request sent to administrators.', 'success');
      const messageInput = $id('paRoleRequestMessage');
      if (messageInput) messageInput.value = '';
    } catch (err) {
      showToast(err?.message || 'Could not send role request.', 'danger');
    } finally {
      submitBtn?.removeAttribute('disabled');
    }
  });
}

export async function initRoleRequestCard(role) {
  if (!isRestrictedRole(role)) {
    $id('paRoleRequestCard')?.remove();
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
