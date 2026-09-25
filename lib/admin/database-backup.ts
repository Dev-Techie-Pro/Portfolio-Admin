import { createAdminClient } from '@/lib/supabase/admin';
import { SITE_ID } from '@/lib/cms/constants';
import {
  buildDataSection,
  buildSchemaSetupDocument,
  buildSelectedTablesSqlDocument,
  readMigrationSql,
  sortTablesForInsert,
} from '@/lib/admin/sql-dump';

const SCHEMA_VERSION = '2.0.0';
const PAGE_SIZE = 1000;
const EXCLUDED_TABLES = new Set(['dashboard_stats']);

const FALLBACK_TABLES = [
  'sites',
  'profiles',
  'site_settings',
  'notification_preferences',
  'security_settings',
  'two_factor_backup_codes',
  'user_sessions',
  'categories',
  'media_assets',
  'projects',
  'project_tags',
  'project_gallery_images',
  'technologies',
  'experience_entries',
  'testimonials',
  'blog_posts',
  'blog_post_tags',
  'blog_categories',
  'contact_messages',
  'contact_message_replies',
  'recent_activities',
  'login_activity',
  'tool_categories',
  'tool_items',
  'user_notifications',
  'backup_snapshots',
];

function exportTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sanitizeTableName(name) {
  return typeof name === 'string' && /^[a-z][a-z0-9_]*$/.test(name) ? name : null;
}

async function listPublicTableNames(admin) {
  const { data, error } = await admin.rpc('pa_admin_public_tables');
  if (!error && Array.isArray(data)) {
    return data
      .map((row) => (typeof row === 'string' ? row : row.table_name))
      .filter((name) => name && !EXCLUDED_TABLES.has(name));
  }
  return FALLBACK_TABLES.filter((name) => !EXCLUDED_TABLES.has(name));
}

async function fetchTableStats(admin, tableNames) {
  const { data, error } = await admin.rpc('pa_admin_public_table_stats');
  if (!error && Array.isArray(data) && data.length) {
    const allowed = new Set(tableNames);
    return data
      .filter((row) => allowed.has(row.table_name))
      .map((row) => ({
        name: row.table_name,
        rowCount: Number(row.row_count || 0),
        sizeBytes: Number(row.size_bytes || 0),
      }));
  }

  return Promise.all(tableNames.map(async (name) => {
    const { count, error: countError } = await admin
      .from(name)
      .select('*', { count: 'exact', head: true });

    return {
      name,
      rowCount: countError ? 0 : Number(count || 0),
      sizeBytes: null,
    };
  }));
}

async function fetchForeignKeyEdges(admin) {
  const { data, error } = await admin.rpc('pa_admin_foreign_key_edges');
  if (error || !Array.isArray(data)) return [];
  return data;
}

async function fetchAllRows(admin, table) {
  const rows = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin
      .from(table)
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to export ${table}: ${error.message}`);
    }

    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

async function recordExportAudit({
  userId,
  filename,
  sizeBytes,
  recordCounts,
}) {
  const admin = createAdminClient();
  const storagePath = 'exports/sql';

  const { error } = await admin.from('backup_snapshots').insert({
    site_id: SITE_ID,
    filename,
    storage_path: storagePath,
    status: 'completed',
    size_bytes: sizeBytes,
    record_counts: recordCounts,
    schema_version: SCHEMA_VERSION,
    created_by: userId || null,
    completed_at: new Date().toISOString(),
    error_message: null,
  });

  if (error) throw new Error(error.message);
}

export async function listDatabaseTables() {
  const admin = createAdminClient();
  const tableNames = await listPublicTableNames(admin);
  const tables = await fetchTableStats(admin, tableNames);
  tables.sort((a, b) => a.name.localeCompare(b.name));
  return { tables };
}

export async function listExportHistory(limit = 10) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('backup_snapshots')
    .select('id, filename, size_bytes, record_counts, schema_version, status, created_at, completed_at')
    .eq('site_id', SITE_ID)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data || []).filter((item) => {
    const format = item.record_counts?._meta?.format;
    return !format || format === 'sql';
  });
}

export async function deleteExportRecord(id) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('backup_snapshots')
    .select('id, filename')
    .eq('site_id', SITE_ID)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { error: deleteError } = await admin
    .from('backup_snapshots')
    .delete()
    .eq('site_id', SITE_ID)
    .eq('id', id);

  if (deleteError) throw new Error(deleteError.message);
  return data;
}

export async function generateSqlBackup({ tables, userId }) {
  if (!Array.isArray(tables) || !tables.length) {
    throw new Error('Select at least one table to export.');
  }

  const admin = createAdminClient();
  const allowed = new Set(await listPublicTableNames(admin));
  const selected = [...new Set(tables.map(sanitizeTableName).filter(Boolean))]
    .filter((name) => allowed.has(name));

  if (!selected.length) {
    throw new Error('No valid tables were selected.');
  }

  const edges = await fetchForeignKeyEdges(admin);
  const orderedTables = sortTablesForInsert(selected, edges);
  const tableRows = {};
  const recordCounts = { _meta: { format: 'sql', exportKind: 'data' } };

  for (const table of orderedTables) {
    const rows = await fetchAllRows(admin, table);
    tableRows[table] = rows;
    recordCounts[table] = rows.length;
  }

  const { sql: dataSql } = buildDataSection({
    tables: selected,
    tableRows,
    orderedTables,
  });

  const exportedAt = new Date().toISOString();
  const sql = buildSelectedTablesSqlDocument({
    dataSql,
    tables: orderedTables,
    recordCounts,
    exportedAt,
    siteId: SITE_ID,
  });

  const filename = `backup-data-${exportTimestamp()}.sql`;
  const sizeBytes = Buffer.byteLength(sql, 'utf8');

  await recordExportAudit({
    userId,
    filename,
    sizeBytes,
    recordCounts,
  });

  return {
    sql,
    filename,
    sizeBytes,
    recordCounts,
    tables: orderedTables,
    exportedAt,
  };
}

export async function generateSchemaGuide({ userId }) {
  const schemaSql = await readMigrationSql();
  const exportedAt = new Date().toISOString();
  const sql = buildSchemaSetupDocument({
    schemaSql,
    exportedAt,
    siteId: SITE_ID,
  });

  const filename = `schema-setup-${exportTimestamp()}.sql`;
  const sizeBytes = Buffer.byteLength(sql, 'utf8');
  const recordCounts = {
    _meta: { format: 'sql', exportKind: 'schema' },
  };

  await recordExportAudit({
    userId,
    filename,
    sizeBytes,
    recordCounts,
  });

  return {
    sql,
    filename,
    sizeBytes,
    exportedAt,
  };
}
