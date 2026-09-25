import { guardStaff } from '@/lib/auth/guard';
import { jsonGet, jsonGetCached } from '@/lib/api/json-response';
import { PAGE_KEYS } from '@/lib/cms/prefetch-config';
import { getBootstrapPayload } from '@/lib/cms/bootstrap';

export async function GET(request) {
  const auth = await guardStaff();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const requested = searchParams.get('page') || 'dashboard';
    const page = PAGE_KEYS[requested] ? requested : 'dashboard';
    const payload = await getBootstrapPayload(page, auth);
    return jsonGetCached(payload, 45);
  } catch (error) {
    return jsonGet({ error: error.message }, { status: 500 });
  }
}
