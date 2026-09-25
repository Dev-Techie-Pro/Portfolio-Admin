import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { STAFF_ROLES } from '@/lib/auth/constants';
import { findUserIdByEmail, recordLoginActivity } from '@/lib/auth/login-activity';
import { recordSystemEvent } from '@/lib/cms/activity-log';
import { logUserLogin } from '@/lib/cms/activity-events';
import { ensureProfileForUser } from '@/lib/auth/profile';
import { getMfaAssuranceLevel, listTotpFactors, needsMfaVerification } from '@/lib/auth/mfa';
import { applySessionDeadlineCookie } from '@/lib/auth/session-lifetime';

async function logFailedAttempt(email, failureReason, request) {
  try {
    const userId = await findUserIdByEmail(email);
    if (!userId) return;
    await recordLoginActivity({
      userId,
      email,
      status: 'failed',
      failureReason,
      request,
    });
  } catch (err) {
    console.warn('[auth/login] failed to record login activity:', err.message);
  }
}

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      await logFailedAttempt(email, error.message, request);
      try {
        const userId = await findUserIdByEmail(email);
        await recordSystemEvent({
          userId,
          actionTitle: 'Failed login attempt',
          actionDescription: `Unsuccessful login attempt for ${email}`,
          status: 'warning',
          metadata: { email, reason: error.message },
          request,
        });
      } catch { /* non-fatal */ }
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    const admin = createAdminClient();
    let profileRow = await admin
      .from('profiles')
      .select('role, full_name, email, username, avatar_url')
      .eq('id', data.user.id)
      .maybeSingle()
      .then(({ data }) => data);

    if (!profileRow) {
      await ensureProfileForUser(data.user);
      profileRow = await admin
        .from('profiles')
        .select('role, full_name, email, username, avatar_url')
        .eq('id', data.user.id)
        .maybeSingle()
        .then(({ data }) => data);
    }

    const profile = profileRow;

    if (!profile || !STAFF_ROLES.includes(profile.role)) {
      await supabase.auth.signOut();
      await recordLoginActivity({
        userId: data.user.id,
        email,
        status: 'failed',
        failureReason: 'Account does not have dashboard access',
        request,
      });
      return NextResponse.json(
        { error: 'Your account does not have access to the admin dashboard.' },
        { status: 403 },
      );
    }

    const aal = await getMfaAssuranceLevel(supabase);
    if (needsMfaVerification(aal)) {
      const { verified } = await listTotpFactors(supabase);
      return NextResponse.json({
        needsMfa: true,
        factorId: verified?.id || null,
        message: 'Enter the code from your authenticator app to continue.',
      });
    }

    await admin
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);

    try {
      await recordLoginActivity({
        userId: data.user.id,
        email,
        status: 'success',
        request,
        isCurrent: true,
      });
      const displayName = profile.full_name || profile.username || email;
      await logUserLogin({
        userId: data.user.id,
        displayName,
        email,
        request,
      });
    } catch (err) {
      console.warn('[auth/login] failed to record successful login:', err.message);
    }

    const response = NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile.role,
        fullName: profile.full_name,
        username: profile.username,
        avatarUrl: profile.avatar_url,
      },
    });
    applySessionDeadlineCookie(response);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
