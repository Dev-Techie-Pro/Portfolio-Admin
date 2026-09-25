import nodemailer from 'nodemailer';
import {
  THEME,
  buildBrandSignatureHtml,
  escapeHtml,
  getBrand,
  getFromAddress,
  getLoginUrl,
  getSmtpConfig,
  nl2br,
  normalizeFromEmail,
} from './shared';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

function formatRoleLabel(role) {
  return ROLE_LABELS[role] || String(role || 'Staff').replace(/_/g, ' ');
}

export async function sendRoleRequestEmail({
  to,
  adminName,
  requesterName,
  requesterEmail,
  requesterRole,
  contactEmail,
  requestedRole,
  message,
  usersUrl,
}) {
  const smtp = getSmtpConfig();
  if (!smtp) {
    return { sent: false, reason: 'SMTP is not configured on the server.' };
  }

  const brand = getBrand();
  const from = normalizeFromEmail(getFromAddress(smtp.auth.user));
  const recipient = String(to || '').trim();
  if (!recipient) {
    return { sent: false, reason: 'Admin recipient email is missing.' };
  }

  const currentRoleLabel = formatRoleLabel(requesterRole);
  const requestedRoleLabel = requestedRole ? formatRoleLabel(requestedRole) : 'Elevated access';
  const subject = `[${brand.portfolioLabel}] Role access request from ${requesterName || requesterEmail}`;
  const loginUrl = getLoginUrl();
  const reviewUrl = usersUrl || `${loginUrl.replace(/\/login$/, '')}/users`;

  const html = `
    <div style="margin:0;padding:0;background:${THEME.bg};font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${THEME.bg};padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:${THEME.card};border:1px solid ${THEME.border};border-radius:16px;overflow:hidden;">
              <tr>
                <td style="padding:28px 28px 8px;">
                  <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${THEME.muted};margin-bottom:10px;">Account access request</div>
                  <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:${THEME.text};">Review a role update request</h1>
                  <p style="margin:0;font-size:15px;line-height:1.6;color:${THEME.soft};">
                    Hi ${escapeHtml(adminName || 'Admin')}, a staff member has requested a role change in ${escapeHtml(brand.portfolioLabel)}.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 28px 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${THEME.quoteBg};border:1px solid ${THEME.border};border-radius:12px;">
                    <tr><td style="padding:18px 20px;font-size:14px;line-height:1.7;color:${THEME.soft};">
                      <div><strong style="color:${THEME.text};">Requester:</strong> ${escapeHtml(requesterName || 'Unknown')}</div>
                      <div><strong style="color:${THEME.text};">Account email:</strong> ${escapeHtml(requesterEmail || '')}</div>
                      <div><strong style="color:${THEME.text};">Contact email:</strong> ${escapeHtml(contactEmail || '')}</div>
                      <div><strong style="color:${THEME.text};">Current role:</strong> ${escapeHtml(currentRoleLabel)}</div>
                      <div><strong style="color:${THEME.text};">Requested role:</strong> ${escapeHtml(requestedRoleLabel)}</div>
                    </td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 28px 20px;">
                  <div style="font-size:13px;font-weight:600;color:${THEME.text};margin-bottom:8px;">Message</div>
                  <div style="padding:16px 18px;border-radius:12px;background:${THEME.quoteBg};border:1px solid ${THEME.border};font-size:14px;line-height:1.7;color:${THEME.soft};">
                    ${nl2br(message)}
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 28px 28px;">
                  <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:${THEME.accent};color:#fff;text-decoration:none;font-size:14px;font-weight:600;">
                    Review in dashboard
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:0 28px 28px;border-top:1px solid ${THEME.border};">
                  ${buildBrandSignatureHtml(brand)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>`;

  const text = [
    `Hi ${adminName || 'Admin'},`,
    '',
    `${requesterName || requesterEmail} requested a role change.`,
    `Account email: ${requesterEmail || ''}`,
    `Contact email: ${contactEmail || ''}`,
    `Current role: ${currentRoleLabel}`,
    `Requested role: ${requestedRoleLabel}`,
    '',
    'Message:',
    message,
    '',
    `Review users: ${reviewUrl}`,
  ].join('\n');

  try {
    const transporter = nodemailer.createTransport(smtp);
    await transporter.sendMail({
      from,
      to: recipient,
      replyTo: contactEmail || requesterEmail || undefined,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error?.message || 'Could not send role request email.' };
  }
}
