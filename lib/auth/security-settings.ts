import { createAdminClient } from '@/lib/supabase/admin';

function admin() {
  return createAdminClient();
}

export async function ensureSecuritySettings(userId) {
  const { error } = await admin()
    .from('security_settings')
    .upsert({ user_id: userId }, { onConflict: 'user_id' });
  if (error) throw error;
}

export function securitySettingsFromDb(row) {
  if (!row) {
    return {
      twoFactorEnabled: false,
      twoFactorMethod: null,
      updatedAt: null,
    };
  }
  return {
    twoFactorEnabled: !!row.two_factor_enabled,
    twoFactorMethod: row.two_factor_method || null,
    updatedAt: row.updated_at,
  };
}

export async function getSecuritySettings(userId) {
  await ensureSecuritySettings(userId);
  const { data, error } = await admin()
    .from('security_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return securitySettingsFromDb(data);
}

export async function updateSecuritySettings(userId, patch) {
  await ensureSecuritySettings(userId);
  const updates = {};
  if (patch.twoFactorEnabled !== undefined) updates.two_factor_enabled = !!patch.twoFactorEnabled;
  if (patch.twoFactorMethod !== undefined) updates.two_factor_method = patch.twoFactorMethod;

  const { data, error } = await admin()
    .from('security_settings')
    .update(updates)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return securitySettingsFromDb(data);
}
