import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Scheduled purge for stale user_sessions rows.
 * Set CRON_SECRET in env and call with: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const keepDays = Number.parseInt(process.env.SESSION_PRUNE_KEEP_DAYS || '90', 10);
    const { data, error } = await createAdminClient().rpc('pa_prune_user_sessions', {
      p_keep_days: keepDays,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true, deleted: data ?? 0 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
