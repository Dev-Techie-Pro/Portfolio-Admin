import { NextResponse } from 'next/server';
import { getExperience, saveExperience } from '@/lib/cms/repository';
import { getExperienceActivitySnapshots } from '@/lib/cms/activity-snapshots';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';
import { logArrayEntityChanges } from '@/lib/cms/activity-events';

export async function GET() {
  return withStaffGet(() => getExperience(), { maxAgeSec: 180 });
}

export async function PUT(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;
  try {
    const before = await getExperienceActivitySnapshots();
    const records = await request.json();
    await saveExperience(records);
    await logArrayEntityChanges({
      auth,
      request,
      entity: 'experience',
      entityLabel: 'Experience',
      before,
      after: records,
      titleFn: (e) => e.title || e.company || 'Untitled',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
