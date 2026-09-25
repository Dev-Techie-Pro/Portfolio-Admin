import { NextResponse } from 'next/server';
import { guardAuthenticated } from '@/lib/auth/guard';
import { logPasswordChanged } from '@/lib/cms/activity-events';

export async function POST(request) {
  try {
    const auth = await guardAuthenticated();
    if (!auth.ok) return auth.response;

    const { password } = await request.json();
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const { error } = await auth.supabase.auth.updateUser({ password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logPasswordChanged({
      userId: auth.user.id,
      email: auth.user.email,
      request,
      reset: true,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
