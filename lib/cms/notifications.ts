import { createAdminClient } from '@/lib/supabase/admin';
import { SITE_ID } from './constants';
import { ADMIN_ROLES, STAFF_ROLES } from '@/lib/auth/constants';
import { CMS_CACHE_TTL, getCached, invalidateCache } from './server-cache';

const NOTIFICATION_COLUMNS = 'id, title, body, icon, category, link_path, read_at, created_at, metadata, activity_id';
const PREFS_COLUMNS = 'user_id, email_project_updates, email_new_messages, email_contact_submissions, email_blog_updates, email_system_alerts, email_marketing, channel_email, channel_browser, frequency, quiet_hours_start, quiet_hours_end, quiet_hours_timezone, updated_at';

function admin() {
  return createAdminClient();
}

const CATEGORY_PREF_MAP = {
  project_updates: 'emailProjectUpdates',
  new_messages: 'emailNewMessages',
  contact_submissions: 'emailContactSubmissions',
  blog_updates: 'emailBlogUpdates',
  system_alerts: 'emailSystemAlerts',
  marketing: 'emailMarketing',
  other: 'emailSystemAlerts',
};

const ACTION_ICON_MAP = {
  'project.created': 'ri-add-circle-line',
  'project.updated': 'ri-pencil-line',
  'project.deleted': 'ri-delete-bin-line',
  'blog_post.created': 'ri-article-line',
  'blog_post.updated': 'ri-article-line',
  'blog_post.deleted': 'ri-delete-bin-line',
  'contact_message.created': 'ri-mail-line',
  'contact_message.replied': 'ri-reply-line',
  'contact_message.deleted': 'ri-delete-bin-line',
  'media.created': 'ri-image-add-line',
  'media.updated': 'ri-image-edit-line',
  'media.deleted': 'ri-delete-bin-line',
  'settings.updated': 'ri-settings-3-line',
  'user.login': 'ri-login-box-line',
  'user.logout': 'ri-logout-box-line',
  'notification.test': 'ri-notification-3-line',
};

const ACTION_LINK_MAP = {
  project: '/projects',
  blog_post: '/blog-post',
  contact_message: '/contact-messages',
  media: '/media-library',
  testimonial: '/testimonials',
  experience: '/experience',
  technology: '/technologies',
  category: '/categories',
  tag: '/tags',
  tool: '/tools',
  settings: '/settings/general',
};

function prefsFromDb(row) {
  if (!row) return null;
  return {
    emailProjectUpdates: row.email_project_updates,
    emailNewMessages: row.email_new_messages,
    emailContactSubmissions: row.email_contact_submissions,
    emailBlogUpdates: row.email_blog_updates,
    emailSystemAlerts: row.email_system_alerts,
    emailMarketing: row.email_marketing,
    channelEmail: row.channel_email,
    channelBrowser: row.channel_browser,
    frequency: row.frequency || 'instant',
    quietHoursStart: row.quiet_hours_start?.slice(0, 5) || '22:00',
    quietHoursEnd: row.quiet_hours_end?.slice(0, 5) || '07:00',
    quietHoursTimezone: row.quiet_hours_timezone || '(GMT+05:00) Islamabad, Pakistan',
    updatedAt: row.updated_at,
  };
}

function prefsToDb(payload) {
  const patch = {};
  if (payload.emailProjectUpdates !== undefined) patch.email_project_updates = !!payload.emailProjectUpdates;
  if (payload.emailNewMessages !== undefined) patch.email_new_messages = !!payload.emailNewMessages;
  if (payload.emailContactSubmissions !== undefined) patch.email_contact_submissions = !!payload.emailContactSubmissions;
  if (payload.emailBlogUpdates !== undefined) patch.email_blog_updates = !!payload.emailBlogUpdates;
  if (payload.emailSystemAlerts !== undefined) patch.email_system_alerts = !!payload.emailSystemAlerts;
  if (payload.emailMarketing !== undefined) patch.email_marketing = !!payload.emailMarketing;
  if (payload.channelEmail !== undefined) patch.channel_email = !!payload.channelEmail;
  if (payload.channelBrowser !== undefined) patch.channel_browser = !!payload.channelBrowser;
  if (payload.frequency !== undefined) patch.frequency = payload.frequency;
  if (payload.quietHoursStart !== undefined) patch.quiet_hours_start = payload.quietHoursStart;
  if (payload.quietHoursEnd !== undefined) patch.quiet_hours_end = payload.quietHoursEnd;
  if (payload.quietHoursTimezone !== undefined) patch.quiet_hours_timezone = payload.quietHoursTimezone;
  return patch;
}

function notificationFromDb(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body || '',
    icon: row.icon || 'ri-information-line',
    category: row.category || 'other',
    linkPath: row.link_path || '',
    read: !!row.read_at,
    readAt: row.read_at,
    createdAt: row.created_at,
    metadata: row.metadata || {},
  };
}

export async function ensureNotificationPreferences(userId) {
  const client = admin();
  const { error } = await client
    .from('notification_preferences')
    .upsert({ user_id: userId }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function getNotificationPreferences(userId) {
  await ensureNotificationPreferences(userId);
  const { data, error } = await admin()
    .from('notification_preferences')
    .select(PREFS_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return prefsFromDb(data);
}

async function loadNotificationPreferencesForUsers(userIds = []) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const map = new Map();
  if (!uniqueIds.length) return map;

  await Promise.all(uniqueIds.map((userId) => ensureNotificationPreferences(userId)));

  const { data, error } = await admin()
    .from('notification_preferences')
    .select(PREFS_COLUMNS)
    .in('user_id', uniqueIds);
  if (error) throw error;

  for (const row of data || []) {
    map.set(row.user_id, prefsFromDb(row));
  }
  return map;
}

export async function saveNotificationPreferences(userId, payload) {
  await ensureNotificationPreferences(userId);
  const patch = prefsToDb(payload);
  if (!Object.keys(patch).length) return getNotificationPreferences(userId);

  const { data, error } = await admin()
    .from('notification_preferences')
    .update(patch)
    .eq('user_id', userId)
    .select(PREFS_COLUMNS)
    .single();
  if (error) throw error;
  return prefsFromDb(data);
}

export async function getUserNotifications(userId, { limit = 50 } = {}) {
  return getCached(`cms:notifications:${userId}`, CMS_CACHE_TTL.notifications, async () => {
    const { data, error } = await admin()
      .from('user_notifications')
      .select(NOTIFICATION_COLUMNS)
      .eq('user_id', userId)
      .eq('site_id', SITE_ID)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    const notifications = (data || []).map(notificationFromDb);
    const unreadCount = notifications.filter((n) => !n.read).length;
    return { notifications, unreadCount };
  });
}

export async function getUnreadNotificationCount(userId) {
  const { count, error } = await admin()
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('site_id', SITE_ID)
    .is('read_at', null);
  if (error) throw error;
  return count || 0;
}

export function invalidateUserNotificationCache(userId) {
  if (userId) invalidateCache(`cms:notifications:${userId}`);
}

export async function createUserNotification({
  userId,
  actorUserId = null,
  category = 'other',
  title,
  body = null,
  icon = null,
  linkPath = null,
  metadata = {},
  activityId = null,
  force = false,
  prefs = null,
}) {
  if (!userId || !title) return null;

  if (!force) {
    const resolvedPrefs = prefs ?? await getNotificationPreferences(userId);
    const prefKey = CATEGORY_PREF_MAP[category] || CATEGORY_PREF_MAP.other;
    if (!resolvedPrefs?.[prefKey]) return null;
    if (!resolvedPrefs.channelBrowser) return null;
    if (isQuietHours(resolvedPrefs) && category !== 'system_alerts' && category !== 'new_messages') {
      return null;
    }
  }

  const { data, error } = await admin()
    .from('user_notifications')
    .insert({
      site_id: SITE_ID,
      user_id: userId,
      actor_user_id: actorUserId,
      category,
      title,
      body,
      icon: icon || ACTION_ICON_MAP[metadata?.action] || 'ri-information-line',
      link_path: linkPath,
      metadata,
      activity_id: activityId,
    })
    .select(NOTIFICATION_COLUMNS)
    .single();

  if (error) {
    console.warn('[notifications] failed to create notification:', error.message);
    return null;
  }
  invalidateUserNotificationCache(userId);
  return notificationFromDb(data);
}

export async function markNotificationsRead(userId, { ids = null, all = false } = {}) {
  const patch = { read_at: new Date().toISOString() };
  let query = admin()
    .from('user_notifications')
    .update(patch)
    .eq('user_id', userId)
    .eq('site_id', SITE_ID)
    .is('read_at', null);

  if (!all && Array.isArray(ids) && ids.length) {
    query = query.in('id', ids);
  } else if (!all) {
    return { updated: 0 };
  }

  const { data, error } = await query.select('id');
  if (error) throw error;
  invalidateUserNotificationCache(userId);
  const unreadCount = await getUnreadNotificationCount(userId);
  return { updated: (data || []).length, unreadCount };
}

export async function clearUserNotifications(userId) {
  const { error } = await admin()
    .from('user_notifications')
    .delete()
    .eq('user_id', userId)
    .eq('site_id', SITE_ID);
  if (error) throw error;
  invalidateUserNotificationCache(userId);
  return { cleared: true };
}

export async function deleteUserNotification(userId, notificationId) {
  const { error } = await admin()
    .from('user_notifications')
    .delete()
    .eq('user_id', userId)
    .eq('id', notificationId);
  if (error) throw error;
  invalidateUserNotificationCache(userId);
  return { deleted: true };
}

async function getStaffUserIds(excludeUserId = null) {
  const { data, error } = await admin()
    .from('profiles')
    .select('id')
    .eq('site_id', SITE_ID)
    .in('role', STAFF_ROLES);
  if (error) throw error;
  return (data || [])
    .map((row) => row.id)
    .filter((id) => id && id !== excludeUserId);
}

export async function getAdminUserIds() {
  const { data, error } = await admin()
    .from('profiles')
    .select('id, email, full_name, username, role')
    .eq('site_id', SITE_ID)
    .in('role', ADMIN_ROLES);
  if (error) throw error;
  return data || [];
}

async function resolveActivityNotificationRecipients(activityRow) {
  const actorUserId = activityRow?.user_id || null;
  const admins = await getAdminUserIds();
  const adminIds = admins.map((row) => row.id).filter(Boolean);
  const recipients = new Set(adminIds);

  if (actorUserId && !adminIds.includes(actorUserId)) {
    recipients.add(actorUserId);
  }

  return [...recipients];
}

function resolveCategory(activity) {
  const action = String(activity?.metadata?.action || '').toLowerCase();
  const entity = String(activity?.metadata?.entity || '').toLowerCase();

  if (action.includes('contact_message') && action.includes('replied')) return 'new_messages';
  if (action.includes('contact_message') || entity === 'contact_message') return 'contact_submissions';
  if (action.startsWith('project') || entity === 'project') return 'project_updates';
  if (action.startsWith('blog') || entity === 'blog_post') return 'blog_updates';
  if (activity?.type === 'system_event') return 'system_alerts';
  if (action.includes('marketing')) return 'marketing';
  return 'other';
}

function resolveLinkPath(activity) {
  const entity = String(activity?.metadata?.entity || '').toLowerCase();
  if (ACTION_LINK_MAP[entity]) return ACTION_LINK_MAP[entity];
  const action = String(activity?.metadata?.action || '');
  const prefix = action.split('.')[0];
  return ACTION_LINK_MAP[prefix] || '';
}

function isQuietHours(prefs) {
  if (!prefs?.quietHoursStart || !prefs?.quietHoursEnd) return false;
  try {
    const now = new Date();
    const [sh, sm] = prefs.quietHoursStart.split(':').map(Number);
    const [eh, em] = prefs.quietHoursEnd.split(':').map(Number);
    const minutes = now.getHours() * 60 + now.getMinutes();
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (start === end) return false;
    if (start < end) return minutes >= start && minutes < end;
    return minutes >= start || minutes < end;
  } catch {
    return false;
  }
}

/** Fan out a recorded activity to admin inboxes (+ actor for non-admin staff). */
export async function dispatchNotificationsFromActivity(activityRow) {
  if (!activityRow?.action_title) return { created: 0 };

  const actorUserId = activityRow.user_id || null;
  const recipients = await resolveActivityNotificationRecipients(activityRow);
  if (!recipients.length) return { created: 0 };

  const category = resolveCategory(activityRow);
  const linkPath = resolveLinkPath(activityRow);
  const icon = ACTION_ICON_MAP[activityRow.metadata?.action] || 'ri-information-line';
  let created = 0;

  const prefsByUser = await loadNotificationPreferencesForUsers(recipients);

  for (const userId of recipients) {
    const row = await createUserNotification({
      userId,
      actorUserId,
      category,
      title: activityRow.action_title,
      body: activityRow.action_description,
      icon,
      linkPath,
      metadata: activityRow.metadata || {},
      activityId: activityRow.id,
      prefs: prefsByUser.get(userId),
    });
    if (row) created += 1;
  }

  return { created };
}

export async function sendTestNotification(userId) {
  return createUserNotification({
    userId,
    category: 'system_alerts',
    title: 'Test notification',
    body: 'This is a test notification from your notification settings.',
    icon: 'ri-notification-3-line',
    linkPath: '/settings/notifications',
    metadata: { action: 'notification.test' },
    force: true,
  });
}
