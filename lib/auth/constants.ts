export const STAFF_ROLES = ['super_admin', 'admin', 'editor', 'viewer'];
export const ADMIN_ROLES = ['super_admin', 'admin'];
export const EDITOR_ROLES = ['super_admin', 'admin', 'editor'];
export const ASSIGNABLE_STAFF_ROLES = ['editor', 'viewer'];
export const ALL_STAFF_ROLES = ['super_admin', 'admin', 'editor', 'viewer'];

/** Roles an actor may assign when creating or updating users. */
export function getCreatableRoles(actorRole) {
  if (actorRole === 'super_admin') return ALL_STAFF_ROLES;
  if (actorRole === 'admin') return ['admin', 'editor', 'viewer'];
  return [];
}

export const AUTH_ROUTES = ['/login', '/forget-password'];
export const PUBLIC_API_PREFIXES = ['/api/auth/', '/api/health/', '/api/appearance/public', '/api/cron/'];

/** Dashboard session lifetime (absolute from sign-in). */
export const SESSION_LIFETIME_SECONDS = 24 * 60 * 60;
export const SESSION_LIFETIME_MS = SESSION_LIFETIME_SECONDS * 1000;

export const SESSION_DEADLINE_COOKIE = 'pa_sess_deadline';
