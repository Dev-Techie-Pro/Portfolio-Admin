import { NextResponse } from 'next/server';
import { getToolCategories, saveToolCategories } from '@/lib/cms/repository';
import { getToolCategoryActivitySnapshots } from '@/lib/cms/activity-snapshots';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';
import { logArrayEntityChanges } from '@/lib/cms/activity-events';

export async function GET() {
  return withStaffGet(() => getToolCategories(), { maxAgeSec: 180 });
}

export async function PUT(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;
  try {
    const before = await getToolCategoryActivitySnapshots();
    const records = await request.json();
    await saveToolCategories(records);
    await logArrayEntityChanges({
      auth,
      request,
      entity: 'tool_category',
      entityLabel: 'Tool category',
      before,
      after: records,
      titleFn: (c) => c.label || 'Untitled',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
