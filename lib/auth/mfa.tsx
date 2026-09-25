/** Supabase returns TOTP QR as raw SVG markup — convert for <img> or inline render. */
export function normalizeTotpQrCode(qrCode) {
  if (!qrCode || typeof qrCode !== 'string') {
    return { dataUrl: '', svg: '' };
  }

  const trimmed = qrCode.trim();
  if (trimmed.startsWith('<svg')) {
    return {
      svg: trimmed,
      dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`,
    };
  }

  if (trimmed.startsWith('data:') || /^https?:\/\//i.test(trimmed)) {
    return { dataUrl: trimmed, svg: '' };
  }

  return { dataUrl: '', svg: '' };
}

export async function getMfaAssuranceLevel(supabase) {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data;
}

export function needsMfaVerification(aal) {
  return aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2';
}

function getTotpFactors(data) {
  const fromTotp = Array.isArray(data?.totp) ? data.totp : [];
  const fromAll = Array.isArray(data?.all)
    ? data.all.filter((factor) => factor.factor_type === 'totp')
    : [];
  const merged = [...fromTotp];
  fromAll.forEach((factor) => {
    if (!merged.some((item) => item.id === factor.id)) merged.push(factor);
  });
  return merged;
}

export async function listTotpFactors(supabase) {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  const factors = getTotpFactors(data);
  const verified = factors.find((f) => f.status === 'verified') || null;
  const pending = factors.find((f) => f.status === 'unverified') || null;
  return { factors, verified, pending };
}

async function clearUnverifiedTotpFactors(supabase) {
  const { factors } = await listTotpFactors(supabase);
  for (const factor of factors.filter((item) => item.status === 'unverified')) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error && !/not found|does not exist/i.test(error.message || '')) {
      throw error;
    }
  }
}

function isEnrollConflict(error) {
  const message = String(error?.message || '').toLowerCase();
  return /already exists|friendly name|duplicate|conflict|maximum|limit/.test(message);
}

export async function enrollTotpFactor(supabase) {
  const existing = await listTotpFactors(supabase);
  if (existing.verified) {
    throw new Error('Two-factor authentication is already enabled.');
  }

  await clearUnverifiedTotpFactors(supabase);

  const enroll = async (friendlyName) => supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
  });

  let { data, error } = await enroll('Authenticator App');
  if (error && isEnrollConflict(error)) {
    await clearUnverifiedTotpFactors(supabase);
    ({ data, error } = await enroll(`Authenticator App ${Date.now()}`));
  }

  if (error) throw error;
  return data;
}

export async function verifyTotpEnrollment(supabase, factorId, code) {
  const { data, error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: String(code || '').trim(),
  });
  if (error) throw error;
  return data;
}

export async function verifyLoginTotp(supabase, factorId, code) {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: String(code || '').trim(),
  });
  if (error) throw error;
  return data;
}

export async function unenrollTotpFactor(supabase, factorId) {
  const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
  return data;
}
