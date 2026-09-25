import { NextResponse } from 'next/server';
import { guardStaff } from '@/lib/auth/guard';
import { ADMIN_ROLES } from '@/lib/auth/constants';
import { getAllLoginActivity, getLoginActivity } from '@/lib/auth/login-activity';

export async function GET(request) {
  const auth = await guardStaff();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10) || 25, 50);
    const scopeAll = ADMIN_ROLES.includes(auth.profile.role);
    const items = scopeAll
      ? await getAllLoginActivity({ limit })
      : await getLoginActivity(auth.user.id, { limit });
    return NextResponse.json({ items, scope: scopeAll ? 'all' : 'self' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
