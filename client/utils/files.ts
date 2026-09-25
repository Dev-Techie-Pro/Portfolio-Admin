import { showToast } from '../modules/shell/toast.js';

const VALID_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Resize/compress an image in the browser before upload (keeps payload smaller for cover photos).
 * @param {File} file
 * @param {{ maxWidth?: number, maxHeight?: number, quality?: number }} [options]
 */
function drawOptimizedImageToCanvas(file, { maxWidth = 1200, maxHeight = 600, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      const scale = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not process image.'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const outputType = file.type === 'image/png' && scale === 1 ? 'image/png' : 'image/jpeg';
      resolve({ canvas, outputType, quality });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image.'));
    };

    img.src = objectUrl;
  });
}

export function readOptimizedImageDataUrl(file, options = {}) {
  return drawOptimizedImageToCanvas(file, options).then(({ canvas, outputType, quality }) => (
    canvas.toDataURL(outputType, quality)
  ));
}

/** Compressed image blob for Supabase Storage upload (avoids base64 in CMS rows). */
export function readOptimizedImageBlob(file, { maxWidth = 1200, maxHeight = 600, quality = 0.85 } = {}) {
  return drawOptimizedImageToCanvas(file, { maxWidth, maxHeight, quality }).then(
    ({ canvas, outputType, quality: q }) => new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve({ blob, mimeType: outputType }) : reject(new Error('Could not process image.'))),
        outputType,
        q,
      );
    }),
  );
}

export function handleFileValidation(file) {
  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    showToast(`"${file.name}" — only PNG, JPG, or WebP images are supported.`, 'danger');
    return false;
  }
  if (file.size > MAX_FILE_BYTES) {
    showToast(`"${file.name}" — file exceeds the 5MB limit.`, 'danger');
    return false;
  }
  return true;
}

export async function readValidFiles(fileList, { folder = 'general' } = {}) {
  const { uploadCmsFile } = await import('./media-upload.js');
  const files = Array.from(fileList || []);
  const results = [];
  for (const file of files) {
    if (!handleFileValidation(file)) continue;
    try {
      const uploaded = await uploadCmsFile(file, {
        folder,
        optimize: { maxWidth: 1920, maxHeight: 1080, quality: 0.88 },
      });
      results.push({
        url: uploaded.url,
        name: uploaded.fileName || file.name,
        size: uploaded.size || file.size,
        type: uploaded.mimeType || file.type,
      });
    } catch {
      /* skip failed upload */
    }
  }
  return results;
}
