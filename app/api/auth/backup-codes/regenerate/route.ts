import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { guardAuthenticated } from '@/lib/auth/guard';
import { generateBackupCodes, replaceUserBackupCodes } from '@/lib/auth/backup-codes';
import { listTotpFactors } from '@/lib/auth/mfa';
import { getSecuritySettings } from '@/lib/auth/security-settings';

export async function POST(request) {
  const auth = await guardAuthenticated();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const currentPassword = body?.currentPassword;
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required.' }, { status: 400 });
    }

    const settings = await getSecuritySettings(auth.user.id);
    const { verified } = await listTotpFactors(auth.supabase);
    if (!settings.twoFactorEnabled || !verified) {
      return NextResponse.json({ error: 'Enable two-factor authentication first.' }, { status: 400 });
    }

    const verifyOnly = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error: verifyError } = await verifyOnly.auth.signInWithPassword({
      email: auth.user.email,
      password: currentPassword,
    });
    if (verifyError) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }

    const backupCodes = generateBackupCodes(8);
    await replaceUserBackupCodes(auth.user.id, backupCodes);
    return NextResponse.json({ ok: true, backupCodes });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not regenerate backup codes.' }, { status: 500 });
  }
}
