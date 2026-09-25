import {
  recordActivity,
  recordContentChange,
  recordUserAction,
} from './activity-log';

function actorName(auth) {
  return auth?.profile?.full_name
    || auth?.profile?.username
    || auth?.user?.email
    || 'Admin';
}

function userIdFrom(auth) {
  return auth?.user?.id || null;
}

/** Compare two arrays by legacy `id` field. */
export function diffArrayById(before = [], after = [], idKey = 'id') {
  const beforeMap = new Map(before.map((item) => [String(item[idKey]), item]));
  const afterMap = new Map(after.map((item) => [String(item[idKey]), item]));

  const created = after.filter((item) => !beforeMap.has(String(item[idKey])));
  const deleted = before.filter((item) => !afterMap.has(String(item[idKey])));
  const updated = after.filter((item) => {
    const prev = beforeMap.get(String(item[idKey]));
    if (!prev) return false;
    return Object.keys(prev).some((key) => {
      if (key === idKey || key === 'id') return false;
      return JSON.stringify(prev[key]) !== JSON.stringify(item[key]);
    });
  });

  return { created, updated, deleted };
}

/** Compare category maps keyed by slug. */
export function diffCategoryMap(before = {}, after = {}) {
  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));
  return {
    created: [...afterKeys].filter((k) => !beforeKeys.has(k)).map((k) => ({ key: k, ...after[k] })),
    deleted: [...beforeKeys].filter((k) => !afterKeys.has(k)).map((k) => ({ key: k, ...before[k] })),
    updated: [...afterKeys]
      .filter((k) => beforeKeys.has(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k]))
      .map((k) => ({ key: k, ...after[k] })),
  };
}

async function logItemEvent({
  auth,
  request,
  type = 'content_change',
  action,
  actionTitle,
  actionDescription,
  status,
  metadata = {},
}) {
  return recordActivity({
    userId: userIdFrom(auth),
    type,
    actionTitle,
    actionDescription,
    status,
    metadata: { action, ...metadata },
    request,
  });
}

/**
 * Log create / update / delete events for array-backed CMS entities.
 */
export async function logArrayEntityChanges({
  auth,
  request,
  entity,
  entityLabel,
  before = [],
  after = [],
  titleFn = (item) => item.title || item.name || 'Untitled',
  idKey = 'id',
}) {
  if (!auth?.ok) return;
  const { created, updated, deleted } = diffArrayById(before, after, idKey);
  const actor = actorName(auth);

  const tasks = [];

  for (const item of created) {
    const title = titleFn(item);
    tasks.push(logItemEvent({
      auth,
      request,
      action: `${entity}.created`,
      actionTitle: `New ${entityLabel} created`,
      actionDescription: `${actor} created "${title}"`,
      status: 'created',
      metadata: { entity, entityId: item[idKey], title },
    }));
  }

  for (const item of updated) {
    const title = titleFn(item);
    tasks.push(logItemEvent({
      auth,
      request,
      action: `${entity}.updated`,
      actionTitle: `${entityLabel} updated`,
      actionDescription: `${actor} updated "${title}"`,
      status: 'completed',
      metadata: { entity, entityId: item[idKey], title },
    }));
  }

  for (const item of deleted) {
    const title = titleFn(item);
    tasks.push(logItemEvent({
      auth,
      request,
      action: `${entity}.deleted`,
      actionTitle: `${entityLabel} deleted`,
      actionDescription: `${actor} deleted "${title}"`,
      status: 'warning',
      metadata: { entity, entityId: item[idKey], title },
    }));
  }

  await Promise.all(tasks);
}

/** Log media-specific events (upload / update / delete). */
export async function logMediaChanges({ auth, request, before = [], after = [] }) {
  await logArrayEntityChanges({
    auth,
    request,
    entity: 'media',
    entityLabel: 'Media file',
    before,
    after,
    titleFn: (m) => m.name || 'Untitled file',
  });
}

/** Log profile field changes after a successful update. */
export async function logProfileChanges({ auth, request, before, after, payload = {} }) {
  if (!auth?.ok || !before || !after) return;
  const actor = actorName(auth);
  const userId = userIdFrom(auth);
  const tasks = [];

  const fieldEvents = [
    { key: 'avatarUrl', action: 'user.avatar.updated', title: 'User avatar updated', status: 'uploaded' },
    { key: 'coverImageUrl', action: 'user.cover.updated', title: 'User cover image updated', status: 'uploaded' },
    { key: 'bio', action: 'user.bio.updated', title: 'User bio updated', status: 'success' },
    { key: 'location', action: 'user.location.updated', title: 'User location updated', status: 'success' },
    { key: 'website', action: 'user.website.updated', title: 'User website updated', status: 'success' },
    { key: 'role', action: 'user.role.changed', title: 'User role changed', status: 'warning' },
  ];

  for (const evt of fieldEvents) {
    if (!(evt.key in payload)) continue;
    if (String(before[evt.key] || '') === String(after[evt.key] || '')) continue;
    tasks.push(recordUserAction({
      userId,
      actionTitle: evt.title,
      actionDescription: `${actor} updated their ${evt.key.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
      status: evt.status,
      metadata: { action: evt.action, field: evt.key },
      request,
    }));
  }

  if ('socialLinks' in payload) {
    const prevLinks = Array.isArray(before.socialLinks) ? before.socialLinks : [];
    const nextLinks = Array.isArray(after.socialLinks) ? after.socialLinks : [];
    const prevSet = new Set(prevLinks);
    const nextSet = new Set(nextLinks);
    const added = nextLinks.filter((l) => !prevSet.has(l));
    const removed = prevLinks.filter((l) => !nextSet.has(l));

    if (added.length || (nextLinks.length !== prevLinks.length && !removed.length)) {
      tasks.push(recordUserAction({
        userId,
        actionTitle: 'User social media updated',
        actionDescription: `${actor} updated social media links`,
        status: 'success',
        metadata: { action: 'user.social.updated', added, count: nextLinks.length },
        request,
      }));
    }

    if (removed.length) {
      tasks.push(recordUserAction({
        userId,
        actionTitle: 'User social media deleted',
        actionDescription: `${actor} removed ${removed.length} social link(s)`,
        status: 'warning',
        metadata: { action: 'user.social.deleted', removed },
        request,
      }));
    }
  }

  const profileFields = ['fullName', 'username', 'email', 'phone', 'dob'];
  const profileChanged = profileFields.some((key) => (
    key in payload && String(before[key] || '') !== String(after[key] || '')
  ));

  if (profileChanged) {
    tasks.push(recordUserAction({
      userId,
      actionTitle: 'User profile updated',
      actionDescription: `${actor} updated profile information`,
      status: 'success',
      metadata: { action: 'user.updated' },
      request,
    }));
  }

  await Promise.all(tasks);
}

export async function logUserLogin({ userId, displayName, email, request }) {
  return recordUserAction({
    userId,
    actionTitle: `${displayName} logged in`,
    actionDescription: 'Successfully logged in to the admin dashboard',
    status: 'success',
    metadata: { action: 'user.login', email },
    request,
  });
}

export async function logUserLogout({ userId, email, request }) {
  return recordUserAction({
    userId,
    actionTitle: `${email || 'User'} logged out`,
    actionDescription: 'User session ended',
    status: 'info',
    metadata: { action: 'user.logout', email },
    request,
  });
}

export async function logPasswordChanged({ userId, email, request, reset = false }) {
  return recordUserAction({
    userId,
    actionTitle: reset ? 'User password reset' : 'User password changed',
    actionDescription: reset
      ? `${email || 'User'} reset their password`
      : `${email || 'User'} changed their password`,
    status: 'success',
    metadata: { action: reset ? 'user.password.reset' : 'user.password.changed', email },
    request,
  });
}

export async function logContactReplySent({ auth, request, message, reply, resend = false }) {
  if (!auth?.ok) return;
  const actor = actorName(auth);
  const label = message?.sender_name || message?.name || 'Contact message';
  return recordContentChange({
    userId: userIdFrom(auth),
    actionTitle: resend ? 'Contact reply resent' : 'Contact reply sent',
    actionDescription: `${actor} ${resend ? 'resent a reply to' : 'replied to'} "${label}"`,
    status: 'sent',
    metadata: {
      action: 'contact_message.replied',
      entity: 'contact_message',
      entityId: message?.id ?? message?.dbId,
      replyId: reply?.id,
      subject: reply?.subject || message?.subject,
    },
    request,
  });
}

export async function logContactReplyUpdated({ auth, request, message, reply }) {
  if (!auth?.ok) return;
  const actor = actorName(auth);
  const label = message?.sender_name || message?.name || 'Contact message';
  return recordContentChange({
    userId: userIdFrom(auth),
    actionTitle: 'Contact reply updated',
    actionDescription: `${actor} updated a reply to "${label}"`,
    status: 'success',
    metadata: {
      action: 'contact_message.replied',
      entity: 'contact_message',
      entityId: message?.id ?? message?.dbId,
      replyId: reply?.id,
    },
    request,
  });
}

export async function logContactReplyDeleted({ auth, request, message, replyId }) {
  if (!auth?.ok) return;
  const actor = actorName(auth);
  const label = message?.sender_name || message?.name || 'Contact message';
  return recordContentChange({
    userId: userIdFrom(auth),
    actionTitle: 'Contact reply deleted',
    actionDescription: `${actor} deleted a reply to "${label}"`,
    status: 'success',
    metadata: {
      action: 'contact_message.deleted',
      entity: 'contact_message',
      entityId: message?.id ?? message?.dbId,
      replyId,
    },
    request,
  });
}

export async function logContactMessagesChanged({ auth, request, before = [], after = [] }) {
  return logArrayEntityChanges({
    auth,
    request,
    entity: 'contact_message',
    entityLabel: 'contact message',
    before,
    after,
    titleFn: (item) => item.name || item.subject || 'Contact message',
  });
}
