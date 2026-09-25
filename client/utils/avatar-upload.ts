import { authService } from '../core/AuthService.js';
import { eventBus } from '../core/EventBus.js';
import { handleFileValidation, readOptimizedImageDataUrl } from './files.js';
import { applyUserDisplay, previewUserAvatar } from './user-display.js';
import { showToast } from '../modules/shell/toast.js';

const AVATAR_OPTS = { maxWidth: 192, maxHeight: 192, quality: 0.78 };

/**
 * Pick, optimize, and save the user's avatar without leaving the current page.
 * @param {File} file
 * @param {{ onPreview?: (url: string) => void, onComplete?: (profile: object|null) => void }} [opts]
 * @returns {Promise<object|null>} updated profile or null on failure
 */
export async function uploadUserAvatar(file, opts = {}) {
  if (!file) return null;
  if (!handleFileValidation(file)) return null;

  const previousImg = document.querySelector('#paUserDropdownAvatar .pa-avatar img');
  const previousAvatarUrl = previousImg?.src || null;

  const previewUrl = URL.createObjectURL(file);
  previewUserAvatar(previewUrl);
  opts.onPreview?.(previewUrl);

  const avatarBtn = document.getElementById('paUserDropdownAvatar');
  avatarBtn?.classList.add('is-uploading');

  try {
    const avatarUrl = await readOptimizedImageDataUrl(file, AVATAR_OPTS);
    const data = await authService.updateProfile({ avatarUrl });
    const profile = data?.profile ?? data;
    if (!profile || typeof profile !== 'object') {
      throw new Error('Server did not return an updated profile.');
    }

    applyUserDisplay({
      fullName: profile.fullName,
      username: profile.username,
      email: profile.email,
      role: profile.role,
      avatarUrl: profile.avatarUrl,
    });
    eventBus.emit('profile:updated', profile);
    showToast('Avatar updated!', 'success', 2200);
    opts.onComplete?.(profile);
    return profile;
  } catch (err) {
    if (previousAvatarUrl) {
      previewUserAvatar(previousAvatarUrl);
    } else {
      try {
        const profile = await authService.getProfile();
        applyUserDisplay(profile);
      } catch { /* keep preview cleared */ }
    }
    showToast(err?.message || 'Could not save avatar.', 'danger');
    opts.onComplete?.(null);
    return null;
  } finally {
    URL.revokeObjectURL(previewUrl);
    avatarBtn?.classList.remove('is-uploading');
  }
}
