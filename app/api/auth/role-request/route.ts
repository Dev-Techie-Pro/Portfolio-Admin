import { NextResponse } from 'next/server';
import { guardStaff } from '@/lib/auth/guard';
import { ADMIN_ROLES } from '@/lib/auth/constants';
import { getProfileForUser } from '@/lib/auth/profile';
import { recordUserAction } from '@/lib/cms/activity-log';
import { createUserNotification, getAdminUserIds } from '@/lib/cms/notifications';
import { sendRoleRequestEmail } from '@/lib/email/send-role-request';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUESTABLE_ROLES = ['editor', 'admin'];

export async function POST(request) {
  const auth = await guardStaff();
  if (!auth.ok) return auth.response;

  if (ADMIN_ROLES.includes(auth.profile.role)) {
    return NextResponse.json({ error: 'Administrators cannot submit role requests.' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const contactEmail = typeof body?.contactEmail === 'string' ? body.contactEmail.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const requestedRole = typeof body?.requestedRole === 'string' ? body.requestedRole.trim() : '';

  if (!contactEmail || !EMAIL_RE.test(contactEmail)) {
    return NextResponse.json({ error: 'Please provide a valid contact email address.' }, { status: 400 });
  }
  if (!message || message.length < 10) {
    return NextResponse.json({ error: 'Please include a short message (at least 10 characters).' }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message is too long (max 2000 characters).' }, { status: 400 });
  }
  if (requestedRole && !REQUESTABLE_ROLES.includes(requestedRole)) {
    return NextResponse.json({ error: 'Requested role must be editor or admin.' }, { status: 400 });
  }

  const profile = await getProfileForUser(auth.user);
  const actorName = profile.fullName || profile.username || profile.email || auth.user.email || 'Staff member';
  const actorEmail = profile.email || auth.user.email || '';
  const currentRole = auth.profile.role;
  const requestedLabel = requestedRole ? requestedRole.replace(/_/g, ' ') : 'elevated access';

  await recordUserAction({
    userId: auth.user.id,
    actionTitle: 'Role access request submitted',
    actionDescription: `${actorName} requested ${requestedLabel}`,
    status: 'info',
    metadata: {
      action: 'role.request',
      entity: 'user',
      contactEmail,
      requestedRole: requestedRole || null,
      currentRole,
    },
    request,
  });

  const admins = await getAdminUserIds();
  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';
  const usersUrl = origin ? `${origin.replace(/\/$/, '')}/users` : '/users';

  let notificationsCreated = 0;
  let emailsSent = 0;
  const emailErrors = [];

  for (const admin of admins) {
    const notification = await createUserNotification({
      userId: admin.id,
      actorUserId: auth.user.id,
      category: 'system_alerts',
      title: 'Role access request',
      body: `${actorName} (${currentRole.replace(/_/g, ' ')}) requested ${requestedLabel}. Contact: ${contactEmail}`,
      icon: 'ri-user-settings-line',
      linkPath: '/users',
      metadata: {
        action: 'role.request',
        contactEmail,
        requestedRole: requestedRole || null,
        currentRole,
        requesterEmail: actorEmail,
        message,
      },
      force: true,
    });
    if (notification) notificationsCreated += 1;

    if (admin.email) {
      const mail = await sendRoleRequestEmail({
        to: admin.email,
        adminName: admin.full_name || admin.username || admin.email,
        requesterName: actorName,
        requesterEmail: actorEmail,
        requesterRole: currentRole,
        contactEmail,
        requestedRole,
        message,
        usersUrl,
      });
      if (mail.sent) emailsSent += 1;
      else if (mail.reason) emailErrors.push(mail.reason);
    }
  }

  return NextResponse.json({
    ok: true,
    notificationsCreated,
    emailsSent,
    emailConfigured: emailErrors.length === 0 || emailsSent > 0,
    message: notificationsCreated
      ? 'Your request was sent to the administrators.'
      : 'Request recorded, but no administrators were available to notify.',
  });
}
