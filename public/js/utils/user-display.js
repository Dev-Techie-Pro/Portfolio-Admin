function setImageSrc(container, url, { alt = "" } = {}) {
  if (!container) return;
  container.innerHTML = "";
  if (!url) return;
  const img = document.createElement("img");
  img.src = url;
  img.alt = alt;
  img.decoding = "async";
  container.appendChild(img);
}
const ADMIN_ROLES = ["super_admin", "admin"];
const EDITOR_ROLES = ["super_admin", "admin", "editor"];
function applyUserDisplay(user) {
  if (!user) return;
  const displayName = user.fullName || user.username || user.email || "User";
  const displayRole = user.role ? user.role.replace(/_/g, " ") : "Staff";
  document.querySelectorAll(".pa-user-name").forEach((el) => {
    el.textContent = displayName;
  });
  document.querySelectorAll(".pa-user-role").forEach((el) => {
    el.textContent = displayRole;
  });
  document.querySelectorAll(".pa-user-email").forEach((el) => {
    el.textContent = user.email || "";
  });
  document.querySelectorAll(
    "#paUserMenuAvatar, #paUserMenu .pa-avatar, .pa-header-user .pa-avatar, #paUserDropdownAvatar .pa-avatar, #paRailAvatar .pa-avatar"
  ).forEach((el) => {
    renderAvatarElement(el, user.avatarUrl);
  });
  applyRoleBasedAccess(user.role);
}
function pruneInaccessibleSidebarNav(isAdmin) {
  document.querySelectorAll(".pa-admin-only-item").forEach((el) => {
    if (isAdmin) {
      el.removeAttribute("hidden");
      el.removeAttribute("aria-hidden");
      el.style.removeProperty("display");
    } else {
      el.setAttribute("hidden", "");
      el.setAttribute("aria-hidden", "true");
      el.style.display = "none";
    }
  });
}
function applyRoleBasedAccess(role) {
  const isAdmin = ADMIN_ROLES.includes(role);
  const isEditor = EDITOR_ROLES.includes(role);
  const isViewer = role === "viewer";
  document.body.classList.toggle("pa-role-editor", role === "editor");
  document.body.classList.toggle("pa-role-viewer", isViewer);
  document.body.classList.toggle("pa-role-admin", isAdmin);
  document.body.classList.toggle("pa-role-readonly", isViewer);
  document.body.classList.toggle("pa-role-can-edit", isEditor);
  pruneInaccessibleSidebarNav(isAdmin);
}
function renderAvatarElement(container, url) {
  if (!container) return;
  if (url) {
    setImageSrc(container, url);
  } else {
    container.innerHTML = '<i class="ri-user-3-fill"></i>';
  }
}
function previewUserAvatar(url) {
  document.querySelectorAll(
    "#paUserMenuAvatar, #paUserMenu .pa-avatar, .pa-header-user .pa-avatar, #paUserDropdownAvatar .pa-avatar, #paRailAvatar .pa-avatar"
  ).forEach((el) => {
    renderAvatarElement(el, url);
  });
}
function renderPreviewAvatar(container, url) {
  if (!container) return;
  if (url) {
    setImageSrc(container, url, { alt: "Profile photo" });
  } else {
    container.innerHTML = '<i class="ri-user-3-fill"></i>';
  }
}
function setCoverImage(imgEl, url) {
  const img = imgEl?.tagName === "IMG" ? imgEl : document.getElementById("coverImage");
  if (!img) return;
  if (url) {
    img.src = url;
    img.hidden = false;
    img.removeAttribute("hidden");
  } else {
    img.removeAttribute("src");
    img.hidden = true;
  }
}
export {
  applyRoleBasedAccess,
  applyUserDisplay,
  previewUserAvatar,
  renderAvatarElement,
  renderPreviewAvatar,
  setCoverImage
};
