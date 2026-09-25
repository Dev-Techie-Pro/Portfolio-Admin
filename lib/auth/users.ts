import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { SITE_ID } from '@/lib/cms/constants';
import { profileFromDb } from '@/lib/auth/profile';
import { ADMIN_ROLES, getCreatableRoles } from '@/lib/auth/constants';

function admin() {
  return createAdminClient();
}

function deriveUsername(email, fullName, username) {
  const explicit = (username || '').trim();
  if (explicit) return explicit;
  const fromName = (fullName || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  if (fromName) return fromName;
  return String(email || '').split('@')[0]?.trim() || 'user';
}

export function generateTemporaryPassword(length = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export async function listStaffUsers() {
  const { data, error } = await admin()
    .from('profiles')
    .select('id, full_name, username, email, role, is_active, created_at, last_login_at')
    .eq('site_id', SITE_ID)
    .in('role', ['super_admin', 'admin', 'editor', 'viewer'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    fullName: row.full_name || '',
    username: row.username || '',
    email: row.email || '',
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  }));
}

export async function createStaffUser({
  email,
  fullName,
  username,
  role = 'editor',
  password,
}, { actorRole }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedName = String(fullName || '').trim();
  const normalizedRole = String(role || 'editor').trim();

  if (!normalizedEmail) throw new Error('Email is required.');
  if (!normalizedName) throw new Error('Full name is required.');
  const allowedRoles = getCreatableRoles(actorRole);
  if (!allowedRoles.includes(normalizedRole)) {
    throw new Error(`Invalid role. Allowed roles: ${allowedRoles.map((r) => r.replace(/_/g, ' ')).join(', ')}.`);
  }
  if (actorRole !== 'super_admin' && actorRole !== 'admin') {
    throw new Error('Only administrators can create users.');
  }

  const tempPassword = password?.trim() || generateTemporaryPassword();
  if (tempPassword.length < 8) throw new Error('Password must be at least 8 characters.');

  const client = admin();
  const resolvedUsername = deriveUsername(normalizedEmail, normalizedName, username);

  const { data: emailConflict } = await client
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();
  if (emailConflict) throw new Error(`Email "${normalizedEmail}" is already in use.`);

  const { data: usernameConflict } = await client
    .from('profiles')
    .select('id')
    .eq('username', resolvedUsername)
    .maybeSingle();
  if (usernameConflict) throw new Error(`Username "${resolvedUsername}" is already taken.`);

  const { data: created, error: createError } = await client.auth.admin.createUser({
    email: normalizedEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: normalizedName,
      username: resolvedUsername,
    },
  });

  if (createError) throw new Error(createError.message);
  const userId = created.user?.id;
  if (!userId) throw new Error('User account was not created.');

  const { data: profileRow, error: profileError } = await client
    .from('profiles')
    .update({
      role: normalizedRole,
      full_name: normalizedName,
      username: resolvedUsername,
      email: normalizedEmail,
      is_active: true,
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (profileError) {
    await client.auth.admin.deleteUser(userId).catch(() => {});
    throw profileError;
  }

  return {
    user: {
      ...profileFromDb(profileRow),
      id: userId,
    },
    credentials: {
      email: normalizedEmail,
      password: tempPassword,
      role: normalizedRole,
    },
  };
}

async function getStaffUserById(userId) {
  const { data, error } = await admin()
    .from('profiles')
    .select('id, full_name, username, email, role, is_active, created_at, last_login_at, deleted_at')
    .eq('id', userId)
    .eq('site_id', SITE_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.deleted_at) return null;
  return {
    id: data.id,
    fullName: data.full_name || '',
    username: data.username || '',
    email: data.email || '',
    role: data.role,
    isActive: data.is_active,
    createdAt: data.created_at,
    lastLoginAt: data.last_login_at,
  };
}

function assertCanManageUsers(actorRole) {
  if (!ADMIN_ROLES.includes(actorRole)) {
    throw new Error('Only administrators can manage users.');
  }
}

function assertCanModifyTarget(actorRole, targetRole, { self = false } = {}) {
  if (self) throw new Error('You cannot perform this action on your own account.');
  if (targetRole === 'super_admin' && actorRole !== 'super_admin') {
    throw new Error('Only a super admin can modify super admin accounts.');
  }
}

export async function updateStaffUser(userId, payload, { actorId, actorRole }) {
  assertCanManageUsers(actorRole);

  const existing = await getStaffUserById(userId);
  if (!existing) throw new Error('User not found.');

  const isSelf = actorId === userId;
  assertCanModifyTarget(actorRole, existing.role, { self: isSelf });

  const client = admin();
  const updates = {};

  if ('fullName' in payload) {
    const fullName = String(payload.fullName || '').trim();
    if (!fullName) throw new Error('Full name is required.');
    updates.full_name = fullName;
  }

  if ('username' in payload) {
    const username = String(payload.username || '').trim();
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
    const email = String(payload.email || '').trim().toLowerCase();
    if (!email) throw new Error('Email is required.');
    if (email !== existing.email) {
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
    updates.email = email;
  }

  if ('role' in payload && payload.role !== existing.role) {
    if (isSelf) throw new Error('You cannot change your own role.');
    assertCanModifyTarget(actorRole, existing.role);
    const normalizedRole = String(payload.role || '').trim();
    const allowedRoles = getCreatableRoles(actorRole);
    if (!allowedRoles.includes(normalizedRole)) {
      throw new Error(`Invalid role. Allowed roles: ${allowedRoles.map((r) => r.replace(/_/g, ' ')).join(', ')}.`);
    }
    updates.role = normalizedRole;
  }

  if ('isActive' in payload && payload.isActive !== existing.isActive) {
    if (isSelf) throw new Error('You cannot deactivate your own account.');
    assertCanModifyTarget(actorRole, existing.role);
    updates.is_active = !!payload.isActive;
  }

  if (!Object.keys(updates).length) {
    return existing;
  }

  const { data, error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('id, full_name, username, email, role, is_active, created_at, last_login_at')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Username or email is already in use.');
    throw error;
  }

  return {
    id: data.id,
    fullName: data.full_name || '',
    username: data.username || '',
    email: data.email || '',
    role: data.role,
    isActive: data.is_active,
    createdAt: data.created_at,
    lastLoginAt: data.last_login_at,
  };
}

export async function deleteStaffUser(userId, { actorId, actorRole }) {
  assertCanManageUsers(actorRole);

  if (actorId === userId) {
    throw new Error('You cannot delete your own account from here.');
  }

  const existing = await getStaffUserById(userId);
  if (!existing) throw new Error('User not found.');

  assertCanModifyTarget(actorRole, existing.role);

  const client = admin();
  const deletedAt = new Date().toISOString();

  const { error: profileError } = await client
    .from('profiles')
    .update({ deleted_at: deletedAt, is_active: false })
    .eq('id', userId);

  if (profileError) throw profileError;

  const { error: authError } = await client.auth.admin.deleteUser(userId);
  if (authError) throw new Error(authError.message);

  return { id: userId, deletedAt };
}

export async function resetStaffUserCredentials(userId, { actorId, actorRole }) {
  assertCanManageUsers(actorRole);

  if (actorId === userId) {
    throw new Error('You cannot reset your own credentials from here.');
  }

  const existing = await getStaffUserById(userId);
  if (!existing) throw new Error('User not found.');

  assertCanModifyTarget(actorRole, existing.role);

  const tempPassword = generateTemporaryPassword();
  const client = admin();
  const { error } = await client.auth.admin.updateUserById(userId, { password: tempPassword });
  if (error) throw new Error(error.message);

  return {
    user: existing,
    credentials: {
      email: existing.email,
      password: tempPassword,
      role: existing.role,
      reset: true,
    },
  };
}
