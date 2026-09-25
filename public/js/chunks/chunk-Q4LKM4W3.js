import {
  showToast
} from "./chunk-R5CPOL4O.js";

// client/utils/files.ts
var VALID_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
var MAX_FILE_BYTES = 5 * 1024 * 1024;
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
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const outputType = file.type === "image/png" && scale === 1 ? "image/png" : "image/jpeg";
      resolve({ canvas, outputType, quality });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image."));
    };
    img.src = objectUrl;
  });
}
function readOptimizedImageBlob(file, { maxWidth = 1200, maxHeight = 600, quality = 0.85 } = {}) {
  return drawOptimizedImageToCanvas(file, { maxWidth, maxHeight, quality }).then(
    ({ canvas, outputType, quality: q }) => new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve({ blob, mimeType: outputType }) : reject(new Error("Could not process image.")),
        outputType,
        q
      );
    })
  );
}
function handleFileValidation(file) {
  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    showToast(`"${file.name}" \u2014 only PNG, JPG, or WebP images are supported.`, "danger");
    return false;
  }
  if (file.size > MAX_FILE_BYTES) {
    showToast(`"${file.name}" \u2014 file exceeds the 5MB limit.`, "danger");
    return false;
  }
  return true;
}

// client/utils/media-upload.ts
var MediaUploadError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MediaUploadError";
  }
};
async function postUploadForm(form) {
  const res = await fetch("/api/media/upload", {
    method: "POST",
    body: form,
    credentials: "same-origin"
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new MediaUploadError("Session expired. Please sign in again.");
  }
  const raw = await res.text();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }
  if (!res.ok) {
    throw new MediaUploadError(payload.error || raw || "Upload failed.");
  }
  return payload;
}
async function uploadCmsFile(file, options = {}) {
  if (!file) throw new MediaUploadError("No file selected.");
  const mode = options.mode || "image";
  if (mode === "image" && !handleFileValidation(file)) {
    throw new MediaUploadError("Invalid image file.");
  }
  const folder = options.folder || "general";
  const form = new FormData();
  form.append("folder", folder);
  form.append("mode", mode);
  if (options.optimize && mode === "image") {
    const { blob, mimeType } = await readOptimizedImageBlob(file, options.optimize);
    const ext = mimeType === "image/png" ? ".png" : ".jpg";
    const baseName = (options.fileName || file.name).replace(/\.[^.]+$/, "") + ext;
    form.append("file", blob, baseName);
  } else {
    form.append("file", file, options.fileName || file.name);
  }
  const payload = await postUploadForm(form);
  if (!payload.url) throw new MediaUploadError("Upload did not return a URL.");
  return {
    url: payload.url,
    storagePath: payload.storagePath || "",
    fileName: payload.fileName || file.name,
    size: Number(payload.size) || file.size,
    mimeType: payload.mimeType || file.type,
    folder: payload.folder || folder
  };
}
async function uploadCmsFileWithPreview(file, options = {}) {
  const previewUrl = URL.createObjectURL(file);
  options.onPreview?.(previewUrl);
  try {
    return await uploadCmsFile(file, options);
  } finally {
    URL.revokeObjectURL(previewUrl);
  }
}
async function uploadContactAttachment(file) {
  if (!file) throw new MediaUploadError("No file selected.");
  if (file.size > 5 * 1024 * 1024) {
    showToast("Attachment exceeds the 5MB limit.", "danger");
    throw new MediaUploadError("Attachment exceeds the 5MB limit.");
  }
  return uploadCmsFile(file, { folder: "contact", mode: "contact" });
}
async function uploadCustomFontFile(file) {
  return uploadCmsFile(file, { folder: "general", mode: "font", fileName: file.name });
}

export {
  handleFileValidation,
  MediaUploadError,
  uploadCmsFile,
  uploadCmsFileWithPreview,
  uploadContactAttachment,
  uploadCustomFontFile
};
