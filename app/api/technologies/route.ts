import { NextResponse } from 'next/server';
import { getTechnologies, saveTechnologies } from '@/lib/cms/repository';
import { getTechnologyActivitySnapshots } from '@/lib/cms/activity-snapshots';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';
import { logArrayEntityChanges } from '@/lib/cms/activity-events';

export async function GET() {
  return withStaffGet(() => getTechnologies(), { maxAgeSec: 180 });
}

export async function PUT(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;
  try {
    const before = await getTechnologyActivitySnapshots();
    const records = await request.json();
    await saveTechnologies(records);
    await logArrayEntityChanges({
      auth,
      request,
      entity: 'skill',
      entityLabel: 'Skill',
      before,
      after: records,
      titleFn: (t) => t.name || 'Untitled',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
