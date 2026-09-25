import { NextResponse } from 'next/server';
import { getTestimonials, saveTestimonials } from '@/lib/cms/repository';
import { getTestimonialActivitySnapshots } from '@/lib/cms/activity-snapshots';
import { testimonialMediaUrlsChanged } from '@/lib/cms/media-reconcile';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';
import { logArrayEntityChanges } from '@/lib/cms/activity-events';

export async function GET() {
  return withStaffGet(() => getTestimonials(), { maxAgeSec: 120 });
}

export async function PUT(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;
  try {
    const before = await getTestimonialActivitySnapshots();
    const records = await request.json();
    await saveTestimonials(records, { reconcileMedia: testimonialMediaUrlsChanged(before, records) });
    await logArrayEntityChanges({
      auth,
      request,
      entity: 'testimonial',
      entityLabel: 'Testimonial',
      before,
      after: records,
      titleFn: (t) => t.name || 'Anonymous',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
