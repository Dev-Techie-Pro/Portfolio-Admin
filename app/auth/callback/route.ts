import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applySessionDeadlineCookie } from '@/lib/auth/session-lifetime';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const redirect = NextResponse.redirect(`${origin}${next}`);
      applySessionDeadlineCookie(redirect);
      return redirect;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
