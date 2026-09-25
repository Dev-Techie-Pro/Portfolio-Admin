import { NextResponse } from 'next/server';
import { guardEditor } from '@/lib/auth/guard';
import {
  assertAllowedUpload,
  uploadMediaBuffer,
} from '@/lib/cms/media-storage';

export async function POST(request) {
  const auth = await guardEditor();
  if (!auth.ok) return auth.response;

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'File is required.' }, { status: 400 });
    }

    const folder = String(form.get('folder') || 'general');
    const modeRaw = String(form.get('mode') || 'image').toLowerCase();
    const mode = modeRaw === 'contact' || modeRaw === 'font' ? modeRaw : 'image';

    const buffer = Buffer.from(await file.arrayBuffer());
    const { mime, folder: resolvedFolder } = assertAllowedUpload({
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: buffer.length,
      folder,
      mode,
    });

    const result = await uploadMediaBuffer({
      buffer,
      mimeType: mime,
      fileName: file.name || 'upload',
      folder: resolvedFolder,
    });

    return NextResponse.json({
      ok: true,
      url: result.url,
      storagePath: result.storagePath,
      fileName: result.fileName,
      size: result.size,
      mimeType: result.mimeType,
      folder: result.folder,
    });
  } catch (error) {
    const message = error?.message || 'Upload failed.';
    const status = message.includes('limit') || message.includes('Unsupported') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
