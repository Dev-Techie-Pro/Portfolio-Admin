import { NextResponse } from 'next/server';
import { guardAuthenticated } from '@/lib/auth/guard';
import { generateBackupCodes, replaceUserBackupCodes } from '@/lib/auth/backup-codes';
import { verifyTotpEnrollment } from '@/lib/auth/mfa';
import { updateSecuritySettings } from '@/lib/auth/security-settings';
import { recordUserAction } from '@/lib/cms/activity-log';

export async function POST(request) {
  const auth = await guardAuthenticated();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const factorId = body?.factorId;
    const code = body?.code;
    if (!factorId || !code) {
      return NextResponse.json({ error: 'Factor id and verification code are required.' }, { status: 400 });
    }

    await verifyTotpEnrollment(auth.supabase, factorId, code);
    await updateSecuritySettings(auth.user.id, {
      twoFactorEnabled: true,
      twoFactorMethod: 'authenticator',
    });

    const backupCodes = generateBackupCodes(8);
    await replaceUserBackupCodes(auth.user.id, backupCodes);

    await recordUserAction({
      userId: auth.user.id,
      actionTitle: 'Two-factor authentication enabled',
      actionDescription: 'Authenticator app 2FA was enabled on this account.',
      status: 'success',
      metadata: { action: 'security.2fa.enabled' },
      request,
    });

    return NextResponse.json({ ok: true, backupCodes });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Invalid verification code.' }, { status: 400 });
  }
}
