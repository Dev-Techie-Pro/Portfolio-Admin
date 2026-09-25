import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { guardAuthenticated } from '@/lib/auth/guard';
import { logPasswordChanged } from '@/lib/cms/activity-events';
import { validatePasswordStrength } from '@/lib/auth/password-policy';

export async function POST(request) {
  try {
    const auth = await guardAuthenticated();
    if (!auth.ok) return auth.response;

    const { currentPassword, newPassword } = await request.json();
    const email = auth.user.email;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new passwords are required.' }, { status: 400 });
    }

    const policyError = validatePasswordStrength(newPassword);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    const verifyOnly = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error: verifyError } = await verifyOnly.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (verifyError) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }

    const { error } = await auth.supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await logPasswordChanged({
      userId: auth.user.id,
      email,
      request,
      reset: false,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
