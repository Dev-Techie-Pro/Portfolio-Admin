export const SETTINGS_TABS = ['general', 'profile', 'security', 'notifications', 'system'];

export const SETTINGS_PAGE_META = {
  general: {
    title: 'General Settings',
    subtitle: 'Site title, timezone, and display defaults',
  },
  profile: {
    title: 'Profile',
    subtitle: 'Your public profile and account details',
  },
  security: {
    title: 'Security',
    subtitle: 'Password, two-factor authentication, and sessions',
  },
  notifications: {
    title: 'Notifications',
    subtitle: 'Email alerts, channels, and quiet hours',
  },
  system: {
    title: 'System',
    subtitle: 'Database export and environment configuration',
  },
};

export function resolveSettingsTab(tab) {
  return SETTINGS_TABS.includes(tab) ? tab : 'general';
}

export function getSettingsPageMeta(tab) {
  const resolved = resolveSettingsTab(tab);
  return SETTINGS_PAGE_META[resolved];
}
