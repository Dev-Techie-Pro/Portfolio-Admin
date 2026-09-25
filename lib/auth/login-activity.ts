import { createAdminClient } from '@/lib/supabase/admin';
import { SESSION_LIFETIME_MS } from './constants';
import { getRequestClientMeta, formatStoredActivityLocation, isLoopbackIp, normalizeIpAddress } from './request-meta';

function normalizeStoredIp(ip) {
  const normalized = normalizeIpAddress(ip);
  if (!normalized || isLoopbackIp(normalized)) return null;
  return normalized;
}

function admin() {
  return createAdminClient();
}

function activityFromDb(row) {
  const profile = row.profiles || null;
  const userName = profile?.full_name || profile?.username || row.email || null;
  const userEmail = profile?.email || row.email || null;

  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    userName,
    userEmail,
    status: row.status,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    deviceLabel: row.device_label,
    deviceIcon: row.device_icon,
    location: formatStoredActivityLocation(row),
    failureReason: row.failure_reason,
    isCurrent: row.is_current,
    createdAt: row.created_at,
  };
}

export async function findUserIdByEmail(email) {
  if (!email) return null;
  const { data } = await admin()
    .from('profiles')
    .select('id')
    .ilike('email', email.trim())
    .maybeSingle();
  return data?.id || null;
}

/**
 * Record a login-related event for the activity feed.
 */
export async function recordLoginActivity({
  userId,
  email,
  status,
  failureReason = null,
  request,
  isCurrent = false,
}) {
  if (!userId) return null;

  const meta = request ? await getRequestClientMeta(request) : {
    ipAddress: null,
    userAgent: null,
    location: 'Unknown location',
    deviceLabel: 'Unknown device',
    deviceIcon: 'ri-device-line',
  };

  const sb = admin();

  if (status === 'success' && isCurrent) {
    await sb
      .from('login_activity')
      .update({ is_current: false })
      .eq('user_id', userId)
      .eq('is_current', true);

    await sb
      .from('user_sessions')
      .update({ is_current: false })
      .eq('user_id', userId)
      .eq('is_current', true);
  }

  if (status === 'logout') {
    const now = new Date().toISOString();
    await sb
      .from('login_activity')
      .update({ is_current: false })
      .eq('user_id', userId)
      .eq('is_current', true);

    await sb
      .from('user_sessions')
      .update({ is_current: false, revoked_at: now })
      .eq('user_id', userId)
      .eq('is_current', true);
  }

  const { data, error } = await sb
    .from('login_activity')
    .insert({
      user_id: userId,
      email: email || null,
      status,
      ip_address: normalizeStoredIp(meta.ipAddress),
      user_agent: meta.userAgent,
      device_label: meta.deviceLabel,
      device_icon: meta.deviceIcon,
      location: meta.location,
      failure_reason: failureReason,
      is_current: status === 'success' && isCurrent,
    })
    .select('*')
    .single();

  if (error) throw error;

  if (status === 'success' && isCurrent) {
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS).toISOString();
    await sb.from('user_sessions').insert({
      user_id: userId,
      ip_address: normalizeStoredIp(meta.ipAddress),
      user_agent: meta.userAgent,
      device_label: meta.deviceLabel,
      location: meta.location,
      is_current: true,
      expires_at: expiresAt,
    });
  }

  return activityFromDb(data);
}

export async function getLoginActivity(userId, { limit = 25 } = {}) {
  const { data, error } = await admin()
    .from('login_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(activityFromDb);
}

/** All staff login events — admin / super_admin only. */
export async function getAllLoginActivity({ limit = 50 } = {}) {
  const { data, error } = await admin()
    .from('login_activity')
    .select('*, profiles(full_name, username, email)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(activityFromDb);
}

export async function revokeAllUserSessions(userId) {
  const sb = admin();
  const now = new Date().toISOString();

  await sb.auth.admin.signOut(userId, 'global');

  await sb
    .from('user_sessions')
    .update({ is_current: false, revoked_at: now })
    .eq('user_id', userId);

  await sb
    .from('login_activity')
    .update({ is_current: false })
    .eq('user_id', userId)
    .eq('is_current', true);
}
