import nodemailer from 'nodemailer';
import {
  THEME,
  avatarInitial,
  buildBrandSignatureHtml,
  escapeHtml,
  getBrand,
  getFromAddress,
  getSmtpConfig,
  nl2br,
  normalizeFromEmail,
  socialIconButton,
} from './shared';

function formatOriginalDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const date = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Karachi',
    });
    const time = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Karachi',
    });
    return `${date}, ${time} (PKT)`;
  } catch {
    return '';
  }
}

/**
 * Dark reply email matching the inbox reply layout:
 * subject header → original message card → reply body → signature → action pills.
 */
export function buildContactReplyHtml(payload) {
  const brand = getBrand();
  const subject = String(payload.subject || 'Your message').trim();
  const displaySubject = subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`;
  const toName = String(payload.toName || '').trim() || 'there';
  const replyText = String(payload.replyText || '').trim();
  const originalMessage = String(payload.originalMessage || '').trim();
  const originalFrom = String(payload.originalFrom || payload.to || '').trim();
  const originalDate = formatOriginalDate(payload.originalDate || new Date().toISOString());
  const fromEmail = String(payload.fromEmail || brand.email || '').trim();
  const initial = avatarInitial(brand.name || fromEmail);

  const replyMailto = `mailto:${encodeURIComponent(fromEmail)}?subject=${encodeURIComponent(displaySubject)}`;
  const replyAllMailto = `mailto:${encodeURIComponent(fromEmail)}?subject=${encodeURIComponent(displaySubject)}`;
  const forwardMailto = `mailto:?subject=${encodeURIComponent(`Fwd: ${subject}`)}&body=${encodeURIComponent(replyText)}`;

  const replyParagraphs = replyText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${THEME.text};">${nl2br(block)}</p>`)
    .join('');

  const originalBlock = originalMessage
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        <tr>
          <td style="padding:0;">
            <fieldset style="margin:0;padding:18px 18px 16px;border:1px solid ${THEME.border};border-radius:12px;background:${THEME.quoteBg};">
              <legend style="padding:0 10px;margin-left:8px;font-size:12px;font-weight:600;color:${THEME.muted};letter-spacing:0.02em;">
                Original Message
              </legend>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 14px;">
                <tr>
                  <td style="padding:3px 0;font-size:13px;line-height:1.5;color:${THEME.soft};">
                    <strong style="color:${THEME.text};">From:</strong> ${escapeHtml(originalFrom)}
                  </td>
                </tr>
                ${
                  originalDate
                    ? `<tr>
                        <td style="padding:3px 0;font-size:13px;line-height:1.5;color:${THEME.soft};">
                          <strong style="color:${THEME.text};">Date:</strong> ${escapeHtml(originalDate)}
                        </td>
                      </tr>`
                    : ''
                }
                <tr>
                  <td style="padding:3px 0 12px;font-size:13px;line-height:1.5;color:${THEME.soft};border-bottom:1px solid ${THEME.border};">
                    <strong style="color:${THEME.text};">Subject:</strong> ${escapeHtml(subject)}
                  </td>
                </tr>
              </table>
              <div style="padding-top:12px;font-size:14px;line-height:1.7;color:${THEME.soft};">
                ${nl2br(originalMessage)}
              </div>
            </fieldset>
          </td>
        </tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escapeHtml(displaySubject)}</title>
</head>
<body style="margin:0;padding:0;background:${THEME.bg};color:${THEME.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(replyText.slice(0, 120))}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${THEME.bg};">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${THEME.card};border:1px solid ${THEME.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <h1 style="margin:0;font-size:28px;line-height:1.25;font-weight:700;color:${THEME.text};letter-spacing:-0.02em;">
                      ${escapeHtml(displaySubject)}
                    </h1>
                  </td>
                  <td align="right" style="vertical-align:middle;white-space:nowrap;padding-left:12px;">
                    <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${THEME.iconBg};border:1px solid ${THEME.border};color:${THEME.text};font-size:12px;font-weight:600;">
                      <span style="color:${THEME.accent};">&#9679;</span>&nbsp;Inbox
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:12px 28px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="44" style="vertical-align:top;">
                    <div style="width:40px;height:40px;border-radius:50%;background:#2a3140;color:${THEME.text};font-size:15px;font-weight:700;text-align:center;line-height:40px;">
                      ${escapeHtml(initial)}
                    </div>
                  </td>
                  <td style="vertical-align:middle;padding-left:10px;">
                    <div style="font-size:14px;font-weight:600;color:${THEME.text};">
                      ${escapeHtml(fromEmail || brand.email)}
                      <span style="font-weight:400;color:${THEME.muted};">&nbsp;to me</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 8px;">
              ${originalBlock}
            </td>
          </tr>

          <tr>
            <td style="padding:4px 28px 8px;">
              ${
                replyParagraphs
                || `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${THEME.text};">${nl2br(replyText)}</p>`
              }
            </td>
          </tr>

          <tr>
            <td style="padding:8px 28px 10px;">
              <div style="height:1px;background:${THEME.border};line-height:1px;font-size:1px;">&nbsp;</div>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:4px;background:${THEME.accent};border-radius:4px;">&nbsp;</td>
                        <td style="padding-left:14px;">
                          <div style="font-size:16px;font-weight:700;color:${THEME.text};line-height:1.3;">${escapeHtml(brand.name)}</div>
                          <div style="font-size:13px;color:${THEME.muted};margin-top:3px;line-height:1.4;">${escapeHtml(brand.role)}</div>
                          <div style="margin-top:6px;">
                            <a href="${escapeHtml(brand.portfolioUrl)}" style="color:${THEME.accent};font-size:13px;font-weight:600;text-decoration:none;">
                              ${escapeHtml(brand.portfolioLabel)}
                            </a>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;white-space:nowrap;">
                    ${socialIconButton(brand.githubUrl, 'GitHub', 'github')}
                    ${socialIconButton(brand.linkedinUrl, 'LinkedIn', 'linkedin')}
                    ${socialIconButton(`mailto:${brand.email || fromEmail}`, 'Email', 'gmail')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 28px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:10px;">
                    <a href="${replyMailto}"
                       style="display:inline-block;padding:10px 18px;border-radius:999px;border:1.5px solid ${THEME.accent};color:${THEME.accent};font-size:13px;font-weight:600;text-decoration:none;background:transparent;">
                      &#8617;&nbsp; Reply
                    </a>
                  </td>
                  <td style="padding-right:10px;">
                    <a href="${replyAllMailto}"
                       style="display:inline-block;padding:10px 18px;border-radius:999px;border:1px solid ${THEME.border};color:${THEME.soft};font-size:13px;font-weight:600;text-decoration:none;background:transparent;">
                      Reply All
                    </a>
                  </td>
                  <td style="padding-right:10px;">
                    <a href="${forwardMailto}"
                       style="display:inline-block;padding:10px 18px;border-radius:999px;border:1px solid ${THEME.border};color:${THEME.soft};font-size:13px;font-weight:600;text-decoration:none;background:transparent;">
                      Forward
                    </a>
                  </td>
                  <td>
                    <a href="${escapeHtml(brand.portfolioUrl)}"
                       style="display:inline-block;width:36px;height:36px;border-radius:50%;border:1px solid ${THEME.border};color:${THEME.soft};font-size:18px;line-height:36px;text-align:center;text-decoration:none;background:transparent;">
                      &#8942;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
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
 * Send an admin reply to a contact-form sender via SMTP.
 * @param {{ to: string, toName?: string, subject: string, replyText: string, originalMessage?: string, originalFrom?: string, originalDate?: string, fromEmail?: string }} payload
 */
export async function sendContactReplyEmail(payload) {
  const smtp = getSmtpConfig();
  if (!smtp) {
    return { sent: false, reason: 'SMTP is not configured. Set SMTP_USER and SMTP_PASS in .env.local.' };
  }

  const from = getFromAddress(smtp.auth.user);
  const to = String(payload.to || '').trim();
  const replyText = String(payload.replyText || '').trim();
  const subject = String(payload.subject || 'Your message').trim();
  const toName = String(payload.toName || '').trim() || to;
  const originalMessage = String(payload.originalMessage || '').trim();
  const brand = getBrand();

  if (!to || !replyText) {
    return { sent: false, reason: 'Missing recipient or reply text.' };
  }

  const mailSubject = subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`;
  const textParts = [
    `Hi ${toName},`,
    '',
    replyText,
    '',
    '—',
    `${brand.name}`,
    brand.role,
    brand.portfolioUrl,
  ];
  if (originalMessage) {
    textParts.push('', '--- Original message ---', `From: ${payload.originalFrom || to}`, `Subject: ${subject}`, '', originalMessage);
  }

  try {
    const transporter = nodemailer.createTransport(smtp);
    const mailOptions = {
      from: `"${brand.name}" <${from.includes('<') ? from.replace(/^.*<([^>]+)>.*$/, '$1') : from}>`,
      to,
      replyTo: from,
      subject: mailSubject,
      text: textParts.join('\n'),
      html: buildContactReplyHtml({
        ...payload,
        fromEmail: from.includes('<') ? from.replace(/^.*<([^>]+)>.*$/, '$1') : from,
      }),
    };

    if (payload.cc) mailOptions.cc = payload.cc;

    if (payload.attachment?.contentBase64 && payload.attachment?.name) {
      mailOptions.attachments = [{
        filename: payload.attachment.name,
        content: Buffer.from(payload.attachment.contentBase64, 'base64'),
        contentType: payload.attachment.mime || undefined,
      }];
    }

    await transporter.sendMail(mailOptions);
    return { sent: true, provider: 'smtp' };
  } catch (err) {
    console.error('[email] Failed to send contact reply:', err);
    return {
      sent: false,
      reason: err instanceof Error ? err.message : 'Failed to send email.',
    };
  }
}
