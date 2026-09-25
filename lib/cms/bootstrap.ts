import { getKeysForPage } from './prefetch-config';
import {
  getProjects,
  getCategories,
  getTechnologies,
  getMedia,
  getTestimonials,
  getBlogPosts,
  getExperience,
  getContactMessagesPage,
  CONTACT_PAGE_SIZE,
  getRecentActivitiesPayload,
  getToolItems,
  getToolCategories,
  getBlogCategories,
  getProjectTags,
  getSettings,
  getAppearance,
  getContactColumnVisibility,
} from './repository';
import { getNotificationPreferences, getUserNotifications } from './notifications';
import { getProfileForUser } from '@/lib/auth/profile';

const KEY_FETCHERS = {
  pa_projects: getProjects,
  pa_category_meta: getCategories,
  pa_technologies: getTechnologies,
  pa_media_library: getMedia,
  pa_testimonials: getTestimonials,
  pa_blog_posts: () => getBlogPosts({ includeContent: false }),
  pa_experience: getExperience,
  pa_contact_messages: () => getContactMessagesPage({ limit: CONTACT_PAGE_SIZE }),
  pa_recent_activities: getRecentActivitiesPayload,
  pa_tools: getToolItems,
  pa_tool_categories: getToolCategories,
  pa_blog_categories: getBlogCategories,
  pa_project_tags: getProjectTags,
  pa_settings: getSettings,
  pa_msg_column_visibility: getContactColumnVisibility,
  pa_notification_preferences: (auth) => getNotificationPreferences(auth.user.id),
  pa_notifications: (auth) => getUserNotifications(auth.user.id),
};

function sessionFromProfile(userId, authEmail, profile) {
  return {
    id: userId,
    email: profile?.email || authEmail || '',
    role: profile?.role ?? 'viewer',
    fullName: profile?.fullName || null,
    username: profile?.username || null,
    avatarUrl: profile?.avatarUrl || null,
    coverImageUrl: profile?.coverImageUrl || null,
  };
}

async function fetchPageData(page, auth) {
  const pageKeys = getKeysForPage(page);
  const dataKeys = pageKeys.filter((key) => key !== 'appearance_settings_v2');
  const entries = await Promise.all(
    dataKeys.map(async (key) => {
      const fetcher = KEY_FETCHERS[key];
      if (!fetcher) return [key, null];
      try {
        return [key, await fetcher(auth)];
      } catch (err) {
        console.error(`[bootstrap] failed to load "${key}":`, err);
        return [key, null];
      }
    }),
  );

  const data = Object.fromEntries(entries);
  if (pageKeys.includes('appearance_settings_v2')) {
    data.appearance_settings_v2 = data.appearance_settings_v2 ?? null;
  }

  if (!data.pa_notifications) {
    try {
      data.pa_notifications = await getUserNotifications(auth.user.id);
    } catch (err) {
      console.error('[bootstrap] failed to load "pa_notifications":', err);
      data.pa_notifications = null;
    }
  }

  return data;
}

export async function getBootstrapPayload(page, auth) {
  const [profile, appearance, data] = await Promise.all([
    getProfileForUser(auth.user),
    getAppearance(),
    fetchPageData(page, auth),
  ]);

  const sessionUser = sessionFromProfile(auth.user.id, auth.user.email, profile);

  if (getKeysForPage(page).includes('appearance_settings_v2')) {
    data.appearance_settings_v2 = appearance;
  }

  return {
    profile,
    session: { user: sessionUser },
    appearance,
    data,
    fetchedAt: new Date().toISOString(),
  };
}
