import { NextResponse } from 'next/server';
import { guardAdmin } from '@/lib/auth/guard';
import { deleteStaffUser, updateStaffUser } from '@/lib/auth/users';
import { recordUserAction } from '@/lib/cms/activity-log';

export async function PATCH(request, { params }) {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const user = await updateStaffUser(params.id, body, {
      actorId: auth.user.id,
      actorRole: auth.profile.role,
    });

    await recordUserAction({
      userId: auth.user.id,
      actionTitle: `User ${user.fullName || user.email} updated`,
      actionDescription: 'Staff account details were changed by an administrator.',
      status: 'success',
      metadata: {
        action: 'user.updated',
        targetUserId: user.id,
        role: user.role,
      },
      request,
    });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.response;

  try {
    const result = await deleteStaffUser(params.id, {
      actorId: auth.user.id,
      actorRole: auth.profile.role,
    });

    await recordUserAction({
      userId: auth.user.id,
      actionTitle: 'User deleted',
      actionDescription: 'A staff account was removed by an administrator.',
      status: 'warning',
      metadata: {
        action: 'user.deleted',
        targetUserId: result.id,
      },
      request,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
