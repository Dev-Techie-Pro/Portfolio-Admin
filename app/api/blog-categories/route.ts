import { NextResponse } from 'next/server';
import { getBlogCategories, saveBlogCategories } from '@/lib/cms/repository';
import { getBlogCategoryActivitySnapshots } from '@/lib/cms/activity-snapshots';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';
import { logArrayEntityChanges } from '@/lib/cms/activity-events';

export async function GET() {
  return withStaffGet(() => getBlogCategories(), { maxAgeSec: 180 });
}

export async function PUT(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;
  try {
    const before = await getBlogCategoryActivitySnapshots();
    const records = await request.json();
    await saveBlogCategories(records);
    await logArrayEntityChanges({
      auth,
      request,
      entity: 'blog_category',
      entityLabel: 'Blog category',
      before,
      after: records,
      titleFn: (c) => c.label || 'Untitled',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
