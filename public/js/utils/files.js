import { showToast } from "../modules/shell/toast.js";
const VALID_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function readOptimizedImageDataUrl(file, { maxWidth = 1200, maxHeight = 600, quality = 0.85 } = {}) {
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
      resolve(canvas.toDataURL(outputType, quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image."));
    };
    img.src = objectUrl;
  });
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
async function readValidFiles(fileList) {
  const files = Array.from(fileList || []);
  const results = [];
  for (const file of files) {
    if (!handleFileValidation(file)) continue;
    try {
      const url = await readFileAsDataUrl(file);
      results.push({ url, name: file.name, size: file.size, type: file.type });
    } catch {
    }
  }
  return results;
}
export {
  handleFileValidation,
  readFileAsDataUrl,
  readOptimizedImageDataUrl,
  readValidFiles
};
