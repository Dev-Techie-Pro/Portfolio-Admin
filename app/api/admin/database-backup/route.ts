import { guardAdmin } from '@/lib/auth/guard';
import { jsonGet, jsonOk } from '@/lib/api/json-response';
import {
  deleteExportRecord,
  generateSchemaGuide,
  generateSqlBackup,
  listDatabaseTables,
  listExportHistory,
} from '@/lib/admin/database-backup';
import { recordUserAction } from '@/lib/cms/activity-log';

function sqlDownloadResponse({ sql, filename }) {
  return new Response(sql, {
    status: 200,
    headers: {
      'Content-Type': 'application/sql; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function GET(request) {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const schema = searchParams.get('schema') === '1';

  try {
    if (schema) {
      const guide = await generateSchemaGuide({ userId: auth.user.id });

      await recordUserAction({
        userId: auth.user.id,
        actionTitle: 'Database schema exported',
        actionDescription: `Schema setup guide ${guide.filename} downloaded`,
        status: 'success',
        metadata: {
          action: 'database.schema.exported',
          filename: guide.filename,
          sizeBytes: guide.sizeBytes,
        },
        request,
      });

      return sqlDownloadResponse(guide);
    }

    const [catalog, history] = await Promise.all([
      listDatabaseTables(),
      listExportHistory(),
    ]);

    return jsonGet({
      tables: catalog.tables,
      history,
    });
  } catch (error) {
    return jsonOk({ error: error.message || 'Could not load database backup data.' }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const tables = Array.isArray(body.tables) ? body.tables : [];
    const format = String(body.format || 'sql').trim().toLowerCase();

    if (format !== 'sql') {
      return jsonOk({ error: 'Only SQL export is supported.' }, { status: 400 });
    }

    const backup = await generateSqlBackup({
      tables,
      userId: auth.user.id,
    });

    await recordUserAction({
      userId: auth.user.id,
      actionTitle: 'Database SQL backup exported',
      actionDescription: `Exported ${backup.tables.length} tables to ${backup.filename}`,
      status: 'success',
      metadata: {
        action: 'database.backup.exported',
        filename: backup.filename,
        sizeBytes: backup.sizeBytes,
        tables: backup.tables,
        format: 'sql',
      },
      request,
    });

    return sqlDownloadResponse(backup);
  } catch (error) {
    await recordUserAction({
      userId: auth.user.id,
      actionTitle: 'Database SQL backup failed',
      actionDescription: error.message || 'Export could not be completed',
      status: 'failed',
      metadata: { action: 'database.backup.failed' },
      request,
    }).catch(() => {});

    return jsonOk({ error: error.message || 'Export failed.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = await guardAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return jsonOk({ error: 'Export record id is required.' }, { status: 400 });
    }

    const deleted = await deleteExportRecord(id);
    if (!deleted) {
      return jsonOk({ error: 'Export record not found.' }, { status: 404 });
    }

    await recordUserAction({
      userId: auth.user.id,
      actionTitle: 'Export history entry removed',
      actionDescription: `Removed export log ${deleted.filename}`,
      status: 'success',
      metadata: {
        action: 'database.export.deleted',
        exportId: deleted.id,
        filename: deleted.filename,
      },
      request,
    });

    return jsonOk({ ok: true, deleted });
  } catch (error) {
    return jsonOk({ error: error.message || 'Could not delete export record.' }, { status: 500 });
  }
}
