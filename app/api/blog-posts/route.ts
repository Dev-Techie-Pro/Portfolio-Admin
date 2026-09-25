import { NextResponse } from 'next/server';
import { getBlogPosts, saveBlogPosts } from '@/lib/cms/repository';
import { getBlogPostActivitySnapshots } from '@/lib/cms/activity-snapshots';
import { blogMediaUrlsChanged } from '@/lib/cms/media-reconcile';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';
import { logArrayEntityChanges } from '@/lib/cms/activity-events';

export async function GET(request) {
  const full = new URL(request.url).searchParams.get('full') === '1';
  return withStaffGet(() => getBlogPosts({ includeContent: full }), { maxAgeSec: 120 });
}

export async function PUT(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;
  try {
    const before = await getBlogPostActivitySnapshots();
    const records = await request.json();
    await saveBlogPosts(records, { reconcileMedia: blogMediaUrlsChanged(before, records) });
    await logArrayEntityChanges({
      auth,
      request,
      entity: 'blog',
      entityLabel: 'Blog',
      before,
      after: records,
      titleFn: (b) => b.title || 'Untitled',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
