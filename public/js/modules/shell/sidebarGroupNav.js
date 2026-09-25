import {
  hideNavFlyout,
  isSidebarCollapsedDesktop,
  showNavFlyout
} from "./sidebarCollapse.js";
let groupToggleBound = false;
let animReadyScheduled = false;
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
export {
  initSidebarGroupNav,
  openGroupsForActiveRoute,
  syncSidebarGroupNav
};
