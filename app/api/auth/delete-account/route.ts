import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { guardAuthenticated } from '@/lib/auth/guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { clearUserBackupCodes } from '@/lib/auth/backup-codes';
import { listTotpFactors, unenrollTotpFactor } from '@/lib/auth/mfa';
import { recordUserAction } from '@/lib/cms/activity-log';

export async function POST(request) {
  const auth = await guardAuthenticated();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const currentPassword = body?.currentPassword;
    const confirmText = String(body?.confirmText || '').trim();

    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required.' }, { status: 400 });
    }
    if (confirmText !== 'DELETE') {
      return NextResponse.json({ error: 'Type DELETE to confirm account deletion.' }, { status: 400 });
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

    await recordUserAction({
      userId: auth.user.id,
      actionTitle: 'Account deleted',
      actionDescription: `${auth.user.email || 'User'} deleted their account.`,
      status: 'warning',
      metadata: { action: 'user.deleted', email: auth.user.email },
      request,
    });

    try {
      const { verified } = await listTotpFactors(auth.supabase);
      if (verified?.id) await unenrollTotpFactor(auth.supabase, verified.id);
    } catch {
      // non-fatal
    }
    await clearUserBackupCodes(auth.user.id);

    const admin = createAdminClient();
    const { error: deleteError } = await admin.auth.admin.deleteUser(auth.user.id);
    if (deleteError) throw deleteError;

    const supabase = auth.supabase;
    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not delete account.' }, { status: 500 });
  }
}
