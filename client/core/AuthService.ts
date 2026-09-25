async function authRequest(path, options = {}) {
  const res = await fetch(`/api/auth${path}`, {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || res.statusText || 'Request failed');
  }
  return data;
}

export const authService = {
  login(email, password) {
    return authRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  logout() {
    return authRequest('/logout', { method: 'POST' });
  },

  session() {
    if (typeof window !== 'undefined' && window.__paBootstrapSession) {
      const data = window.__paBootstrapSession;
      delete window.__paBootstrapSession;
      if (!data) throw new Error('No session');
      return Promise.resolve(data);
    }

    const bag = typeof window !== 'undefined' ? window.__paPrefetch : null;
    if (bag?.__session) {
      const pending = bag.__session;
      delete bag.__session;
      return pending.then((data) => {
        if (!data) throw new Error('No session');
        return data;
      });
    }
    return authRequest('/session', { method: 'GET' });
  },

  forgotPassword(email) {
    return authRequest('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(password) {
    return authRequest('/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  changePassword(currentPassword, newPassword) {
    return authRequest('/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  getLoginActivity(limit = 25) {
    return authRequest(`/login-activity?limit=${limit}`, { method: 'GET' });
  },

  logoutAllDevices() {
    return authRequest('/logout-all', { method: 'POST' });
  },

  requestRoleUpdate({ contactEmail, requestedRole, message }) {
    return authRequest('/role-request', {
      method: 'POST',
      body: JSON.stringify({ contactEmail, requestedRole, message }),
    });
  },

  getSecuritySettings() {
    return authRequest('/security-settings', { method: 'GET' });
  },

  enrollMfa() {
    return authRequest('/mfa/enroll', { method: 'POST' });
  },

  verifyMfaEnrollment(factorId, code) {
    return authRequest('/mfa/verify-enroll', {
      method: 'POST',
      body: JSON.stringify({ factorId, code }),
    });
  },

  unenrollMfa({ currentPassword, code }) {
    return authRequest('/mfa/unenroll', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, code }),
    });
  },

  verifyMfaLogin({ code, factorId, useBackupCode = false }) {
    return authRequest('/mfa/verify-login', {
      method: 'POST',
      body: JSON.stringify({ code, factorId, useBackupCode }),
    });
  },

  regenerateBackupCodes(currentPassword) {
    return authRequest('/backup-codes/regenerate', {
      method: 'POST',
      body: JSON.stringify({ currentPassword }),
    });
  },

  deleteAccount({ currentPassword, confirmText }) {
    return authRequest('/delete-account', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, confirmText }),
    });
  },

  getProfile() {
    const fetchProfile = () => fetch('/api/profile', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed');
      return data;
    });

    if (typeof window !== 'undefined' && window.__paBootstrapProfile) {
      const data = window.__paBootstrapProfile;
      delete window.__paBootstrapProfile;
      return Promise.resolve(data);
    }

    const bag = typeof window !== 'undefined' ? window.__paPrefetch : null;
    if (bag?.__profile) {
      const pending = bag.__profile;
      delete bag.__profile;
      return pending.then((data) => (data ? data : fetchProfile()));
    }
    return fetchProfile();
  },

  updateProfile(payload) {
    return fetch('/api/profile', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed');
      return data;
    });
  },
};
