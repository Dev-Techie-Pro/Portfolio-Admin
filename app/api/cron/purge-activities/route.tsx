import { NextResponse } from 'next/server';
import { purgeExpiredRecentActivities } from '@/lib/cms/activity-retention';

/**
 * Optional scheduled purge endpoint for platform cron (e.g. Vercel Cron).
 * Set CRON_SECRET in env and call with: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ok = await purgeExpiredRecentActivities();
    return NextResponse.json({ ok });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
