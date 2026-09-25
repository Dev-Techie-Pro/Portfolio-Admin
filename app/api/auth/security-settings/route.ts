import { NextResponse } from 'next/server';
import { withStaffGet } from '@/lib/api/with-staff-get';
import { countUnusedBackupCodes } from '@/lib/auth/backup-codes';
import { getMfaAssuranceLevel, listTotpFactors } from '@/lib/auth/mfa';
import { getSecuritySettings } from '@/lib/auth/security-settings';

export async function GET() {
  return withStaffGet(async (auth) => {
    const [settings, mfa, backupCodeCount] = await Promise.all([
      getSecuritySettings(auth.user.id),
      listTotpFactors(auth.supabase).catch(() => ({ factors: [], verified: null, pending: null })),
      countUnusedBackupCodes(auth.user.id),
    ]);

    let aal = null;
    try {
      aal = await getMfaAssuranceLevel(auth.supabase);
    } catch {
      aal = null;
    }

    return {
      settings,
      mfa: {
        verified: !!mfa.verified,
        factorId: mfa.verified?.id || mfa.pending?.id || null,
        factorStatus: mfa.verified?.status || mfa.pending?.status || null,
        friendlyName: mfa.verified?.friendly_name || mfa.pending?.friendly_name || 'Authenticator App',
        assuranceLevel: aal,
      },
      backupCodesRemaining: backupCodeCount,
    };
  });
}
