import { authService } from "../core/AuthService.js";
import { eventBus } from "../core/EventBus.js";
import { handleFileValidation } from "./files.js";
import { uploadCmsFileWithPreview } from "./media-upload.js";
import { applyUserDisplay, previewUserAvatar } from "./user-display.js";
import { showToast } from "../modules/shell/toast.js";
const AVATAR_OPTS = { maxWidth: 192, maxHeight: 192, quality: 0.78 };
async function uploadUserAvatar(file, opts = {}) {
  if (!file) return null;
  if (!handleFileValidation(file)) return null;
  const previousImg = document.querySelector("#paUserDropdownAvatar .pa-avatar img");
  const previousAvatarUrl = previousImg?.src || null;
  const previewUrl = URL.createObjectURL(file);
  previewUserAvatar(previewUrl);
  opts.onPreview?.(previewUrl);
  const avatarBtn = document.getElementById("paUserDropdownAvatar");
  avatarBtn?.classList.add("is-uploading");
  try {
    const uploaded = await uploadCmsFileWithPreview(file, {
      folder: "avatars",
      optimize: AVATAR_OPTS
    });
    const data = await authService.updateProfile({ avatarUrl: uploaded.url });
    const profile = data?.profile ?? data;
    if (!profile || typeof profile !== "object") {
      throw new Error("Server did not return an updated profile.");
    }
    applyUserDisplay({
      fullName: profile.fullName,
      username: profile.username,
      email: profile.email,
      role: profile.role,
      avatarUrl: profile.avatarUrl
    });
    eventBus.emit("profile:updated", profile);
    showToast("Avatar updated!", "success", 2200);
    opts.onComplete?.(profile);
    return profile;
  } catch (err) {
    if (previousAvatarUrl) {
      previewUserAvatar(previousAvatarUrl);
    } else {
      try {
        const profile = await authService.getProfile();
        applyUserDisplay(profile);
      } catch {
      }
    }
    showToast(err?.message || "Could not save avatar.", "danger");
    opts.onComplete?.(null);
    return null;
  } finally {
    URL.revokeObjectURL(previewUrl);
    avatarBtn?.classList.remove("is-uploading");
  }
}
export {
  uploadUserAvatar
};
