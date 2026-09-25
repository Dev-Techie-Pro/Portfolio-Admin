import { guardAdmin } from '@/lib/auth/guard';
import { jsonGet, jsonOk } from '@/lib/api/json-response';
import { getEnvConfig, saveEnvConfig } from '@/lib/admin/env-config';
import { recordUserAction } from '@/lib/cms/activity-log';

export async function GET() {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.response;

  try {
    const config = await getEnvConfig();
    return jsonGet(config);
  } catch (error) {
    return jsonOk({ error: error.message || 'Could not load environment configuration.' }, { status: 500 });
  }
}

export async function PUT(request) {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const result = await saveEnvConfig(body?.values || body || {});

    await recordUserAction({
      userId: auth.user.id,
      actionTitle: 'Environment updated',
      actionDescription: 'Environment variables were saved to .env.local from System settings',
      status: 'success',
      metadata: { action: 'environment.updated', file: result.file },
      request,
    });

    const config = await getEnvConfig();
    return jsonOk({
      ok: true,
      message: 'Environment saved to .env.local. Restart the dev server for changes to take effect.',
      ...config,
    });
  } catch (error) {
    const status = error.validationErrors?.length ? 400 : 500;
    return jsonOk(
      {
        error: error.message || 'Could not save environment configuration.',
        validationErrors: error.validationErrors || undefined,
      },
      { status },
    );
  }
}
