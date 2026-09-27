/**
 * Pure helpers for the kill banner: the overkill ladder (Bookworm's
 * Squashed → Obliterated) and where the minted reward flies. No React.
 */
export const KILL_TIERS = ['squashed', 'whomped', 'crushed', 'destroyed', 'obliterated'] as const;
export type KillTier = (typeof KILL_TIERS)[number];

/** Overkill measured against the enemy's max HP, so every world's scale reads the same. */
export function overkillTier(overkill: number, enemyMaxHp: number): KillTier {
  if (enemyMaxHp <= 0) return 'obliterated';
  const r = Math.max(0, overkill) / enemyMaxHp;
  return r >= 1 ? 'obliterated' : r >= 0.5 ? 'destroyed' : r >= 0.25 ? 'crushed' : r >= 0.1 ? 'whomped' : 'squashed';
}

interface Box { left: number; top: number; width: number; height: number }
const GAP = 4;

/**
 * The spot the reward lands: one slot past the last owned relic (before it
 * in RTL), else the HUD anchor's centre, else the top corner.
 */
export function flyTarget(relics: readonly Box[], anchor: Box | null, viewportW: number, rtl = false): { x: number; y: number } {
  const last = relics[relics.length - 1];
  if (last) {
    const half = last.width / 2;
    return { x: rtl ? last.left - GAP - half : last.left + last.width + GAP + half, y: last.top + last.height / 2 };
  }
  if (anchor) return { x: anchor.left + anchor.width / 2, y: anchor.top + anchor.height / 2 };
  return { x: viewportW - 40, y: 40 };
}
