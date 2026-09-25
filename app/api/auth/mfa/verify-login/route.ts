import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { STAFF_ROLES } from '@/lib/auth/constants';
import { consumeBackupCode } from '@/lib/auth/backup-codes';
import {
  getMfaAssuranceLevel,
  listTotpFactors,
  needsMfaVerification,
  unenrollTotpFactor,
  verifyLoginTotp,
} from '@/lib/auth/mfa';
import { updateSecuritySettings } from '@/lib/auth/security-settings';
import { createClient } from '@/lib/supabase/server';
import { recordLoginActivity } from '@/lib/auth/login-activity';
import { logUserLogin } from '@/lib/cms/activity-events';
import { applySessionDeadlineCookie } from '@/lib/auth/session-lifetime';

export async function POST(request) {
  try {
    const body = await request.json();
    const code = String(body?.code || '').trim();
    const factorId = body?.factorId;
    const useBackupCode = body?.useBackupCode === true;

    if (!code) {
      return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const aal = await getMfaAssuranceLevel(supabase);
    if (!needsMfaVerification(aal)) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    if (useBackupCode) {
      const consumed = await consumeBackupCode(user.id, code);
      if (!consumed) {
        return NextResponse.json({ error: 'Invalid or used backup code.' }, { status: 401 });
      }
      const { verified } = await listTotpFactors(supabase);
      if (verified?.id) {
        await unenrollTotpFactor(supabase, verified.id);
      }
      await updateSecuritySettings(user.id, { twoFactorEnabled: false, twoFactorMethod: null });
    } else {
      const { verified } = await listTotpFactors(supabase);
      const targetFactorId = factorId || verified?.id;
      if (!targetFactorId) {
        return NextResponse.json({ error: 'No authenticator factor found.' }, { status: 400 });
      }
      await verifyLoginTotp(supabase, targetFactorId, code);
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role, full_name, email, username, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !STAFF_ROLES.includes(profile.role)) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: 'Your account does not have access to the admin dashboard.' }, { status: 403 });
    }

    await admin
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    try {
      await recordLoginActivity({
        userId: user.id,
        email: user.email,
        status: 'success',
        request,
        isCurrent: true,
      });
      const displayName = profile.full_name || profile.username || user.email;
      await logUserLogin({
        userId: user.id,
        displayName,
        email: user.email,
        request,
      });
    } catch (err) {
      console.warn('[auth/mfa/verify-login] activity log failed:', err.message);
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: profile.role,
        fullName: profile.full_name,
        username: profile.username,
        avatarUrl: profile.avatar_url,
      },
    });
    applySessionDeadlineCookie(response);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Invalid verification code.' }, { status: 401 });
  }
}
