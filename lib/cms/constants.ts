export const SITE_ID = '00000000-0000-4000-8000-000000000001';

export const LEGACY_UUID_PREFIX = {
  project: '1000',
  tech: '2000',
  media: '3000',
  testi: '4000',
  blog: '5000',
  exp: '6000',
  msg: '7000',
  toolCat: '8000',
  toolItem: '8100',
};

export function legacyUuid(entity, legacyId) {
  const prefix = LEGACY_UUID_PREFIX[entity] || '9000';
  const hex = String(legacyId).padStart(12, '0');
  return `${prefix}0000-0000-4000-8000-${hex}`;
}
