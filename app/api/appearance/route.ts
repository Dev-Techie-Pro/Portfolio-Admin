import { NextResponse } from 'next/server';
import { getAppearance, saveAppearance } from '@/lib/cms/repository';
import { guardStaff, guardAdmin } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';
import { recordUserAction } from '@/lib/cms/activity-log';

export async function GET() {
  return withStaffGet(() => getAppearance());
}

export async function PUT(request) {
  const auth = await guardStaff();
  if (!auth.ok) return auth.response;
  try {
    await saveAppearance(await request.json());
    await recordUserAction({
      userId: auth.user.id,
      actionTitle: 'Appearance settings updated',
      actionDescription: 'Theme, colors, or typography settings were changed',
      status: 'success',
      metadata: { action: 'appearance.updated', entity: 'appearance' },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
