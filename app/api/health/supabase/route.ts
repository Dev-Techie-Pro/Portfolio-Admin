import { createAdminClient } from '@/lib/supabase/admin';
import { getDashboardStats } from '@/lib/cms/dashboard-stats';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = createAdminClient();
    const fresh = new URL(request.url).searchParams.get('fresh') === '1';

    const [{ data: site, error: siteError }, stats] = await Promise.all([
      supabase.from('sites').select('id, slug, name').eq('slug', 'default').maybeSingle(),
      getDashboardStats({ fresh }),
    ]);

    if (siteError) throw siteError;

    return NextResponse.json({
      ok: true,
      connected: true,
      site,
      stats,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        error: error.message ?? 'Supabase connection failed',
      },
      { status: 500 },
    );
  }
}
