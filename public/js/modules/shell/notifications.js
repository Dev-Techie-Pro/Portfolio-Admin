import { $id, escapeHtml } from "../../utils/dom.js";
import { storage } from "../../core/StorageService.js";
import { eventBus } from "../../core/EventBus.js";
let notifications = [];
let unreadCount = 0;
let loading = false;
function formatRelativeTime(iso) {
  if (!iso) return "Just now";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 6e4);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
function maybeShowBrowserNotification(item) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(item.title, {
      body: item.body || "",
      icon: "/favicon.ico",
      tag: item.id
    });
  } catch {
  }
}
function renderNotifications() {
  const list = $id("paNotifList");
  const badge = $id("paNotifBadge");
  if (!list) return;
  if (loading) {
    list.innerHTML = '<div class="pa-notif-empty"><i class="ri-loader-4-line"></i> Loading notifications\u2026</div>';
    return;
  }
  if (notifications.length === 0) {
    list.innerHTML = `<div class="pa-notif-empty"><i class="ri-notification-off-line" style="font-size:24px;display:block;margin-bottom:8px;"></i>No new notifications</div>`;
  } else {
    list.innerHTML = notifications.map(
      (n) => `
      <div class="pa-notif-item${n.read ? " is-read" : ""}" data-notif-id="${escapeHtml(n.id)}"${n.linkPath ? ` data-notif-link="${escapeHtml(n.linkPath)}"` : ""} role="button" tabindex="0">
        <div class="pa-notif-item-icon"><i class="${escapeHtml(n.icon || "ri-information-line")}"></i></div>
        <div>
          <div class="pa-notif-item-text">${escapeHtml(n.title)}</div>
          ${n.body ? `<div class="pa-notif-item-desc">${escapeHtml(n.body)}</div>` : ""}
          <div class="pa-notif-item-time">${escapeHtml(formatRelativeTime(n.createdAt))}</div>
        </div>
      </div>`
    ).join("");
  }
  if (badge) {
    const count = unreadCount || notifications.filter((n) => !n.read).length;
    if (count > 0) {
      badge.textContent = count > 9 ? "9+" : String(count);
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }
}
async function loadNotifications({ silent = false } = {}) {
  if (!silent) {
    loading = true;
    renderNotifications();
  }
  try {
    const payload = await storage.get("pa_notifications", { notifications: [], unreadCount: 0 });
    notifications = Array.isArray(payload?.notifications) ? payload.notifications : [];
    unreadCount = Number(payload?.unreadCount) || notifications.filter((n) => !n.read).length;
  } catch {
    notifications = [];
    unreadCount = 0;
  } finally {
    loading = false;
    renderNotifications();
  }
}
async function addNotification(text, icon, options = {}) {
  const title = String(text || "").trim();
  if (!title) return;
  try {
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        title,
        icon: icon || "ri-information-line",
        body: options.body || null,
        category: options.category || "other",
        linkPath: options.linkPath || null,
        metadata: options.metadata || {}
      })
    });
    const payload = await res.json().catch(() => ({}));
    if (res.ok && payload.notification) {
      notifications = [payload.notification, ...notifications.filter((n) => n.id !== payload.notification.id)];
      unreadCount += payload.notification.read ? 0 : 1;
      storage.invalidate("pa_notifications");
      renderNotifications();
      maybeShowBrowserNotification(payload.notification);
      eventBus.emit("notifications:updated", { notifications, unreadCount });
      return payload.notification;
    }
  } catch {
  }
  const fallback = {
    id: `local-${Date.now()}`,
    title,
    body: options.body || "",
    icon: icon || "ri-information-line",
    read: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    linkPath: options.linkPath || ""
  };
  notifications = [fallback, ...notifications];
  unreadCount += 1;
  renderNotifications();
  return fallback;
}
async function clearNotifications() {
  try {
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ clearAll: true })
    });
    storage.invalidate("pa_notifications");
  } catch {
  }
  notifications = [];
  unreadCount = 0;
  renderNotifications();
  eventBus.emit("notifications:updated", { notifications, unreadCount });
}
async function markNotificationRead(notificationId) {
  if (!notificationId) return;
  try {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ ids: [notificationId] })
    });
    const payload = await res.json().catch(() => ({}));
    if (res.ok) {
      notifications = payload.notifications || notifications.map((n) => n.id === notificationId ? { ...n, read: true } : n);
      unreadCount = payload.unreadCount ?? notifications.filter((n) => !n.read).length;
      storage.invalidate("pa_notifications");
      renderNotifications();
      eventBus.emit("notifications:updated", { notifications, unreadCount });
    }
  } catch {
  }
}
async function markAllNotificationsRead() {
  try {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ markAllRead: true })
    });
    const payload = await res.json().catch(() => ({}));
    if (res.ok) {
      notifications = payload.notifications || notifications.map((n) => ({ ...n, read: true }));
      unreadCount = 0;
      storage.invalidate("pa_notifications");
      renderNotifications();
      eventBus.emit("notifications:updated", { notifications, unreadCount });
    }
  } catch {
  }
}
async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}
function getUnreadCount() {
  return unreadCount;
}
export {
  addNotification,
  clearNotifications,
  getUnreadCount,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  renderNotifications,
  requestBrowserNotificationPermission
};
