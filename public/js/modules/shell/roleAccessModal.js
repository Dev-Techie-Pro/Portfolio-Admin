import { $id } from "../../utils/dom.js";
import { authService } from "../../core/AuthService.js";
const BRIEFING_VERSION = "v1";
const STORAGE_PREFIX = "pa_role_access_briefing";
const ROLE_BRIEFINGS = {
  editor: {
    title: "Editor account",
    subtitle: "You can manage portfolio content and update selected settings.",
    icon: "ri-edit-box-line",
    allowed: [
      "View every dashboard and content page",
      "Create, edit, and delete projects, media, blog posts, and other CMS data",
      "Update General, Notifications, Profile, and Security settings",
      "Use appearance and customization options"
    ],
    restricted: [
      "User management or adding new staff accounts",
      "System settings and database tools",
      "Admin-only sidebar links stay hidden for your role"
    ]
  },
  viewer: {
    title: "Viewer account",
    subtitle: "Your access is read-only across the portfolio dashboard.",
    icon: "ri-eye-line",
    allowed: [
      "View dashboard stats and all content pages",
      "Browse projects, media, messages, and other records",
      "Update Notifications, Profile, and Security settings",
      "Use appearance and customization options"
    ],
    restricted: [
      "Create, edit, or delete any content or records",
      "Dashboard add actions, bulk actions, and edit panels",
      "Changing General site settings (view only)",
      "User management and system settings"
    ]
  }
};
let bindingsReady = false;
function storageKey(userId, role) {
  return `${STORAGE_PREFIX}_${BRIEFING_VERSION}_${userId}_${role}`;
}
function hasSeenBriefing(userId, role) {
  try {
    return localStorage.getItem(storageKey(userId, role)) === "1";
  } catch {
    return false;
  }
}
function markBriefingSeen(userId, role) {
  try {
    localStorage.setItem(storageKey(userId, role), "1");
  } catch {
  }
}
function formatRoleLabel(role) {
  return (role || "staff").replace(/_/g, " ");
}
function renderList(items, variant) {
  return items.map((item) => `<li class="pa-role-access-item pa-role-access-item--${variant}">
      <i class="${variant === "allowed" ? "ri-check-line" : "ri-close-line"}" aria-hidden="true"></i>
      <span>${item}</span>
    </li>`).join("");
}
function ensureModalInDom() {
  if ($id("paRoleAccessOverlay")) return;
  const overlay = document.createElement("div");
  overlay.className = "pa-role-access-overlay";
  overlay.id = "paRoleAccessOverlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "paRoleAccessTitle");
  overlay.innerHTML = `
    <div class="pa-role-access-box">
      <div class="pa-role-access-head">
        <div class="pa-role-access-icon" id="paRoleAccessIcon" aria-hidden="true">
          <i class="ri-shield-user-line"></i>
        </div>
        <div>
          <div class="pa-role-access-eyebrow" id="paRoleAccessEyebrow">Account access</div>
          <div class="pa-role-access-title" id="paRoleAccessTitle">Your permissions</div>
          <div class="pa-role-access-subtitle" id="paRoleAccessSubtitle"></div>
        </div>
      </div>
      <div class="pa-role-access-body">
        <div class="pa-role-access-section">
          <div class="pa-role-access-section-title allowed"><i class="ri-check-double-line"></i> You can</div>
          <ul class="pa-role-access-list" id="paRoleAccessAllowed"></ul>
        </div>
        <div class="pa-role-access-section">
          <div class="pa-role-access-section-title restricted"><i class="ri-forbid-line"></i> You cannot</div>
          <ul class="pa-role-access-list" id="paRoleAccessRestricted"></ul>
        </div>
      </div>
      <div class="pa-role-access-foot">
        <p class="pa-role-access-note">These limits are enforced in the sidebar, settings, and API. To request a role change, open Settings \u2192 Security and use the "Request role update" form.</p>
        <button type="button" class="pa-btn pa-btn-primary w-100" id="paRoleAccessOk">Got it</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}
function bindModalEvents() {
  if (bindingsReady) return;
  bindingsReady = true;
  const overlay = $id("paRoleAccessOverlay");
  const okBtn = $id("paRoleAccessOk");
  if (!overlay || !okBtn) return;
  const close = () => {
    overlay.classList.remove("visible");
    document.body.classList.remove("pa-role-access-open");
    overlay.dataset.userId = "";
    overlay.dataset.role = "";
  };
  okBtn.addEventListener("click", () => {
    const userId = overlay.dataset.userId;
    const role = overlay.dataset.role;
    if (userId && role) markBriefingSeen(userId, role);
    close();
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("visible")) close();
  });
}
function populateModal(role) {
  const briefing = ROLE_BRIEFINGS[role];
  if (!briefing) return;
  const iconWrap = $id("paRoleAccessIcon");
  const eyebrow = $id("paRoleAccessEyebrow");
  const title = $id("paRoleAccessTitle");
  const subtitle = $id("paRoleAccessSubtitle");
  const allowed = $id("paRoleAccessAllowed");
  const restricted = $id("paRoleAccessRestricted");
  if (iconWrap) iconWrap.innerHTML = `<i class="${briefing.icon}"></i>`;
  if (eyebrow) eyebrow.textContent = `${formatRoleLabel(role)} access`;
  if (title) title.textContent = briefing.title;
  if (subtitle) subtitle.textContent = briefing.subtitle;
  if (allowed) allowed.innerHTML = renderList(briefing.allowed, "allowed");
  if (restricted) restricted.innerHTML = renderList(briefing.restricted, "restricted");
}
function openModal(userId, role) {
  ensureModalInDom();
  bindModalEvents();
  const overlay = $id("paRoleAccessOverlay");
  if (!overlay) return;
  populateModal(role);
  overlay.dataset.userId = userId;
  overlay.dataset.role = role;
  overlay.classList.add("visible");
  document.body.classList.add("pa-role-access-open");
  $id("paRoleAccessOk")?.focus();
}
async function maybeShowRoleAccessModal(profile = null) {
  if (typeof window === "undefined") return;
  if (window.location.pathname.includes("/login")) return;
  let userId = profile?.id;
  let role = profile?.role;
  if (!role || !userId) {
    try {
      const session = await authService.session();
      userId = userId || session?.user?.id;
      if (!role) {
        const loaded = await authService.getProfile().catch(() => null);
        role = loaded?.role || session?.user?.role;
        userId = userId || loaded?.id;
      }
    } catch {
      return;
    }
  }
  if (!userId || !role || !ROLE_BRIEFINGS[role]) return;
  if (hasSeenBriefing(userId, role)) return;
  requestAnimationFrame(() => {
    openModal(userId, role);
  });
}
function initRoleAccessModal() {
  ensureModalInDom();
  bindModalEvents();
}
export {
  initRoleAccessModal,
  maybeShowRoleAccessModal
};
