import { NextResponse } from 'next/server';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import { ADMIN_ROLES } from '@/lib/auth/constants';
import { withStaffGet } from '@/lib/api/with-staff-get';
import { getRecentActivitiesPayload, deleteRecentActivity, deleteRecentActivities } from '@/lib/cms/repository';

function parseIdsParam(raw) {
  if (!raw) return [];
  return raw.split(',').map((value) => value.trim()).filter(Boolean);
}

async function readBulkIds(request, searchParams) {
  const fromQuery = parseIdsParam(searchParams.get('ids'));
  if (fromQuery.length) return fromQuery;

  try {
    const body = await request.json();
    if (Array.isArray(body?.ids)) {
      return body.ids.map((value) => String(value).trim()).filter(Boolean);
    }
  } catch {
    // DELETE may have no JSON body when using query params only.
  }
  return [];
}

export async function GET() {
  return withStaffGet((auth) => {
    const scopeAll = ADMIN_ROLES.includes(auth.profile.role);
    return getRecentActivitiesPayload({
      userId: auth.user.id,
      scopeAll,
    }).then((payload) => ({ ...payload, scope: scopeAll ? 'all' : 'self' }));
  }, { maxAgeSec: 30 });
}

export async function DELETE(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const bulkIds = await readBulkIds(request, searchParams);
    const id = searchParams.get('id');
    if (bulkIds.length) {
      const deleted = await deleteRecentActivities(bulkIds);
      return NextResponse.json({ ok: true, deleted });
    }
    if (!id) {
      return NextResponse.json({ error: 'Activity id is required.' }, { status: 400 });
    }
    await deleteRecentActivity(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
