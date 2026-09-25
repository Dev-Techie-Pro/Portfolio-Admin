import { NextResponse } from 'next/server';
import { guardAuthenticated, guardStaff } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from '@/lib/cms/notifications';
import { recordUserAction } from '@/lib/cms/activity-log';

export async function GET() {
  return withStaffGet((auth) => getNotificationPreferences(auth.user.id));
}

export async function PUT(request) {
  const auth = await guardAuthenticated();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const prefs = await saveNotificationPreferences(auth.user.id, body);
    await recordUserAction({
      userId: auth.user.id,
      actionTitle: 'Notification preferences updated',
      actionDescription: 'Notification settings were saved.',
      status: 'success',
      metadata: { action: 'notification_preferences.updated' },
      request,
    });
    return NextResponse.json({ ok: true, preferences: prefs });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
