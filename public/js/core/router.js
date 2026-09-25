const ROUTES = [
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
const SETTINGS_TABS = ["general", "profile", "security", "notifications", "integrations", "logs", "system"];
const SETTINGS_PAGE_META = {
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
  integrations: {
    title: "Integrations",
    subtitle: "Connect third-party services and API credentials"
  },
  logs: {
    title: "Activity Logs",
    subtitle: "Audit trail, traffic events, and system messages"
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
const PAGE = getCurrentPage();
function getLoginPath() {
  return "/login";
}
function getAuthPath(page) {
  const map = {
    "login.html": "/login",
    "forget-password.html": "/forget-password",
    "reset-password.html": "/reset-password"
  };
  return map[page] || "/login";
}
export {
  PAGE,
  SETTINGS_PAGE_META,
  SETTINGS_TABS,
  getAuthPath,
  getCurrentPage,
  getLoginPath,
  getSettingsPageMeta,
  getSettingsTabFromPath,
  getSettingsTabPath
};
