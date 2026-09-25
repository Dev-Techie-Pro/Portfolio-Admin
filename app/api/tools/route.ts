import { NextResponse } from 'next/server';
import { getToolItems, saveToolItems } from '@/lib/cms/repository';
import { getToolItemActivitySnapshots } from '@/lib/cms/activity-snapshots';
import { toolMediaUrlsChanged } from '@/lib/cms/media-reconcile';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';
import { logArrayEntityChanges } from '@/lib/cms/activity-events';

export async function GET() {
  return withStaffGet(() => getToolItems(), { maxAgeSec: 180 });
}

export async function PUT(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;
  try {
    const before = await getToolItemActivitySnapshots();
    const records = await request.json();
    await saveToolItems(records, { reconcileMedia: toolMediaUrlsChanged(before, records) });
    await logArrayEntityChanges({
      auth,
      request,
      entity: 'tool',
      entityLabel: 'Tool',
      before,
      after: records,
      titleFn: (t) => t.name || 'Untitled',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
