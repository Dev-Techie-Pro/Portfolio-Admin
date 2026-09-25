import fs from 'fs/promises';
import path from 'path';

export const UNCHANGED_SECRET = '__UNCHANGED__';

export const UI_ENV_DEFINITIONS = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', required: true, secret: false, type: 'url' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key', required: true, secret: true, type: 'text' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key', required: true, secret: true, type: 'text' },
  { key: 'NEXT_PUBLIC_SITE_URL', label: 'Site URL', required: true, secret: false, type: 'url' },
  { key: 'CRON_SECRET', label: 'Cron Secret', required: false, secret: true, type: 'text' },
  { key: 'SMTP_HOST', label: 'SMTP Host', required: false, secret: false, type: 'text' },
  { key: 'SMTP_PORT', label: 'SMTP Port', required: false, secret: false, type: 'number' },
  { key: 'SMTP_USER', label: 'SMTP User', required: false, secret: false, type: 'email' },
  { key: 'SMTP_PASS', label: 'SMTP Password', required: false, secret: true, type: 'password' },
  { key: 'SMTP_FROM', label: 'SMTP From Address', required: false, secret: false, type: 'email' },
  { key: 'EMAIL_BRAND_NAME', label: 'Email Brand Name', required: false, secret: false, type: 'text' },
  { key: 'EMAIL_BRAND_ROLE', label: 'Email Brand Role', required: false, secret: false, type: 'text' },
  { key: 'EMAIL_PORTFOLIO_LABEL', label: 'Email Portfolio Label', required: false, secret: false, type: 'text' },
  { key: 'EMAIL_PORTFOLIO_URL', label: 'Email Portfolio URL', required: false, secret: false, type: 'url' },
  { key: 'EMAIL_GITHUB_URL', label: 'Email GitHub URL', required: false, secret: false, type: 'url' },
  { key: 'EMAIL_LINKEDIN_URL', label: 'Email LinkedIn URL', required: false, secret: false, type: 'url' },
];

const UI_ENV_KEYS = UI_ENV_DEFINITIONS.map((item) => item.key);
const SECRET_KEYS = new Set(UI_ENV_DEFINITIONS.filter((item) => item.secret).map((item) => item.key));

function localEnvPath() {
  return path.join(process.cwd(), '.env.local');
}

function exampleEnvPath() {
  return path.join(process.cwd(), '.env.example');
}

function baseEnvPath() {
  return path.join(process.cwd(), '.env');
}

export function maskSecretValue(value) {
  if (!value) return '';
  const text = String(value);
  if (text.length <= 8) return '••••••••';
  return `${text.slice(0, 4)}${'•'.repeat(Math.min(12, text.length - 8))}${text.slice(-4)}`;
}

export function parseEnvFile(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

async function readEnvSource() {
  for (const filePath of [localEnvPath(), baseEnvPath(), exampleEnvPath()]) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return { content, filePath };
    } catch {
      /* try next */
    }
  }
  return { content: '', filePath: localEnvPath() };
}

export async function canWriteEnvFile() {
  try {
    await fs.access(process.cwd(), fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export async function getEnvConfig() {
  const { content, filePath } = await readEnvSource();
  const parsed = parseEnvFile(content);
  const values = {};
  const masked = {};
  const configured = {};

  for (const key of UI_ENV_KEYS) {
    const resolved = parsed[key] ?? process.env[key] ?? '';
    values[key] = resolved;
    configured[key] = Boolean(resolved);
    masked[key] = SECRET_KEYS.has(key) && resolved ? maskSecretValue(resolved) : resolved;
  }

  return {
    values: masked,
    configured,
    source: path.basename(filePath),
    writable: await canWriteEnvFile(),
    targetFile: '.env.local',
  };
}

function serializeValue(value) {
  const text = String(value ?? '');
  if (!text) return '';
  if (/[\s#"'=]/.test(text)) return `"${text.replace(/"/g, '\\"')}"`;
  return text;
}

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateEnvUpdates(updates = {}) {
  const errors = [];

  for (const def of UI_ENV_DEFINITIONS) {
    const value = updates[def.key];
    if (value === UNCHANGED_SECRET || value === undefined) continue;
    const trimmed = String(value).trim();

    if (def.required && !trimmed) {
      errors.push(`${def.label} is required.`);
      continue;
    }
    if (!trimmed) continue;

    if (def.type === 'url' && !isValidUrl(trimmed)) {
      errors.push(`${def.label} must be a valid URL.`);
    }
    if (def.type === 'email' && !isValidEmail(trimmed)) {
      errors.push(`${def.label} must be a valid email address.`);
    }
    if (def.type === 'number') {
      const port = Number(trimmed);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        errors.push(`${def.label} must be a number between 1 and 65535.`);
      }
    }
    if (def.key === 'NEXT_PUBLIC_SUPABASE_URL' && !trimmed.includes('supabase.co')) {
      errors.push('Supabase URL should point to your *.supabase.co project.');
    }
  }

  const smtpFields = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const smtpProvided = smtpFields.some((key) => {
    const value = updates[key];
    return value && value !== UNCHANGED_SECRET && String(value).trim();
  });
  if (smtpProvided) {
    for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']) {
      const value = updates[key];
      if (value === UNCHANGED_SECRET) continue;
      if (!String(value || '').trim()) {
        errors.push('When configuring SMTP, host, user, and password are required.');
        break;
      }
    }
  }

  return errors;
}

export async function saveEnvConfig(updates = {}) {
  const errors = validateEnvUpdates(updates);
  if (errors.length) {
    const err = new Error(errors[0]);
    err.validationErrors = errors;
    throw err;
  }

  const { content } = await readEnvSource();
  const parsed = parseEnvFile(content);
  const merged = { ...parsed };

  for (const key of UI_ENV_KEYS) {
    const value = updates[key];
    if (value === undefined || value === UNCHANGED_SECRET) continue;
    merged[key] = String(value).trim();
  }

  const handled = new Set();
  const lines = content ? content.split('\n') : [];
  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return line;
    const key = trimmed.slice(0, eq).trim();
    if (!UI_ENV_KEYS.includes(key)) return line;
    handled.add(key);
    return `${key}=${serializeValue(merged[key] ?? '')}`;
  });

  for (const key of UI_ENV_KEYS) {
    if (handled.has(key)) continue;
    if (merged[key] == null || merged[key] === '') continue;
    nextLines.push(`${key}=${serializeValue(merged[key])}`);
  }

  const output = nextLines.join('\n').replace(/\n+$/, '') + '\n';
  await fs.writeFile(localEnvPath(), output, 'utf8');
  return { ok: true, file: '.env.local' };
}
