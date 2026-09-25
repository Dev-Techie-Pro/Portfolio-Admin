import { NextResponse } from 'next/server';
import { getCategories, saveCategories } from '@/lib/cms/repository';
import { getCategoryActivitySnapshots } from '@/lib/cms/activity-snapshots';
import { guardStaff, guardEditor } from '@/lib/auth/guard';
import { withStaffGet } from '@/lib/api/with-staff-get';
import { diffCategoryMap } from '@/lib/cms/activity-events';
import { recordContentChange } from '@/lib/cms/activity-log';

export async function GET() {
  return withStaffGet(() => getCategories(), { maxAgeSec: 180 });
}

export async function PUT(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;
  try {
    const before = await getCategoryActivitySnapshots();
    const map = await request.json();
    await saveCategories(map);
    const { created, updated, deleted } = diffCategoryMap(before, map);
    const actor = auth.profile?.full_name || auth.profile?.username || auth.user?.email || 'Admin';
    const tasks = [];
    for (const cat of created) {
      tasks.push(recordContentChange({
        userId: auth.user.id,
        actionTitle: 'Category created',
        actionDescription: `${actor} created category "${cat.label || cat.key}"`,
        status: 'created',
        metadata: { action: 'category.created', key: cat.key, title: cat.label },
      }));
    }
    for (const cat of updated) {
      tasks.push(recordContentChange({
        userId: auth.user.id,
        actionTitle: 'Category updated',
        actionDescription: `${actor} updated category "${cat.label || cat.key}"`,
        status: 'completed',
        metadata: { action: 'category.updated', key: cat.key, title: cat.label },
      }));
    }
    for (const cat of deleted) {
      tasks.push(recordContentChange({
        userId: auth.user.id,
        actionTitle: 'Category deleted',
        actionDescription: `${actor} deleted category "${cat.label || cat.key}"`,
        status: 'warning',
        metadata: { action: 'category.deleted', key: cat.key, title: cat.label },
      }));
    }
    await Promise.all(tasks);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
