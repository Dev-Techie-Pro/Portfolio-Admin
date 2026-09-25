import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import {
  SESSION_DEADLINE_COOKIE,
  SESSION_LIFETIME_MS,
  SESSION_LIFETIME_SECONDS,
} from './constants';

export function sessionDeadlineFromNow(now = Date.now()) {
  return now + SESSION_LIFETIME_MS;
}

export function applySessionDeadlineCookie(response: NextResponse, deadlineMs = sessionDeadlineFromNow()) {
  response.cookies.set(SESSION_DEADLINE_COOKIE, String(deadlineMs), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_LIFETIME_SECONDS,
  });
}

export function clearSessionDeadlineCookie(response: NextResponse) {
  response.cookies.set(SESSION_DEADLINE_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

function deadlineFromLastSignIn(user: Pick<User, 'last_sign_in_at'>) {
  if (!user.last_sign_in_at) return null;
  return new Date(user.last_sign_in_at).getTime() + SESSION_LIFETIME_MS;
}

export function getSessionDeadlineMs(
  user: Pick<User, 'last_sign_in_at'>,
  deadlineCookieValue?: string | null,
) {
  const raw = deadlineCookieValue ?? cookies().get(SESSION_DEADLINE_COOKIE)?.value;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return deadlineFromLastSignIn(user);
}

export function isDashboardSessionExpired(
  user: Pick<User, 'last_sign_in_at'>,
  deadlineCookieValue?: string | null,
) {
  const deadline = getSessionDeadlineMs(user, deadlineCookieValue);
  if (deadline == null) return false;
  return Date.now() > deadline;
}

/** Copy Set-Cookie headers from one Next response onto another (e.g. after sign-out). */
export function mergeResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}
