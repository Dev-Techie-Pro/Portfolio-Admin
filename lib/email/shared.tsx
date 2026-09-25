export const THEME = {
  bg: '#0b0e14',
  card: '#12151c',
  border: '#2a2f3a',
  text: '#f1f3f5',
  muted: '#9aa3b2',
  soft: '#c5cad3',
  accent: '#ff6600',
  accentSoft: 'rgba(255,102,0,0.15)',
  quoteBg: '#161a22',
  iconBg: '#1c212b',
};

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function nl2br(value) {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, '<br />');
}

export function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!user || !pass) return null;

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  };
}

export function getFromAddress(smtpUser) {
  return process.env.SMTP_FROM?.trim() || smtpUser;
}

export function getBrand() {
  return {
    name: process.env.EMAIL_BRAND_NAME?.trim() || 'Muhammad Sohaib',
    role: process.env.EMAIL_BRAND_ROLE?.trim() || 'Full Stack Web Developer',
    portfolioLabel: process.env.EMAIL_PORTFOLIO_LABEL?.trim() || 'Portfolio Dashboard',
    portfolioUrl:
      process.env.EMAIL_PORTFOLIO_URL?.trim()
      || process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, '')
      || 'https://sohaibishaque.com',
    githubUrl: process.env.EMAIL_GITHUB_URL?.trim() || 'https://github.com/',
    linkedinUrl: process.env.EMAIL_LINKEDIN_URL?.trim() || 'https://www.linkedin.com/',
    email: process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || process.env.ADMIN_EMAIL?.trim() || '',
  };
}

export function getLoginUrl() {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, '');
  return base ? `${base}/login` : '/login';
}

export function avatarInitial(nameOrEmail) {
  const raw = String(nameOrEmail || '').trim();
  if (!raw) return 'M';
  if (raw.includes('@')) return raw[0].toUpperCase();
  return raw.split(/\s+/).map((p) => p[0]).slice(0, 1).join('').toUpperCase() || 'M';
}

export function socialIconButton(href, label, svgPath) {
  return `
    <a href="${escapeHtml(href)}" title="${escapeHtml(label)}"
       style="display:inline-block;width:38px;height:38px;border-radius:10px;background:${THEME.iconBg};border:1px solid ${THEME.border};text-align:center;line-height:38px;text-decoration:none;margin-left:8px;">
      <img src="https://cdn.simpleicons.org/${svgPath}/c5cad3" width="16" height="16" alt="${escapeHtml(label)}"
           style="display:inline-block;vertical-align:middle;border:0;outline:none;" />
    </a>`;
}

export function buildBrandSignatureHtml(brand, fromEmail = '') {
  const initial = avatarInitial(brand.name || fromEmail);
  const mailLink = brand.email || fromEmail;

  return `
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
          ${mailLink ? socialIconButton(`mailto:${mailLink}`, 'Email', 'gmail') : ''}
        </td>
      </tr>
    </table>`;
}

export function normalizeFromEmail(from) {
  return from.includes('<') ? from.replace(/^.*<([^>]+)>.*$/, '$1') : from;
}
