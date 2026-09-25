import { handleFileValidation, readOptimizedImageBlob } from './files.js';
import { showToast } from '../modules/shell/toast.js';

export class MediaUploadError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MediaUploadError';
  }
}

export type CmsUploadFolder =
  | 'general'
  | 'projects'
  | 'avatars'
  | 'icons'
  | 'blog'
  | 'testimonials'
  | 'contact';

type OptimizeOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

type UploadOptions = {
  folder?: CmsUploadFolder;
  mode?: 'image' | 'contact' | 'font';
  optimize?: OptimizeOptions | null;
  fileName?: string;
};

async function postUploadForm(form: FormData) {
  const res = await fetch('/api/media/upload', {
    method: 'POST',
    body: form,
    credentials: 'same-origin',
  });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new MediaUploadError('Session expired. Please sign in again.');
  }
  const raw = await res.text();
  let payload: { error?: string; url?: string } = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }
  if (!res.ok) {
    throw new MediaUploadError(payload.error || raw || 'Upload failed.');
  }
  return payload;
}

/**
 * Upload a file to Supabase Storage via the CMS API. Returns a public HTTPS URL.
 */
export async function uploadCmsFile(file: File, options: UploadOptions = {}) {
  if (!file) throw new MediaUploadError('No file selected.');

  const mode = options.mode || 'image';
  if (mode === 'image' && !handleFileValidation(file)) {
    throw new MediaUploadError('Invalid image file.');
  }

  const folder = options.folder || 'general';
  const form = new FormData();
  form.append('folder', folder);
  form.append('mode', mode);

  if (options.optimize && mode === 'image') {
    const { blob, mimeType } = await readOptimizedImageBlob(file, options.optimize);
    const ext = mimeType === 'image/png' ? '.png' : '.jpg';
    const baseName = (options.fileName || file.name).replace(/\.[^.]+$/, '') + ext;
    form.append('file', blob, baseName);
  } else {
    form.append('file', file, options.fileName || file.name);
  }

  const payload = await postUploadForm(form);
  if (!payload.url) throw new MediaUploadError('Upload did not return a URL.');

  return {
    url: payload.url as string,
    storagePath: (payload as { storagePath?: string }).storagePath || '',
    fileName: (payload as { fileName?: string }).fileName || file.name,
    size: Number((payload as { size?: number }).size) || file.size,
    mimeType: (payload as { mimeType?: string }).mimeType || file.type,
    folder: (payload as { folder?: string }).folder || folder,
  };
}

/** Upload with instant object-URL preview; revokes preview URL when done. */
export async function uploadCmsFileWithPreview(
  file: File,
  options: UploadOptions & { onPreview?: (previewUrl: string) => void } = {},
) {
  const previewUrl = URL.createObjectURL(file);
  options.onPreview?.(previewUrl);
  try {
    return await uploadCmsFile(file, options);
  } finally {
    URL.revokeObjectURL(previewUrl);
  }
}

export async function uploadContactAttachment(file: File) {
  if (!file) throw new MediaUploadError('No file selected.');
  if (file.size > 5 * 1024 * 1024) {
    showToast('Attachment exceeds the 5MB limit.', 'danger');
    throw new MediaUploadError('Attachment exceeds the 5MB limit.');
  }
  return uploadCmsFile(file, { folder: 'contact', mode: 'contact' });
}

export async function uploadCustomFontFile(file: File) {
  return uploadCmsFile(file, { folder: 'general', mode: 'font', fileName: file.name });
}
