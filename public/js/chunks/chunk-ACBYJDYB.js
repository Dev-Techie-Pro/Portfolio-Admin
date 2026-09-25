import {
  closePanels,
  openPanel,
  registerPanel
} from "./chunk-WRYMBWPQ.js";
import {
  $id,
  showToast
} from "./chunk-R5CPOL4O.js";

// client/utils/staffRoles.ts
var STAFF_ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" }
];
function formatStaffRoleLabel(role) {
  const match = STAFF_ROLE_OPTIONS.find((opt) => opt.value === role);
  if (match) return match.label;
  return String(role || "Staff").replace(/_/g, " ");
}
function populateStaffRoleSelect(selectEl, { selected = "editor" } = {}) {
  if (!selectEl) return;
  selectEl.innerHTML = STAFF_ROLE_OPTIONS.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join("");
  selectEl.value = STAFF_ROLE_OPTIONS.some((opt) => opt.value === selected) ? selected : "editor";
}

// client/utils/userCredentialsPanel.ts
var lastCredentials = null;
var panelBound = false;
function hitControl(target, id) {
  if (!target) return false;
  if (target.id === id) return true;
  return typeof target.closest === "function" && !!target.closest(`#${id}`);
}
function initUserCredentialsPanel() {
  if (panelBound) return;
  panelBound = true;
  registerPanel("paUserCredentialsPanel");
  document.addEventListener("click", (e) => {
    if (hitControl(e.target, "paUserCredentialsPanelClose")) {
      e.preventDefault();
      closePanels();
      clearUserCredentials();
      return;
    }
    if (hitControl(e.target, "paCopyCredentialsBtn")) {
      e.preventDefault();
      void copyUserCredentials();
      return;
    }
    if (hitControl(e.target, "paShareCredentialsBtn")) {
      e.preventDefault();
      void shareUserCredentials();
    }
  });
}
function clearUserCredentials() {
  lastCredentials = null;
}
function formatUserCredentialsText(credentials = lastCredentials) {
  if (!credentials) return "";
  return [
    "Portfolio Dashboard Login",
    `Email: ${credentials.email}`,
    `Password: ${credentials.password}`,
    `Role: ${formatStaffRoleLabel(credentials.role)}`
  ].join("\n");
}
function showUserCredentialsPanel(credentials, { closePanelIds = [], emailSent, emailError } = {}) {
  if (!credentials) return;
  lastCredentials = credentials;
  const set = (id, value) => {
    const el = $id(id);
    if (el) el.value = value;
  };
  set("credEmail", credentials.email || "");
  set("credPassword", credentials.password || "");
  set("credRole", formatStaffRoleLabel(credentials.role));
  const title = $id("paUserCredentialsPanelTitle");
  if (title) {
    title.textContent = credentials.reset ? "Reset Credentials" : "User Credentials";
  }
  const hint = $id("paUserCredentialsPanel")?.querySelector(".pa-panel-body .pa-text-mute");
  if (hint) {
    const baseHint = credentials.reset ? "A new temporary password was generated. Share these credentials securely with the user." : "Share these credentials securely with the new user. They should change their password after first login.";
    if (emailSent === true) {
      hint.textContent = `${baseHint} Login credentials were emailed to ${credentials.email || "the user"}.`;
    } else if (emailSent === false && emailError) {
      hint.textContent = `${baseHint} Email could not be sent automatically (${emailError}). Use copy or share below.`;
    } else {
      hint.textContent = baseHint;
    }
  }
  openPanel("paUserCredentialsPanel", closePanelIds);
}
function notifyCredentialsEmailStatus({ emailSent, emailError, action = "created" } = {}) {
  if (emailSent) {
    showToast(
      action === "reset" ? "Credentials reset and emailed to the user." : "User created and login credentials emailed.",
      "success"
    );
    return;
  }
  if (emailSent === false && emailError) {
    showToast(
      action === "reset" ? `Credentials reset, but email could not be sent: ${emailError}` : `User created, but email could not be sent: ${emailError}`,
      "info"
    );
  }
}
async function copyUserCredentials() {
  const text = formatUserCredentialsText();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Credentials copied to clipboard.", "success");
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      showToast("Credentials copied to clipboard.", "success");
    } catch {
      showToast("Could not copy credentials.", "danger");
    } finally {
      document.body.removeChild(area);
    }
  }
}
async function shareUserCredentials() {
  const text = formatUserCredentialsText();
  if (!text) return;
  const shareData = {
    title: "Portfolio Dashboard Login",
    text
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      showToast("Credentials shared.", "success");
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  const mailto = `mailto:?subject=${encodeURIComponent("Portfolio Dashboard Login")}&body=${encodeURIComponent(text)}`;
  window.location.href = mailto;
}

export {
  formatStaffRoleLabel,
  populateStaffRoleSelect,
  initUserCredentialsPanel,
  clearUserCredentials,
  showUserCredentialsPanel,
  notifyCredentialsEmailStatus
};
