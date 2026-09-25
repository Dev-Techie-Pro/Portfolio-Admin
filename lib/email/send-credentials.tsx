import nodemailer from 'nodemailer';
import {
  THEME,
  buildBrandSignatureHtml,
  escapeHtml,
  getBrand,
  getFromAddress,
  getLoginUrl,
  getSmtpConfig,
  normalizeFromEmail,
} from './shared';

const STAFF_ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

function formatStaffRoleLabel(role) {
  return STAFF_ROLE_LABELS[role] || String(role || 'Staff').replace(/_/g, ' ');
}

function credentialRow(label, value, { mono = false } = {}) {
  const valueStyle = mono
    ? `font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:${THEME.text};letter-spacing:0.02em;`
    : `color:${THEME.soft};`;

  return `
    <tr>
      <td style="padding:6px 0;font-size:14px;line-height:1.55;color:${THEME.soft};">
        <strong style="color:${THEME.text};display:inline-block;min-width:88px;">${escapeHtml(label)}:</strong>
        <span style="${valueStyle}">${escapeHtml(value)}</span>
      </td>
    </tr>`;
}

export function buildUserCredentialsText({
  fullName,
  credentials,
  isReset = false,
  loginUrl = getLoginUrl(),
} = {}) {
  const name = String(fullName || credentials?.email || '').trim() || 'there';
  const roleLabel = formatStaffRoleLabel(credentials?.role);
  const intro = isReset
    ? 'Your Portfolio Dashboard password was reset. Use the credentials below to sign in.'
    : 'Your Portfolio Dashboard account has been created. Use the credentials below to sign in.';

  return [
    `Hi ${name},`,
    '',
    intro,
    '',
    'Portfolio Dashboard Login',
    `Email: ${credentials?.email || ''}`,
    `Password: ${credentials?.password || ''}`,
    `Role: ${roleLabel}`,
    `Login: ${loginUrl}`,
    '',
    'Please change your password after your first login.',
    '',
    '—',
    getBrand().name,
    getBrand().role,
    getBrand().portfolioUrl,
  ].join('\n');
}

/**
 * Dark credential email matching the contact reply layout and brand signature.
 */
export function buildUserCredentialsHtml({
  fullName,
  credentials,
  isReset = false,
  loginUrl = getLoginUrl(),
} = {}) {
  const brand = getBrand();
  const name = String(fullName || credentials?.email || '').trim() || 'there';
  const roleLabel = formatStaffRoleLabel(credentials?.role);
  const subjectTitle = isReset
    ? 'Your Portfolio Dashboard Password Was Reset'
    : 'Your Portfolio Dashboard Login';
  const intro = isReset
    ? 'A new temporary password was generated for your account. Use the credentials below to sign in.'
    : 'An administrator created your account. Use the credentials below to sign in for the first time.';
  const badgeLabel = isReset ? 'Credentials Reset' : 'New Account';
  const preview = `${credentials?.email || ''} · ${roleLabel}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escapeHtml(subjectTitle)}</title>
</head>
<body style="margin:0;padding:0;background:${THEME.bg};color:${THEME.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(preview)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${THEME.bg};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:${THEME.card};border:1px solid ${THEME.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <h1 style="margin:0;font-size:28px;line-height:1.25;font-weight:700;color:${THEME.text};letter-spacing:-0.02em;">
                      ${escapeHtml(subjectTitle)}
                    </h1>
                  </td>
                  <td align="right" style="vertical-align:middle;white-space:nowrap;padding-left:12px;">
                    <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${THEME.iconBg};border:1px solid ${THEME.border};color:${THEME.text};font-size:12px;font-weight:600;">
                      <span style="color:${THEME.accent};">&#9679;</span>&nbsp;${escapeHtml(badgeLabel)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:12px 28px 8px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${THEME.text};">
                Hi ${escapeHtml(name)},
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:${THEME.soft};">
                ${escapeHtml(intro)} Please change your password after your first login.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:0;">
                    <fieldset style="margin:0;padding:18px 18px 16px;border:1px solid ${THEME.border};border-radius:12px;background:${THEME.quoteBg};">
                      <legend style="padding:0 10px;margin-left:8px;font-size:12px;font-weight:600;color:${THEME.muted};letter-spacing:0.02em;">
                        Login Credentials
                      </legend>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 0;">
                        ${credentialRow('Email', credentials?.email || '')}
                        ${credentialRow('Password', credentials?.password || '', { mono: true })}
                        ${credentialRow('Role', roleLabel)}
                      </table>
                    </fieldset>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 24px;">
              <a href="${escapeHtml(loginUrl)}"
                 style="display:inline-block;padding:12px 22px;border-radius:999px;border:1.5px solid ${THEME.accent};color:${THEME.accent};font-size:14px;font-weight:700;text-decoration:none;background:${THEME.accentSoft};">
                Open Portfolio Dashboard
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 28px 10px;">
              <div style="height:1px;background:${THEME.border};line-height:1px;font-size:1px;">&nbsp;</div>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px 28px;">
              ${buildBrandSignatureHtml(brand, brand.email)}
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin-top:14px;">
          <tr>
            <td align="center" style="font-size:11px;line-height:1.5;color:${THEME.muted};">
              Sent from ${escapeHtml(brand.name)} &middot; ${escapeHtml(brand.role)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Email login credentials to a newly created or reset staff user.
 * @param {{ to: string, toName?: string, credentials: { email: string, password: string, role: string }, isReset?: boolean }} payload
 */
export async function sendUserCredentialsEmail(payload) {
  const smtp = getSmtpConfig();
  if (!smtp) {
    return { sent: false, reason: 'SMTP is not configured. Set SMTP_USER and SMTP_PASS in .env.local.' };
  }

  const to = String(payload.to || payload.credentials?.email || '').trim();
  const credentials = payload.credentials || {};
  const password = String(credentials.password || '').trim();
  const toName = String(payload.toName || '').trim() || to;
  const isReset = Boolean(payload.isReset);
  const brand = getBrand();
  const loginUrl = getLoginUrl();

  if (!to || !password) {
    return { sent: false, reason: 'Missing recipient or password.' };
  }

  const subject = isReset
    ? 'Your Portfolio Dashboard Password Was Reset'
    : 'Your Portfolio Dashboard Login';

  try {
    const from = getFromAddress(smtp.auth.user);
    const transporter = nodemailer.createTransport(smtp);
    const mailOptions = {
      from: `"${brand.name}" <${normalizeFromEmail(from)}>`,
      to,
      replyTo: normalizeFromEmail(from),
      subject,
      text: buildUserCredentialsText({
        fullName: toName,
        credentials,
        isReset,
        loginUrl,
      }),
      html: buildUserCredentialsHtml({
        fullName: toName,
        credentials,
        isReset,
        loginUrl,
      }),
    };

    await transporter.sendMail(mailOptions);
    return { sent: true, provider: 'smtp' };
  } catch (err) {
    console.error('[email] Failed to send user credentials:', err);
    return {
      sent: false,
      reason: err instanceof Error ? err.message : 'Failed to send email.',
    };
  }
}
