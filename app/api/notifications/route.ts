import { NextResponse } from 'next/server';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';
import {
  clearUserNotifications,
  createUserNotification,
  deleteUserNotification,
  getUserNotifications,
  markNotificationsRead,
  sendTestNotification,
  getUnreadNotificationCount,
} from '@/lib/cms/notifications';

export async function GET() {
  return withStaffGet((auth) => getUserNotifications(auth.user.id), { maxAgeSec: 45 });
}

export async function POST(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    if (body?.test === true) {
      const notification = await sendTestNotification(auth.user.id);
      return NextResponse.json({ ok: true, notification });
    }

    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return NextResponse.json({ error: 'Notification title is required.' }, { status: 400 });
    }

    const notification = await createUserNotification({
      userId: auth.user.id,
      actorUserId: auth.user.id,
      category: body?.category || 'other',
      title,
      body: typeof body?.body === 'string' ? body.body : null,
      icon: typeof body?.icon === 'string' ? body.icon : null,
      linkPath: typeof body?.linkPath === 'string' ? body.linkPath : null,
      metadata: body?.metadata && typeof body.metadata === 'object' ? body.metadata : {},
      force: true,
    });

    return NextResponse.json({ ok: true, notification });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const auth = await guardStaff();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const result = await markNotificationsRead(auth.user.id, {
      ids: Array.isArray(body?.ids) ? body.ids : null,
      all: body?.markAllRead === true,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    if (body?.clearAll === true) {
      await clearUserNotifications(auth.user.id);
      return NextResponse.json({ ok: true, notifications: [], unreadCount: 0 });
    }

    if (!body?.id) {
      return NextResponse.json({ error: 'Notification id is required.' }, { status: 400 });
    }

    await deleteUserNotification(auth.user.id, body.id);
    const unreadCount = await getUnreadNotificationCount(auth.user.id);
    return NextResponse.json({ ok: true, unreadCount });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
