// Match the 5MB contact reply upload limit (~6.7M base64 chars + data: prefix).
const MAX_ATTACHMENT_DATA_URL_CHARS = 7_000_000;

function buildDataUrl(mime, contentBase64) {
  return `data:${mime};base64,${contentBase64}`;
}

function attachmentUrlFromDataUrl(dataUrl) {
  return dataUrl.length <= MAX_ATTACHMENT_DATA_URL_CHARS ? dataUrl : null;
}

function parseDataUrl(url) {
  const comma = url.indexOf(',');
  if (comma === -1) return null;
  const header = url.slice(0, comma);
  const contentBase64 = url.slice(comma + 1);
  const mimeMatch = /^data:([^;,]+)/.exec(header);
  const mime = mimeMatch?.[1] || 'application/octet-stream';
  const size = contentBase64 ? Math.floor((contentBase64.length * 3) / 4) : 0;
  return { mime, contentBase64, size };
}

/**
 * Resolve a reply attachment from an upload payload or media-library pick.
 * @param {Record<string, unknown> | null | undefined} input
 */
export async function resolveAttachmentInput(input) {
  if (!input || typeof input !== 'object') return null;

  if (input.fromMedia === true && typeof input.url === 'string') {
    const url = input.url.trim();
    const name = typeof input.name === 'string' ? input.name.trim() : 'attachment';
    const mimeHint = typeof input.mime === 'string' ? input.mime.trim() : '';
    const sizeHint = Number(input.size);

    if (url.startsWith('data:')) {
      const parsed = parseDataUrl(url);
      if (!parsed?.contentBase64) return null;
      const dataUrl = url.startsWith('data:') ? url : buildDataUrl(mimeHint || parsed.mime, parsed.contentBase64);
      return {
        name,
        mime: mimeHint || parsed.mime,
        size: Number.isFinite(sizeHint) && sizeHint > 0 ? sizeHint : parsed.size,
        contentBase64: parsed.contentBase64,
        attachmentUrl: url.startsWith('http://') || url.startsWith('https://')
          ? url
          : attachmentUrlFromDataUrl(dataUrl),
      };
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Could not load attachment from media library.');
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentBase64 = buffer.toString('base64');
      const mime = (mimeHint || res.headers.get('content-type') || 'application/octet-stream').split(';')[0];
      const dataUrl = buildDataUrl(mime, contentBase64);
      return {
        name,
        mime,
        size: Number.isFinite(sizeHint) && sizeHint > 0 ? sizeHint : buffer.length,
        contentBase64,
        attachmentUrl: attachmentUrlFromDataUrl(dataUrl) || url,
      };
    }

    return null;
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const contentBase64 = typeof input.contentBase64 === 'string' ? input.contentBase64.trim() : '';
  if (!name || !contentBase64) return null;
  const mime = typeof input.mime === 'string' ? input.mime.trim() : 'application/octet-stream';
  const size = Number(input.size);
  const dataUrl = buildDataUrl(mime, contentBase64);
  return {
    name,
    mime,
    size: Number.isFinite(size) ? size : null,
    contentBase64,
    attachmentUrl: attachmentUrlFromDataUrl(dataUrl),
  };
}
