// client/core/router.ts
var ROUTES = [
  ["/projects", "projects"],
  ["/tags", "tags"],
  ["/blog-categories", "blog-categories"],
  ["/categories", "categories"],
  ["/technologies", "technologies"],
  ["/tool-categories", "tool-categories"],
  ["/tools", "tools"],
  ["/media-library", "media"],
  ["/testimonials", "testimonials"],
  ["/blog-post", "blogposts"],
  ["/experience", "experience"],
  ["/contact-messages", "contact-messages"],
  ["/users", "users"],
  ["/recent-activities", "recent-activities"],
  ["/settings", "settings"],
  ["/login", "login"],
  ["/forget-password", "forgot-password"],
  ["/reset-password", "reset-password"]
];
var SETTINGS_TABS = ["general", "profile", "security", "notifications", "system"];
var SETTINGS_PAGE_META = {
  general: {
    title: "General Settings",
    subtitle: "Site title, timezone, and display defaults"
  },
  profile: {
    title: "Profile",
    subtitle: "Your public profile and account details"
  },
  security: {
    title: "Security",
    subtitle: "Password, two-factor authentication, and sessions"
  },
  notifications: {
    title: "Notifications",
    subtitle: "Email alerts, channels, and quiet hours"
  },
  system: {
    title: "System",
    subtitle: "Database export and environment configuration"
  }
};
function getSettingsTabFromPath(path = window.location.pathname) {
  const match = path.match(/\/settings\/([^/]+)\/?$/);
  const tab = match?.[1];
  return SETTINGS_TABS.includes(tab) ? tab : "general";
}
function getSettingsPageMeta(tab) {
  const resolved = SETTINGS_TABS.includes(tab) ? tab : "general";
  return SETTINGS_PAGE_META[resolved];
}
function getSettingsTabPath(tab) {
  const resolved = SETTINGS_TABS.includes(tab) ? tab : "general";
  return `/settings/${resolved}`;
}
function getCurrentPage(path = window.location.pathname) {
  if (path.includes("/login")) return "login";
  if (path.includes("/forget-password")) return "forgot-password";
  if (path.includes("/reset-password")) return "reset-password";
  for (const [needle, page] of ROUTES) {
    if (path.includes(needle)) return page;
  }
  return "dashboard";
}
var PAGE = getCurrentPage();
function getLoginPath() {
  return "/login";
}

export {
  SETTINGS_TABS,
  getSettingsTabFromPath,
  getSettingsPageMeta,
  getSettingsTabPath,
  getCurrentPage,
  PAGE,
  getLoginPath
};
