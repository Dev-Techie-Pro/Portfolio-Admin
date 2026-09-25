import { NextResponse } from 'next/server';
import { backfillMediaFileMeta, syncAllEntityMedia } from '@/lib/cms/media-sync';
import { invalidateCmsReadCaches } from '@/lib/cms/server-cache';
import { guardStaff, guardEditor } from '@/lib/auth/guard';

/** Backfill media_assets from images used across CMS tables. */
export async function POST() {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;
  try {
    await backfillMediaFileMeta();
    const result = await syncAllEntityMedia();
    invalidateCmsReadCaches();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
