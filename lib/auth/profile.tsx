import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { isImageUrl, reconcileEntityMediaForRefs } from '@/lib/cms/media-sync';

function admin() {
  return createAdminClient();
}

function deriveUsername(email, metadata = {}) {
  const fromMeta = (metadata.username || '').trim();
  if (fromMeta) return fromMeta;
  const local = String(email || '').split('@')[0]?.trim();
  return local || 'user';
}

async function getDefaultSiteId(client) {
  const { data, error } = await client
    .from('sites')
    .select('id')
    .eq('slug', 'default')
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error('Default site is not configured.');
  return data.id;
}

async function ensureUserPreferenceRows(client, userId) {
  const tables = [
    'notification_preferences',
    'security_settings',
  ];
  for (const table of tables) {
    const { error } = await client.from(table).upsert({ user_id: userId }, { onConflict: 'user_id' });
    if (error) throw error;
  }
}

export async function ensureProfileForUser(user) {
  const userId = user?.id;
  if (!userId) throw new Error('User id is required.');

  const existing = await getProfileByUserId(userId);
  if (existing) return existing;

  const client = admin();
  const { data: authData, error: authError } = await client.auth.admin.getUserById(userId);
  if (authError) throw authError;

  const authUser = authData?.user;
  const email = authUser?.email || user.email || '';
  const metadata = authUser?.user_metadata || {};
  const siteId = await getDefaultSiteId(client);
  const fullName = (metadata.full_name || '').trim() || deriveUsername(email);
  const username = deriveUsername(email, metadata);

  const { data, error } = await client
    .from('profiles')
    .insert({
      id: userId,
      site_id: siteId,
      role: 'viewer',
      full_name: fullName,
      username,
      email,
    })
    .select('*')
    .single();

  if (error?.code === '23505') {
    return getProfileByUserId(userId);
  }
  if (error) throw error;

  await ensureUserPreferenceRows(client, userId);
  return profileFromDb(data);
}

function formatDob(value) {
  if (!value) return '';
  const str = String(value);
  return str.length >= 10 ? str.slice(0, 10) : str;
}

export function profileFromDb(row) {
  if (!row) return null;
  let social = row.social_links;
  if (typeof social === 'string') {
    try { social = JSON.parse(social); } catch { social = []; }
  }
  return {
    id: row.id || '',
    fullName: row.full_name || '',
    username: row.username || '',
    email: row.email || '',
    role: row.role || 'viewer',
    phone: row.phone || '',
    dob: formatDob(row.date_of_birth),
    bio: row.bio || '',
    location: row.location || '',
    website: row.website_url || '',
    avatarUrl: row.avatar_url || '',
    coverImageUrl: row.cover_image_url || '',
    socialLinks: Array.isArray(social) ? social : [],
  };
}

export const getProfileByUserId = cache(async (userId) => {
  const { data, error } = await admin()
    .from('profiles')
    .select(`
      id,
      role,
      full_name,
      username,
      email,
      phone,
      date_of_birth,
      bio,
      location,
      website_url,
      avatar_url,
      cover_image_url,
      social_links
    `)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return profileFromDb(data);
});

export async function updateProfileByUserId(userId, payload, options = {}) {
  const { canEditRole = false } = options;
  const client = admin();

  const { data: existing, error: fetchError } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) throw new Error('Profile not found.');

  const updates = {};

  if ('fullName' in payload) {
    updates.full_name = (payload.fullName || '').trim() || null;
  }

  if ('username' in payload) {
    const username = (payload.username || '').trim();
    if (username && username !== existing.username) {
      const { data: conflict } = await client
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', userId)
        .maybeSingle();
      if (conflict) throw new Error(`Username "${username}" is already taken.`);
    }
    updates.username = username || null;
  }

  if ('email' in payload) {
    const email = (payload.email || '').trim();
    if (email && email !== existing.email) {
      const { data: emailConflict } = await client
        .from('profiles')
        .select('id')
        .eq('email', email)
        .neq('id', userId)
        .maybeSingle();
      if (emailConflict) throw new Error(`Email "${email}" is already in use.`);

      const { error: authError } = await client.auth.admin.updateUserById(userId, { email });
      if (authError) throw new Error(authError.message);
    }
    updates.email = email || null;
  }

  if ('phone' in payload) updates.phone = (payload.phone || '').trim() || null;
  if ('dob' in payload) updates.date_of_birth = payload.dob || null;
  if ('bio' in payload) updates.bio = (payload.bio || '').trim() || null;
  if ('location' in payload) updates.location = (payload.location || '').trim() || null;
  if ('website' in payload) updates.website_url = (payload.website || '').trim() || null;
  if ('avatarUrl' in payload) updates.avatar_url = payload.avatarUrl || null;
  if ('coverImageUrl' in payload) updates.cover_image_url = payload.coverImageUrl || null;
  if ('socialLinks' in payload) {
    updates.social_links = Array.isArray(payload.socialLinks) ? payload.socialLinks : [];
  }

  if (canEditRole && payload.role) {
    updates.role = payload.role;
  }

  if (!Object.keys(updates).length) {
    return profileFromDb(existing);
  }

  const { data, error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('Username or email is already in use.');
    throw error;
  }

  if ('avatarUrl' in payload || 'coverImageUrl' in payload) {
    try {
      const refs = [];
      const name = data.full_name || data.username || 'profile';
      if (isImageUrl(payload.avatarUrl ?? data.avatar_url)) {
        refs.push({ url: payload.avatarUrl ?? data.avatar_url, folder: 'avatars', alt: name });
      }
      if (isImageUrl(payload.coverImageUrl ?? data.cover_image_url)) {
        refs.push({ url: payload.coverImageUrl ?? data.cover_image_url, folder: 'avatars', alt: `${name} cover` });
      }
      if (refs.length) await reconcileEntityMediaForRefs(refs);
    } catch (err) {
      console.error('[profile] media reconcile failed:', err);
    }
  }

  return profileFromDb(data);
}

export async function getProfileForUser(user) {
  const profile = await getProfileByUserId(user.id);
  if (profile) return profile;
  return ensureProfileForUser(user);
}

export async function getSessionUserPayload(userId, authEmail) {
  const profile = await getProfileByUserId(userId);
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
