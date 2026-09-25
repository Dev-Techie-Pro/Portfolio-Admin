import { createHash, randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

function admin() {
  return createAdminClient();
}

function hashCode(code) {
  return createHash('sha256').update(String(code).trim().toUpperCase()).digest('hex');
}

function formatCode(bytes) {
  const raw = bytes.toString('hex').slice(0, 12).toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i += 1) {
    codes.push(formatCode(randomBytes(8)));
  }
  return codes;
}

export async function replaceUserBackupCodes(userId, plainCodes) {
  const client = admin();
  const { error: deleteError } = await client
    .from('two_factor_backup_codes')
    .delete()
    .eq('user_id', userId);
  if (deleteError) throw deleteError;

  const rows = plainCodes.map((code) => ({
    user_id: userId,
    code_hash: hashCode(code),
  }));

  const { error } = await client.from('two_factor_backup_codes').insert(rows);
  if (error) throw error;
  return plainCodes;
}

export async function countUnusedBackupCodes(userId) {
  const { count, error } = await admin()
    .from('two_factor_backup_codes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('used_at', null);
  if (error) throw error;
  return count || 0;
}

export async function consumeBackupCode(userId, code) {
  const client = admin();
  const codeHash = hashCode(code);
  const { data, error } = await client
    .from('two_factor_backup_codes')
    .select('id')
    .eq('user_id', userId)
    .eq('code_hash', codeHash)
    .is('used_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;

  const { error: updateError } = await client
    .from('two_factor_backup_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', data.id);
  if (updateError) throw updateError;
  return true;
}

export async function clearUserBackupCodes(userId) {
  const { error } = await admin()
    .from('two_factor_backup_codes')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}
