import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function siteOrigin(request) {
  return process.env.NEXT_PUBLIC_SITE_URL
    || request.headers.get('origin')
    || 'http://localhost:3000';
}

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const supabase = createClient();
    const origin = siteOrigin(request);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
