import { NextResponse } from 'next/server';
import { guardAuthenticated, getAuthenticatedSessionMeta } from '@/lib/auth/guard';
import { getSessionUserPayload } from '@/lib/auth/profile';

export async function GET() {
  try {
    const auth = await guardAuthenticated();
    if (!auth.ok) return auth.response;

    const user = await getSessionUserPayload(auth.user.id, auth.user.email);
    const { sessionExpiresAt } = getAuthenticatedSessionMeta(auth.user);

    return NextResponse.json({ user, sessionExpiresAt });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
