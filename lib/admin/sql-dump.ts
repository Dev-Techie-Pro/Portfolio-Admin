import fs from 'fs/promises';
import path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');
const INSERT_BATCH_SIZE = 100;

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

export function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
  if (Array.isArray(value)) {
    const items = value.map((item) => {
      if (item === null || item === undefined) return 'NULL';
      if (typeof item === 'boolean') return item ? 'TRUE' : 'FALSE';
      if (typeof item === 'number') return Number.isFinite(item) ? String(item) : 'NULL';
      return `'${String(item).replace(/'/g, "''")}'`;
    });
    return `ARRAY[${items.join(', ')}]`;
  }
  if (typeof value === 'object') {
    const json = JSON.stringify(value).replace(/'/g, "''");
    return `'${json}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function sortTablesForInsert(tables, edges = []) {
  const tableSet = new Set(tables);
  const incoming = new Map(tables.map((t) => [t, 0]));
  const adjacency = new Map(tables.map((t) => [t, new Set()]));

  for (const edge of edges) {
    const child = edge.child_table || edge.childTable;
    const parent = edge.parent_table || edge.parentTable;
    if (!tableSet.has(child) || !tableSet.has(parent) || child === parent) continue;
    if (!adjacency.get(parent).has(child)) {
      adjacency.get(parent).add(child);
      incoming.set(child, (incoming.get(child) || 0) + 1);
    }
  }

  const queue = tables.filter((t) => (incoming.get(t) || 0) === 0).sort();
  const ordered = [];

  while (queue.length) {
    const next = queue.shift();
    ordered.push(next);
    for (const child of adjacency.get(next) || []) {
      incoming.set(child, incoming.get(child) - 1);
      if (incoming.get(child) === 0) {
        queue.push(child);
        queue.sort();
      }
    }
  }

  if (ordered.length !== tables.length) {
    const missing = tables.filter((t) => !ordered.includes(t));
    return [...ordered, ...missing.sort()];
  }

  return ordered;
}

export async function readMigrationSql() {
  let files = [];
  try {
    files = (await fs.readdir(MIGRATIONS_DIR))
      .filter((name) => name.endsWith('.sql'))
      .sort();
  } catch {
    return '-- No local migration files found.\n';
  }

  const chunks = [
    '-- Schema generated from Supabase migration files in supabase/migrations/',
    '-- Run on a fresh database, or skip this section if schema already exists.',
    '',
  ];

  for (const file of files) {
    const content = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    chunks.push('-- -----------------------------------------------------------------------------');
    chunks.push(`-- Migration: ${file}`);
    chunks.push('-- -----------------------------------------------------------------------------');
    chunks.push(content.trim());
    chunks.push('');
  }

  return `${chunks.join('\n')}\n`;
}

function buildInsertStatement(table, rows) {
  if (!rows.length) return '';

  const columns = Object.keys(rows[0]);
  const columnSql = columns.map((col) => quoteIdent(col)).join(', ');
  const lines = [`INSERT INTO public.${quoteIdent(table)} (${columnSql}) VALUES`];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const values = columns.map((col) => sqlLiteral(row[col])).join(', ');
    const suffix = i === rows.length - 1 ? ';' : ',';
    lines.push(`  (${values})${suffix}`);
  }

  return `${lines.join('\n')}\n`;
}

export function buildDataSection({ tables, tableRows, orderedTables }) {
  const truncateList = orderedTables.map((table) => `public.${quoteIdent(table)}`).join(',\n  ');

  const chunks = [
    '-- -----------------------------------------------------------------------------',
    '-- Live data snapshot (INSERT statements)',
    '-- -----------------------------------------------------------------------------',
    'BEGIN;',
    '',
    "SET session_replication_role = 'replica';",
    '',
    '-- Clear existing rows before loading snapshot (safe after schema migrations).',
    `TRUNCATE TABLE\n  ${truncateList}\nRESTART IDENTITY CASCADE;`,
    '',
  ];

  let totalRows = 0;

  for (const table of orderedTables) {
    const rows = tableRows[table] || [];
    if (!rows.length) continue;

    chunks.push(`-- Table: ${table} (${rows.length} rows)`);
    for (let offset = 0; offset < rows.length; offset += INSERT_BATCH_SIZE) {
      const batch = rows.slice(offset, offset + INSERT_BATCH_SIZE);
      chunks.push(buildInsertStatement(table, batch));
    }
    chunks.push('');
    totalRows += rows.length;
  }

  chunks.push("SET session_replication_role = 'origin';");
  chunks.push('COMMIT;');
  chunks.push('');

  return { sql: chunks.join('\n'), totalRows };
}

export function buildSelectedTablesSqlDocument({
  dataSql,
  tables,
  recordCounts,
  exportedAt,
  siteId,
}) {
  const totalRows = Object.entries(recordCounts)
    .filter(([key]) => key !== '_meta')
    .reduce((sum, [, count]) => sum + Number(count || 0), 0);

  const header = [
    '-- =============================================================================',
    '-- Portfolio Dashboard — SQL Data Backup',
    '-- =============================================================================',
    `-- Generated: ${exportedAt}`,
    `-- Site ID: ${siteId || 'unknown'}`,
    `-- Tables (${tables.length}): ${tables.join(', ')}`,
    `-- Rows: ${totalRows}`,
    '--',
    '-- Restore notes:',
    '-- 1) Apply schema first using "Download Schema & Setup Guide" if this is a new database.',
    '-- 2) Run this file in the Supabase SQL Editor or via psql.',
    '-- 3) Auth users (auth.users) and storage files are NOT included in this export.',
    '-- =============================================================================',
    '',
  ];

  return `${header.join('\n')}${dataSql.trim()}\n`;
}

export function buildSchemaSetupDocument({ schemaSql, exportedAt, siteId }) {
  const header = [
    '-- =============================================================================',
    '-- Portfolio Dashboard — Schema & Setup Guide',
    '-- =============================================================================',
    `-- Generated: ${exportedAt}`,
    `-- Site ID: ${siteId || 'unknown'}`,
    '--',
    '-- MANUAL SETUP INSTRUCTIONS',
    '-- =========================',
    '-- 1. Create a new Supabase project (or an empty PostgreSQL database).',
    '-- 2. Open the Supabase SQL Editor (Dashboard → SQL → New query).',
    '-- 3. Run the SCHEMA section below from top to bottom.',
    '-- 4. (Optional) Run a separate data backup SQL file to restore CMS content.',
    '-- 5. Update .env.local with your new project credentials:',
    '--      NEXT_PUBLIC_SUPABASE_URL',
    '--      NEXT_PUBLIC_SUPABASE_ANON_KEY',
    '--      SUPABASE_SERVICE_ROLE_KEY',
    '--      NEXT_PUBLIC_SITE_URL',
    '-- 6. Restart the Next.js app (npm run dev or your production process).',
    '-- 7. Sign in — Supabase Auth users are NOT restored by schema SQL alone.',
    '--    Create an admin user via the dashboard Auth UI or your signup flow.',
    '--',
    '-- IMPORTANT LIMITATIONS',
    '-- =====================',
    '-- • This file covers public schema tables, functions, and policies from migrations.',
    '-- • auth.users and auth identities are NOT exported — recreate login accounts manually.',
    '-- • Supabase Storage bucket objects are NOT exported — re-upload media or sync storage.',
    '-- • Edge functions, webhooks, and third-party integrations need separate setup.',
    '-- =============================================================================',
    '',
    '-- >>> SECTION: SCHEMA (from supabase/migrations/)',
    '',
  ];

  return `${header.join('\n')}${schemaSql.trim()}\n`;
}
