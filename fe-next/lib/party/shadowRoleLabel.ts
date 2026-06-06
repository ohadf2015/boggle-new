/**
 * shadowRoleLabel — single source of truth for rendering a Shadow Clash role.
 *
 * The TV reveal screens (dawn / verdict / game-over) and a couple of phone
 * badges printed hardcoded English ("🐺 Shadow") or the raw enum ("shadow").
 * This pairs the canonical emoji with the existing `party.role*` translation
 * keys so every surface — phone and TV — agrees and stays translated.
 */

export type ShadowRoleKey = 'shadow' | 'seer' | 'medic' | 'citizen';

type TFunc = (key: string) => string;

const ROLE_EMOJI: Record<ShadowRoleKey, string> = {
  shadow: '🐺',
  seer: '👁️',
  medic: '🛡️',
  citizen: '👤',
};

const ROLE_NAME_KEY: Record<ShadowRoleKey, string> = {
  shadow: 'party.roleShadow',
  seer: 'party.roleSeer',
  medic: 'party.roleMedic',
  citizen: 'party.roleCitizen',
};

function isKnownRole(role: string): role is ShadowRoleKey {
  return role === 'shadow' || role === 'seer' || role === 'medic' || role === 'citizen';
}

/** Canonical emoji for a role, or '' for an unknown role. */
export function shadowRoleEmoji(role: string): string {
  return isKnownRole(role) ? ROLE_EMOJI[role] : '';
}

/** Translated role name, falling back to the raw value for an unknown role. */
export function shadowRoleName(role: string, t: TFunc): string {
  return isKnownRole(role) ? t(ROLE_NAME_KEY[role]) : role;
}

/** Emoji + translated name, e.g. "🐺 Shadow". */
export function shadowRoleLabel(role: string, t: TFunc): string {
  const emoji = shadowRoleEmoji(role);
  const name = shadowRoleName(role, t);
  return emoji ? `${emoji} ${name}` : name;
}
