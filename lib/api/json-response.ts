import { NextResponse } from 'next/server';

/**
 * JSON response for authenticated CMS GET routes.
 * Prevents shared caches from storing staff data; allows private revalidation.
 */
export function jsonGet(data, init = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
  }
  return NextResponse.json(data, { ...init, headers });
}

/** JSON GET with short private cache (reduces repeat Supabase reads). */
export function jsonGetCached(data, maxAgeSec = 60, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', `private, max-age=${maxAgeSec}, stale-while-revalidate=${Math.max(maxAgeSec, 60)}`);
  return NextResponse.json(data, { ...init, headers });
}

/** JSON response for mutations and sensitive endpoints. */
export function jsonOk(data, init = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'private, no-store');
  }
  return NextResponse.json(data, { ...init, headers });
}
