import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { guardAuthenticated } from '@/lib/auth/guard';
import { recordLoginActivity } from '@/lib/auth/login-activity';
import { logUserLogout } from '@/lib/cms/activity-events';
import { clearSessionDeadlineCookie } from '@/lib/auth/session-lifetime';

export async function POST(request) {
  try {
    const auth = await guardAuthenticated();
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (auth.ok) {
      try {
        await recordLoginActivity({
          userId: auth.user.id,
          email: auth.user.email,
          status: 'logout',
          request,
        });
        await logUserLogout({
          userId: auth.user.id,
          email: auth.user.email,
          request,
        });
      } catch (err) {
        console.warn('[auth/logout] failed to record logout activity:', err.message);
      }
    }

    const response = NextResponse.json({ ok: true });
    clearSessionDeadlineCookie(response);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
