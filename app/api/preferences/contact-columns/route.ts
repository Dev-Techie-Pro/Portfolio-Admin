import { NextResponse } from 'next/server';
import { getContactColumnVisibility, saveContactColumnVisibility } from '@/lib/cms/repository';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';

export async function GET() {
  return withStaffGet(() => getContactColumnVisibility());
}

export async function PUT(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;
  try {
    await saveContactColumnVisibility(await request.json());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
