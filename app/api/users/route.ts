import { NextResponse } from 'next/server';
import { guardAdmin } from '@/lib/auth/guard';
import { createStaffUser, listStaffUsers } from '@/lib/auth/users';
import { recordUserAction } from '@/lib/cms/activity-log';
import { sendUserCredentialsEmail } from '@/lib/email/send-credentials';

export async function GET() {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ users: await listStaffUsers() });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const result = await createStaffUser(body, { actorRole: auth.profile.role });
    await recordUserAction({
      userId: auth.user.id,
      actionTitle: `User ${result.user.fullName || result.user.email} created`,
      actionDescription: `New ${result.user.role} account was added by an administrator.`,
      status: 'success',
      metadata: {
        action: 'user.created',
        targetUserId: result.user.id || null,
        role: result.user.role,
      },
      request,
    });
    const emailResult = await sendUserCredentialsEmail({
      to: result.credentials.email,
      toName: result.user.fullName,
      credentials: result.credentials,
      isReset: false,
    });
    return NextResponse.json({
      ...result,
      emailSent: emailResult.sent,
      ...(emailResult.sent ? {} : { emailError: emailResult.reason }),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
