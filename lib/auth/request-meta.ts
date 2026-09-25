/**
 * Extract client metadata from an incoming request (IP, UA, location).
 */

const LOOPBACK_IPS = new Set(['127.0.0.1', '::1', '0:0:0:0:0:0:0:1', 'localhost']);

function parseForwardedFor(header) {
  if (!header) return null;
  const match = header.match(/for=(?:"\[?)([0-9a-fA-F:.]+)/i);
  return match?.[1] || null;
}

export function normalizeIpAddress(ip) {
  if (!ip || typeof ip !== 'string') return null;
  let value = ip.trim();
  if (!value) return null;
  if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1);
  if (value.toLowerCase().startsWith('::ffff:')) value = value.slice(7);
  return value;
}

export function isLoopbackIp(ip) {
  const normalized = normalizeIpAddress(ip);
  if (!normalized) return true;
  const lower = normalized.toLowerCase();
  if (LOOPBACK_IPS.has(lower)) return true;
  return lower.startsWith('127.');
}

export function isPrivateIp(ip) {
  const normalized = normalizeIpAddress(ip);
  if (!normalized) return false;
  if (isLoopbackIp(normalized)) return false;

  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalized)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(normalized)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(normalized)) return true;

  const lower = normalized.toLowerCase();
  return lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:');
}

export function formatLocationFromIp(ip) {
  const normalized = normalizeIpAddress(ip);
  if (!normalized || isLoopbackIp(normalized)) return 'This device (localhost)';
  if (isPrivateIp(normalized)) return `Private network (${normalized})`;
  return normalized;
}

/**
 * Resolve the best client IP from common proxy / platform headers.
 */
export function getClientIp(request) {
  const headerNames = [
    'cf-connecting-ip',
    'x-vercel-forwarded-for',
    'x-real-ip',
    'true-client-ip',
    'x-client-ip',
    'x-forwarded-for',
  ];

  for (const name of headerNames) {
    const raw = request.headers.get(name);
    if (!raw) continue;

    const candidate = name === 'x-forwarded-for'
      ? raw.split(',')[0].trim()
      : raw.trim();

    const normalized = normalizeIpAddress(candidate);
    if (normalized) return normalized;
  }

  const forwarded = parseForwardedFor(request.headers.get('forwarded'));
  return normalizeIpAddress(forwarded);
}

export function getUserAgent(request) {
  return request.headers.get('user-agent') || '';
}

async function lookupGeoFromIp(ip) {
  const res = await fetch(
    `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,regionName,country`,
    { signal: AbortSignal.timeout(2500) },
  );
  if (!res.ok) return null;

  const data = await res.json();
  if (data.status !== 'success') return null;

  const parts = [data.city, data.regionName, data.country].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

async function resolvePublicIp() {
  const res = await fetch('https://api.ipify.org?format=json', {
    signal: AbortSignal.timeout(2500),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return normalizeIpAddress(data?.ip);
}

export async function resolveRequestLocation(request, ip = null) {
  const city = request.headers.get('cf-ipcity');
  const country = request.headers.get('cf-ipcountry');
  if (city && country && city !== 'XX') return `${city}, ${country}`;
  if (country && country !== 'XX') return country;

  const resolvedIp = normalizeIpAddress(ip) || getClientIp(request);

  if (!resolvedIp || isLoopbackIp(resolvedIp)) {
    try {
      const publicIp = await resolvePublicIp();
      if (publicIp && !isLoopbackIp(publicIp) && !isPrivateIp(publicIp)) {
        const geo = await lookupGeoFromIp(publicIp);
        if (geo) return `This device · ${geo}`;
        return `This device · ${publicIp}`;
      }
    } catch {
      // Ignore lookup failures in local/offline environments.
    }
    return 'This device (localhost)';
  }

  if (isPrivateIp(resolvedIp)) return `Private network (${resolvedIp})`;

  try {
    const geo = await lookupGeoFromIp(resolvedIp);
    if (geo) return `${geo} · ${resolvedIp}`;
  } catch {
    // Fall back to raw public IP when geo lookup is unavailable.
  }

  return resolvedIp;
}

/**
 * Lightweight UA parsing for device label + Remix icon class.
 */
export function parseDeviceFromUserAgent(ua = '') {
  const s = ua.toLowerCase();
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let icon = 'ri-device-line';

  if (s.includes('firefox')) {
    browser = 'Firefox';
    icon = 'ri-firefox-line';
  } else if (s.includes('edg/')) {
    browser = 'Edge';
    icon = 'ri-edge-line';
  } else if (s.includes('opr/') || s.includes('opera')) {
    browser = 'Opera';
    icon = 'ri-opera-line';
  } else if (s.includes('chrome') && !s.includes('edg/')) {
    browser = 'Chrome';
    icon = 'ri-chrome-line';
  } else if (s.includes('safari') && !s.includes('chrome')) {
    browser = 'Safari';
    icon = 'ri-safari-line';
  }

  if (s.includes('iphone') || s.includes('ipad')) {
    os = s.includes('ipad') ? 'iPadOS' : 'iOS';
    icon = 'ri-smartphone-line';
  } else if (s.includes('android')) {
    os = 'Android';
    icon = 'ri-android-line';
  } else if (s.includes('mac os') || s.includes('macintosh')) {
    os = 'macOS';
    if (icon === 'ri-device-line') icon = 'ri-macbook-line';
  } else if (s.includes('windows')) {
    os = 'Windows';
    if (icon === 'ri-device-line') icon = 'ri-windows-line';
  } else if (s.includes('linux')) {
    os = 'Linux';
    if (icon === 'ri-device-line') icon = 'ri-ubuntu-line';
  }

  return {
    deviceLabel: `${browser} on ${os}`,
    deviceIcon: icon,
  };
}

export async function getRequestClientMeta(request) {
  const ipAddress = getClientIp(request);
  const userAgent = getUserAgent(request);
  const { deviceLabel, deviceIcon } = parseDeviceFromUserAgent(userAgent);
  const location = await resolveRequestLocation(request, ipAddress);

  return {
    ipAddress,
    userAgent,
    location,
    deviceLabel,
    deviceIcon,
  };
}

/**
 * Normalize stored activity rows for display (fixes legacy "IP ::1" labels).
 */
export function formatStoredActivityLocation(row) {
  const location = row?.location;
  const ip = row?.ip_address;

  if (location && !/^IP (::1|127\.0\.0\.1)$/i.test(location) && !location.startsWith('IP ')) {
    return location;
  }

  if (location?.startsWith('IP ')) {
    const raw = location.slice(3).trim();
    return formatLocationFromIp(raw);
  }

  return formatLocationFromIp(ip);
}
