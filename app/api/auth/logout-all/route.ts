import { NextResponse } from 'next/server';
import { guardAdmin } from '@/lib/auth/guard';
import { revokeAllUserSessions } from '@/lib/auth/login-activity';
import { createClient } from '@/lib/supabase/server';
import { clearSessionDeadlineCookie } from '@/lib/auth/session-lifetime';

export async function POST() {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.response;

  try {
    await revokeAllUserSessions(auth.user.id);

    const supabase = createClient();
    await supabase.auth.signOut();

    const response = NextResponse.json({ ok: true });
    clearSessionDeadlineCookie(response);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
