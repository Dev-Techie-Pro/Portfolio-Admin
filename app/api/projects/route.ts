import { NextResponse } from 'next/server';
import { getProjects, saveProjects } from '@/lib/cms/repository';
import { getProjectActivitySnapshots } from '@/lib/cms/activity-snapshots';
import { projectMediaUrlsChanged } from '@/lib/cms/media-reconcile';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';
import { logArrayEntityChanges } from '@/lib/cms/activity-events';

export async function GET() {
  return withStaffGet(() => getProjects(), { maxAgeSec: 120 });
}

export async function PUT(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;
  try {
    const before = await getProjectActivitySnapshots();
    const records = await request.json();
    await saveProjects(records, { reconcileMedia: projectMediaUrlsChanged(before, records) });
    await logArrayEntityChanges({
      auth,
      request,
      entity: 'project',
      entityLabel: 'Project',
      before,
      after: records,
      titleFn: (p) => p.title || 'Untitled',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
