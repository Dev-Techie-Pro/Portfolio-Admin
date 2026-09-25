import { NextResponse } from 'next/server';
import { guardAuthenticated } from '@/lib/auth/guard';
import { getProfileForUser, updateProfileByUserId } from '@/lib/auth/profile';
import { STAFF_ROLES } from '@/lib/auth/constants';
import { logProfileChanges } from '@/lib/cms/activity-events';

export async function GET() {
  try {
    const auth = await guardAuthenticated();
    if (!auth.ok) return auth.response;

    const profile = await getProfileForUser(auth.user);
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await guardAuthenticated();
    if (!auth.ok) return auth.response;

    const current = await getProfileForUser(auth.user);
    const body = await request.json();
    const canEditRole = STAFF_ROLES.includes(current.role) && current.role === 'super_admin';

    const profile = await updateProfileByUserId(auth.user.id, body, { canEditRole });

    await logProfileChanges({
      auth,
      request,
      before: current,
      after: profile,
      payload: body,
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
