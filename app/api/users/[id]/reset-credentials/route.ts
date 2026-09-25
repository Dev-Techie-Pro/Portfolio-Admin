import { NextResponse } from 'next/server';
import { guardAdmin } from '@/lib/auth/guard';
import { resetStaffUserCredentials } from '@/lib/auth/users';
import { recordUserAction } from '@/lib/cms/activity-log';
import { sendUserCredentialsEmail } from '@/lib/email/send-credentials';

export async function POST(request, { params }) {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.response;

  try {
    const result = await resetStaffUserCredentials(params.id, {
      actorId: auth.user.id,
      actorRole: auth.profile.role,
    });

    await recordUserAction({
      userId: auth.user.id,
      actionTitle: 'User credentials reset',
      actionDescription: `Temporary password was regenerated for ${result.user.fullName || result.user.email}.`,
      status: 'warning',
      metadata: {
        action: 'user.credentials_reset',
        targetUserId: result.user.id,
      },
      request,
    });

    const emailResult = await sendUserCredentialsEmail({
      to: result.credentials.email,
      toName: result.user.fullName,
      credentials: result.credentials,
      isReset: true,
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
