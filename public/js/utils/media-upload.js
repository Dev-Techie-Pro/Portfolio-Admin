import { handleFileValidation, readOptimizedImageBlob } from "./files.js";
import { showToast } from "../modules/shell/toast.js";
class MediaUploadError extends Error {
  constructor(message) {
    super(message);
    this.name = "MediaUploadError";
  }
}
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
  MediaUploadError,
  uploadCmsFile,
  uploadCmsFileWithPreview,
  uploadContactAttachment,
  uploadCustomFontFile
};
