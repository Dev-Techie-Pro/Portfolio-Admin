import { NextResponse } from 'next/server';
import { getMedia, saveMedia } from '@/lib/cms/repository';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';
import { logMediaChanges } from '@/lib/cms/activity-events';

export async function GET() {
  return withStaffGet(() => getMedia(), { maxAgeSec: 120 });
}

export async function PUT(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;
  try {
    const before = await getMedia();
    const records = await request.json();
    const propagation = await saveMedia(records, before);
    await logMediaChanges({ auth, request, before, after: records });
    return NextResponse.json({ ok: true, propagation });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
