import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { guardAuthenticated } from '@/lib/auth/guard';
import { clearUserBackupCodes } from '@/lib/auth/backup-codes';
import { listTotpFactors, unenrollTotpFactor } from '@/lib/auth/mfa';
import { updateSecuritySettings } from '@/lib/auth/security-settings';
import { recordUserAction } from '@/lib/cms/activity-log';

export async function POST(request) {
  const auth = await guardAuthenticated();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const currentPassword = body?.currentPassword;
    const code = body?.code;

    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required to disable 2FA.' }, { status: 400 });
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

    const { verified } = await listTotpFactors(auth.supabase);
    if (!verified?.id) {
      await updateSecuritySettings(auth.user.id, { twoFactorEnabled: false, twoFactorMethod: null });
      await clearUserBackupCodes(auth.user.id);
      return NextResponse.json({ ok: true });
    }

    if (code) {
      const { verifyLoginTotp } = await import('@/lib/auth/mfa');
      await verifyLoginTotp(auth.supabase, verified.id, code);
    }

    await unenrollTotpFactor(auth.supabase, verified.id);
    await updateSecuritySettings(auth.user.id, { twoFactorEnabled: false, twoFactorMethod: null });
    await clearUserBackupCodes(auth.user.id);

    await recordUserAction({
      userId: auth.user.id,
      actionTitle: 'Two-factor authentication disabled',
      actionDescription: 'Authenticator app 2FA was disabled on this account.',
      status: 'warning',
      metadata: { action: 'security.2fa.disabled' },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not disable 2FA.' }, { status: 400 });
  }
}
