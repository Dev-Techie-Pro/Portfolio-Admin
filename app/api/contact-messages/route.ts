import { NextResponse } from 'next/server';
import { getAllContactMessages, getContactMessagesPage, saveContactMessages } from '@/lib/cms/repository';
import { getContactMessageActivitySnapshots } from '@/lib/cms/activity-snapshots';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';
import { logContactMessagesChanged } from '@/lib/cms/activity-events';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('all') === '1') {
    return withStaffGet(() => getAllContactMessages(), { maxAgeSec: 60 });
  }
  const cursor = searchParams.get('cursor');
  const limit = Math.min(Number.parseInt(searchParams.get('limit') || '50', 10), 100);
  return withStaffGet(() => getContactMessagesPage({ cursor, limit }), { maxAgeSec: 60 });
}

export async function PUT(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;
  try {
    const before = await getContactMessageActivitySnapshots();
    const after = await request.json();
    await saveContactMessages(after);
    await logContactMessagesChanged({ auth, request, before, after });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
