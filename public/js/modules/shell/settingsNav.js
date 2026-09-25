import { getSettingsTabFromPath } from "../../core/router.js";
import { openGroupsForActiveRoute } from "./sidebarGroupNav.js";
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
export {
  initSettingsNav,
  syncSettingsNavTab
};
