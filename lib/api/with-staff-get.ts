import { guardStaff } from '@/lib/auth/guard';
import { jsonGet, jsonGetCached } from '@/lib/api/json-response';

/**
 * Shared GET handler wrapper — one auth check + consistent cache headers.
 */
export async function withStaffGet(handler, { maxAgeSec = 0 } = {}) {
  const auth = await guardStaff();
  if (!auth.ok) return auth.response;

  try {
    const data = await handler(auth);
    if (maxAgeSec > 0) return jsonGetCached(data, maxAgeSec);
    return jsonGet(data);
  } catch (error) {
    const status = error?.status || 500;
    return jsonGet({ error: error.message }, { status });
  }
}
