import {
  getSettingsTabFromPath
} from "./chunk-DUXXWVBL.js";

// client/modules/shell/sidebarCollapse.ts
var STORAGE_KEY = "pa_sidebar_collapsed";
var DESKTOP_MQ = "(min-width: 861px)";
var LABEL_OVERRIDES = {
  Dashboard: "Dashboard",
  Settings: "Settings",
  general: "General",
  profile: "Profile",
  security: "Security",
  notifications: "Notifications"
};
var tooltipDelegationBound = false;
var navFlyoutBound = false;
var resizeBound = false;
var activeFlyoutGroup = null;
function isDesktop() {
  return window.matchMedia(DESKTOP_MQ).matches;
}
function getSidebar() {
  return document.getElementById("paSidebar");
}
function getCollapseHost() {
  return document.getElementById("paSidebarCollapseHost") || document.querySelector(".pa-sidebar-panel-head") || document.querySelector(".pa-header-top-left") || document.querySelector(".pa-header-page-left");
}
function getTooltipLabel(el) {
  if (el.classList.contains("pa-logo-link")) return "Portfolio Dashboard";
  if (el.id === "paLogoutBtn" || el.classList.contains("pa-rail-logout")) return "Logout";
  if (el.classList.contains("pa-rail-btn") && el.dataset.railTarget) {
    return el.getAttribute("aria-label") || el.dataset.railTarget;
  }
  if (el.classList.contains("pa-sidebar-collapse")) {
    return el.getAttribute("aria-label") || "Toggle sidebar";
  }
  const fromData = el.dataset.nav || el.dataset.settingsTab;
  if (fromData && LABEL_OVERRIDES[fromData]) return LABEL_OVERRIDES[fromData];
  if (fromData) return fromData.replace(/([a-z])([A-Z])/g, "$1 $2");
  const icon = el.querySelector("i");
  const labelEl = el.querySelector(".pa-nav-item-label");
  if (labelEl?.textContent?.trim()) return labelEl.textContent.trim();
  const text = (el.textContent || "").replace(icon?.textContent || "", "").trim();
  return text || null;
}
function getFlyoutAnchor(group) {
  if (!group) return null;
  return group.querySelector(":scope > .pa-nav-parent-row");
}
function getFlyoutSubmenu(group) {
  if (!group) return null;
  return group.querySelector(":scope > .pa-nav-submenu");
}
function refreshSidebarTooltips(sidebar) {
  const collapsed = sidebar.classList.contains("collapsed");
  sidebar.querySelectorAll(
    ".pa-logo-link, .pa-rail-btn, .pa-nav-item, .pa-nav-subitem, .pa-logout, #paLogoutBtn"
  ).forEach((el) => {
    if (collapsed && el.closest("[data-nav-group]")) {
      el.removeAttribute("data-sidebar-tooltip");
      return;
    }
    const label = getTooltipLabel(el);
    if (label) el.setAttribute("data-sidebar-tooltip", label);
    else el.removeAttribute("data-sidebar-tooltip");
  });
}
function ensureTooltipEl() {
  let tip = document.getElementById("paSidebarTooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "paSidebarTooltip";
    tip.className = "pa-sidebar-tooltip";
    tip.setAttribute("role", "tooltip");
    document.body.appendChild(tip);
  }
  return tip;
}
function hideSidebarTooltip() {
  const tip = document.getElementById("paSidebarTooltip");
  if (!tip) return;
  tip.classList.remove("visible");
  tip.textContent = "";
}
function ensureNavFlyout() {
  let flyout = document.getElementById("paNavFlyout");
  if (!flyout) {
    flyout = document.createElement("div");
    flyout.id = "paNavFlyout";
    flyout.className = "pa-nav-flyout";
    flyout.setAttribute("role", "menu");
    flyout.setAttribute("aria-label", "Navigation submenu");
    flyout.setAttribute("aria-hidden", "true");
    document.body.appendChild(flyout);
  }
  return flyout;
}
function isNavFlyoutHoverTarget(node) {
  if (!node) return false;
  const flyout = document.getElementById("paNavFlyout");
  if (flyout && flyout.contains(node)) return true;
  if (activeFlyoutGroup && activeFlyoutGroup.contains(node)) return true;
  return false;
}
function hideNavFlyout() {
  const flyout = document.getElementById("paNavFlyout");
  flyout?.classList.remove("visible");
  flyout?.setAttribute("aria-hidden", "true");
  activeFlyoutGroup?.classList.remove("flyout-open");
  activeFlyoutGroup = null;
}
function showNavFlyout(group) {
  const sidebar = getSidebar();
  if (!group || !sidebar?.classList.contains("collapsed") || !isDesktop()) {
    hideNavFlyout();
    return;
  }
  const submenu = getFlyoutSubmenu(group);
  const groupId = group.dataset.navGroup;
  const railAnchor = groupId ? document.querySelector(`.pa-rail-btn[data-rail-target="${groupId}"]`) : null;
  const anchor = railAnchor || getFlyoutAnchor(group);
  if (!submenu || !anchor) return;
  hideSidebarTooltip();
  hideNavFlyout();
  const flyout = ensureNavFlyout();
  flyout.innerHTML = submenu.innerHTML;
  flyout.querySelectorAll(".pa-nav-group").forEach((nested) => nested.classList.add("open"));
  flyout.setAttribute("aria-hidden", "false");
  flyout.setAttribute("aria-label", group.querySelector(".pa-nav-section-label-text")?.textContent?.trim() || group.dataset.navGroup || "Navigation submenu");
  const rect = anchor.getBoundingClientRect();
  flyout.style.top = `${Math.max(8, rect.top)}px`;
  flyout.style.left = `${rect.right + 4}px`;
  flyout.classList.add("visible");
  group.classList.add("flyout-open");
  activeFlyoutGroup = group;
  const flyoutRect = flyout.getBoundingClientRect();
  if (flyoutRect.bottom > window.innerHeight - 60) {
    flyout.style.top = `${Math.max(60, window.innerHeight - flyoutRect.height - 60)}px`;
  }
}
function isSidebarCollapsedDesktop() {
  const sidebar = getSidebar();
  return !!sidebar?.classList.contains("collapsed") && isDesktop();
}
function bindNavFlyoutDelegation() {
  if (navFlyoutBound) return;
  navFlyoutBound = true;
  document.addEventListener(
    "mouseover",
    (e) => {
      const sidebar = getSidebar();
      if (!sidebar?.classList.contains("collapsed") || !isDesktop()) return;
      const group = e.target.closest(".pa-nav-group[data-nav-group]");
      if (!group || !sidebar.contains(group)) return;
      const anchor = getFlyoutAnchor(group);
      if (!anchor || !group.contains(e.target)) return;
      if (!e.target.closest(".pa-nav-parent-row")) return;
      showNavFlyout(group);
    },
    true
  );
  document.addEventListener(
    "mouseout",
    (e) => {
      const sidebar = getSidebar();
      if (!sidebar?.classList.contains("collapsed")) return;
      const inFlyoutArea = e.target.closest(".pa-nav-group[data-nav-group]") || e.target.closest("#paNavFlyout");
      if (!inFlyoutArea) return;
      const related = e.relatedTarget;
      if (isNavFlyoutHoverTarget(related)) return;
      hideNavFlyout();
    },
    true
  );
  document.addEventListener("click", (e) => {
    if (!isSidebarCollapsedDesktop()) return;
    if (isNavFlyoutHoverTarget(e.target)) return;
    hideNavFlyout();
  }, true);
  document.addEventListener("scroll", hideNavFlyout, true);
  window.addEventListener("blur", hideNavFlyout);
}
function showSidebarTooltip(target) {
  const sidebar = getSidebar();
  if (!sidebar?.classList.contains("collapsed") || !isDesktop()) {
    hideSidebarTooltip();
    return;
  }
  const label = target.getAttribute("data-sidebar-tooltip");
  if (!label) {
    hideSidebarTooltip();
    return;
  }
  const tip = ensureTooltipEl();
  tip.textContent = label;
  const rect = target.getBoundingClientRect();
  tip.style.top = `${rect.top + rect.height / 2}px`;
  tip.style.left = `${rect.right + 4}px`;
  tip.classList.add("visible");
}
function bindSidebarTooltipDelegation() {
  if (tooltipDelegationBound) return;
  tooltipDelegationBound = true;
  document.addEventListener(
    "mouseover",
    (e) => {
      const sidebar = getSidebar();
      if (!sidebar?.classList.contains("collapsed") || !isDesktop()) return;
      if (e.target.closest(".pa-nav-group[data-nav-group]")) return;
      const target = e.target.closest("[data-sidebar-tooltip]");
      if (!target || !sidebar.contains(target)) return;
      showSidebarTooltip(target);
    },
    true
  );
  document.addEventListener(
    "mouseout",
    (e) => {
      const sidebar = getSidebar();
      if (!sidebar?.classList.contains("collapsed")) return;
      const target = e.target.closest("[data-sidebar-tooltip]");
      if (!target || !sidebar.contains(target)) return;
      const related = e.relatedTarget;
      if (related && target.contains(related)) return;
      hideSidebarTooltip();
    },
    true
  );
  document.addEventListener("scroll", hideSidebarTooltip, true);
  window.addEventListener("blur", hideSidebarTooltip);
}
function closeFlyoutMenus(sidebar) {
  sidebar.querySelectorAll(".pa-nav-group.open").forEach((group) => {
    group.classList.remove("open");
    group.querySelector(".pa-nav-toggle")?.setAttribute("aria-expanded", "false");
  });
  hideNavFlyout();
}
function applyCollapsedState(sidebar, collapsed) {
  if (collapsed && isDesktop()) {
    sidebar.classList.add("collapsed");
    closeFlyoutMenus(sidebar);
  } else {
    sidebar.classList.remove("collapsed");
    hideSidebarTooltip();
    hideNavFlyout();
  }
  const btn = document.getElementById("paSidebarCollapse");
  if (btn) {
    const isCollapsed = sidebar.classList.contains("collapsed");
    btn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    btn.setAttribute("aria-label", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
  }
  refreshSidebarTooltips(sidebar);
}
function readStoredCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
function storeCollapsed(collapsed) {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
  }
}
function ensureCollapseButton(sidebar) {
  const host = getCollapseHost();
  if (!host) return null;
  let btn = document.getElementById("paSidebarCollapse");
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pa-sidebar-collapse";
    btn.id = "paSidebarCollapse";
    btn.setAttribute("aria-label", "Collapse sidebar");
    btn.setAttribute("aria-expanded", "true");
    btn.innerHTML = '<i class="ri-menu-fold-line" aria-hidden="true"></i>';
    btn.addEventListener("click", () => {
      if (!isDesktop()) return;
      const next = !sidebar.classList.contains("collapsed");
      applyCollapsedState(sidebar, next);
      storeCollapsed(next);
    });
  }
  if (btn.parentElement !== host) {
    host.insertBefore(btn, host.firstChild);
  }
  return btn;
}
function bindResponsiveCollapse(sidebar) {
  if (resizeBound) return;
  resizeBound = true;
  const mq = window.matchMedia(DESKTOP_MQ);
  const sync = () => {
    if (!sidebar.isConnected) return;
    applyCollapsedState(sidebar, readStoredCollapsed());
  };
  mq.addEventListener("change", sync);
  window.addEventListener("resize", sync, { passive: true });
}
function initSidebarCollapse() {
  const sidebar = getSidebar();
  if (!sidebar) return;
  bindSidebarTooltipDelegation();
  bindNavFlyoutDelegation();
  ensureCollapseButton(sidebar);
  refreshSidebarTooltips(sidebar);
  applyCollapsedState(sidebar, readStoredCollapsed());
  bindResponsiveCollapse(sidebar);
}

// client/modules/shell/sidebarGroupNav.ts
var groupToggleBound = false;
var animReadyScheduled = false;
function ensureSubmenuInnerWrappers() {
  document.querySelectorAll(".pa-nav-group > .pa-nav-submenu").forEach((submenu) => {
    if (submenu.querySelector(":scope > .pa-nav-submenu-inner")) return;
    const inner = document.createElement("div");
    inner.className = "pa-nav-submenu-inner";
    while (submenu.firstChild) inner.appendChild(submenu.firstChild);
    submenu.appendChild(inner);
  });
}
function enableNavAnimations() {
  document.querySelectorAll(".pa-nav-group[data-nav-group]").forEach((group) => {
    group.classList.add("pa-nav-anim-ready");
  });
}
function scheduleNavAnimations() {
  if (animReadyScheduled) return;
  animReadyScheduled = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(enableNavAnimations);
  });
}
function setGroupOpen(group, open) {
  if (!group) return;
  group.classList.add("pa-nav-anim-ready");
  group.classList.toggle("open", open);
  const toggle = group.querySelector(":scope > .pa-nav-parent-row .pa-nav-toggle");
  toggle?.setAttribute("aria-expanded", open ? "true" : "false");
}
function syncGroupChrome(group) {
  const toggle = group.querySelector(":scope > .pa-nav-parent-row .pa-nav-toggle");
  const activeChild = group.querySelector(":scope > .pa-nav-submenu .pa-nav-subitem.active");
  const groupActive = !!activeChild;
  const parentBtn = group.querySelector(":scope > .pa-nav-parent-row .pa-nav-item--parent");
  toggle?.classList.toggle("active", groupActive);
  parentBtn?.classList.toggle("active", groupActive);
  setGroupOpen(group, groupActive);
}
function handleGroupToggle(e) {
  const toggle = e.target.closest(".pa-nav-toggle");
  const parentBtn = e.target.closest(".pa-nav-parent-row .pa-nav-item--parent");
  const trigger = toggle || parentBtn;
  if (!trigger) return;
  const group = trigger.closest(".pa-nav-group[data-nav-group]");
  if (!group || !group.contains(trigger)) return;
  e.preventDefault();
  e.stopPropagation();
  if (isSidebarCollapsedDesktop()) {
    const flyout = document.getElementById("paNavFlyout");
    if (flyout?.classList.contains("visible") && group.classList.contains("flyout-open")) {
      hideNavFlyout();
    } else {
      showNavFlyout(group);
    }
    return;
  }
  hideNavFlyout();
  const nextOpen = !group.classList.contains("open");
  setGroupOpen(group, nextOpen);
}
function openGroupsForActiveRoute() {
  document.querySelectorAll(".pa-nav-group[data-nav-group]").forEach((group) => {
    syncGroupChrome(group);
  });
}
function bindGroupToggleDelegation() {
  if (groupToggleBound) return;
  groupToggleBound = true;
  document.addEventListener("click", handleGroupToggle, true);
}
function initSidebarGroupNav() {
  ensureSubmenuInnerWrappers();
  bindGroupToggleDelegation();
  openGroupsForActiveRoute();
  scheduleNavAnimations();
}
function syncSidebarGroupNav() {
  openGroupsForActiveRoute();
}

// client/modules/shell/settingsNav.ts
function getSettingsGroup() {
  return document.querySelector('[data-nav-group="settings"]');
}
function initSettingsNav() {
  const group = getSettingsGroup();
  if (!group) return;
  const onSettingsRoute = window.location.pathname.includes("/settings");
  if (onSettingsRoute) {
    group.classList.add("open");
    syncSettingsNavTab(getSettingsTabFromPath());
  } else {
    openGroupsForActiveRoute();
  }
}
function syncSettingsNavTab(tab) {
  const group = getSettingsGroup();
  if (!group) return;
  group.classList.add("open");
  group.querySelector(".pa-nav-toggle")?.setAttribute("aria-expanded", "true");
  group.querySelector(".pa-nav-toggle")?.classList.add("active");
  group.querySelectorAll(".pa-nav-subitem").forEach((item) => {
    const isActive = item.dataset.settingsTab === tab;
    item.classList.toggle("active", isActive);
  });
  openGroupsForActiveRoute();
}

// client/utils/user-display.ts
function setImageSrc(container, url, { alt = "" } = {}) {
  if (!container) return;
  container.innerHTML = "";
  if (!url) return;
  const img = document.createElement("img");
  img.src = url;
  img.alt = alt;
  img.decoding = "async";
  container.appendChild(img);
}
var ADMIN_ROLES = ["super_admin", "admin"];
var EDITOR_ROLES = ["super_admin", "admin", "editor"];
function applyUserDisplay(user) {
  if (!user) return;
  const displayName = user.fullName || user.username || user.email || "User";
  const displayRole = user.role ? user.role.replace(/_/g, " ") : "Staff";
  document.querySelectorAll(".pa-user-name").forEach((el) => {
    el.textContent = displayName;
  });
  document.querySelectorAll(".pa-user-role").forEach((el) => {
    el.textContent = displayRole;
  });
  document.querySelectorAll(".pa-user-email").forEach((el) => {
    el.textContent = user.email || "";
  });
  document.querySelectorAll(
    "#paUserMenuAvatar, #paUserMenu .pa-avatar, .pa-header-user .pa-avatar, #paUserDropdownAvatar .pa-avatar, #paRailAvatar .pa-rail-profile-mark"
  ).forEach((el) => {
    renderAvatarElement(el, user.avatarUrl);
  });
  applyRoleBasedAccess(user.role);
}
function pruneInaccessibleSidebarNav(isAdmin) {
  document.querySelectorAll(".pa-admin-only-item").forEach((el) => {
    if (isAdmin) {
      el.removeAttribute("hidden");
      el.removeAttribute("aria-hidden");
      el.style.removeProperty("display");
    } else {
      el.setAttribute("hidden", "");
      el.setAttribute("aria-hidden", "true");
      el.style.display = "none";
    }
  });
}
function applyRoleBasedAccess(role) {
  const isAdmin = ADMIN_ROLES.includes(role);
  const isEditor = EDITOR_ROLES.includes(role);
  const isViewer = role === "viewer";
  document.body.classList.toggle("pa-role-editor", role === "editor");
  document.body.classList.toggle("pa-role-viewer", isViewer);
  document.body.classList.toggle("pa-role-admin", isAdmin);
  document.body.classList.toggle("pa-role-readonly", isViewer);
  document.body.classList.toggle("pa-role-can-edit", isEditor);
  pruneInaccessibleSidebarNav(isAdmin);
}
function renderAvatarElement(container, url) {
  if (!container) return;
  if (url) {
    setImageSrc(container, url);
  } else {
    container.innerHTML = '<i class="ri-user-3-fill"></i>';
  }
}
function previewUserAvatar(url) {
  document.querySelectorAll(
    "#paUserMenuAvatar, #paUserMenu .pa-avatar, .pa-header-user .pa-avatar, #paUserDropdownAvatar .pa-avatar, #paRailAvatar .pa-rail-profile-mark"
  ).forEach((el) => {
    renderAvatarElement(el, url);
  });
}
function renderPreviewAvatar(container, url) {
  if (!container) return;
  if (url) {
    setImageSrc(container, url, { alt: "Profile photo" });
  } else {
    container.innerHTML = '<i class="ri-user-3-fill"></i>';
  }
}
function setCoverImage(imgEl, url) {
  const img = imgEl?.tagName === "IMG" ? imgEl : document.getElementById("coverImage");
  if (!img) return;
  if (url) {
    img.src = url;
    img.hidden = false;
    img.removeAttribute("hidden");
  } else {
    img.removeAttribute("src");
    img.hidden = true;
  }
}

export {
  hideNavFlyout,
  showNavFlyout,
  isSidebarCollapsedDesktop,
  initSidebarCollapse,
  initSidebarGroupNav,
  syncSidebarGroupNav,
  initSettingsNav,
  syncSettingsNavTab,
  applyUserDisplay,
  applyRoleBasedAccess,
  previewUserAvatar,
  renderPreviewAvatar,
  setCoverImage
};
