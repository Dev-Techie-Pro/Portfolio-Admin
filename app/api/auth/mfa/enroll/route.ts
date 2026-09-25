import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrollTotpFactor, listTotpFactors, normalizeTotpQrCode } from '@/lib/auth/mfa';

export async function POST() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const existing = await listTotpFactors(supabase);
    if (existing.verified) {
      return NextResponse.json({ error: 'Two-factor authentication is already enabled.' }, { status: 400 });
    }

    const enrollment = await enrollTotpFactor(supabase);
    const { dataUrl, svg } = normalizeTotpQrCode(enrollment.totp?.qr_code);
    return NextResponse.json({
      ok: true,
      factorId: enrollment.id,
      qrCode: dataUrl,
      qrCodeSvg: svg,
      secret: enrollment.totp?.secret || '',
      uri: enrollment.totp?.uri || '',
    });
  } catch (error) {
    console.error('[auth/mfa/enroll]', error);
    const message = error?.message || 'Could not start 2FA enrollment.';
    const status = /already enabled|mfa is not enabled|not enabled/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
