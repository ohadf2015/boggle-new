/**
 * Duel combo — CLIENT DISPLAY ONLY.
 *
 * The server owns the streak and the points (backend/modules/duelCombo.ts and
 * the `duel:word-accepted` payload). This module turns the streak number the
 * server sends into a tier name, a mascot and a meter fill. It deliberately
 * knows nothing about scoring, so the two sides cannot drift
 * (.claude/rules/60-recurring-pitfalls.md, Class 3).
 */

export type DuelComboTierId = 'none' | 'spark' | 'blaze' | 'inferno' | 'supernova';

export interface DuelComboTier {
  id: DuelComboTierId;
  /** Lowest streak that lights this tier. */
  minStreak: number;
  /** i18n key for the tier name shown on the meter. */
  labelKey: string;
  /** Transparent mascot art for the meter badge. */
  mascotSrc: string;
  /**
   * Tailwind background for the meter fill. neo-orange is reserved for
   * streak/fire; neo-yellow only appears at the top tier, where the streak IS
   * the celebration.
   */
  fillClass: string;
  /** Text colour that survives on top of fillClass. */
  textClass: string;
}

/** Ordered low → high. `duelComboTier` scans this from the top. */
export const DUEL_COMBO_TIERS: readonly DuelComboTier[] = [
  {
    id: 'spark',
    minStreak: 2,
    labelKey: 'education.duels.comboSpark',
    mascotSrc: '/mascot/streak-spark-nobg.webp',
    fillClass: 'bg-neo-orange',
    textClass: 'text-neo-black',
  },
  {
    id: 'blaze',
    minStreak: 4,
    labelKey: 'education.duels.comboBlaze',
    mascotSrc: '/mascot/streak-molten-nobg.webp',
    fillClass: 'bg-neo-orange',
    textClass: 'text-neo-black',
  },
  {
    id: 'inferno',
    minStreak: 6,
    labelKey: 'education.duels.comboInferno',
    mascotSrc: '/mascot/streak-inferno-nobg.webp',
    fillClass: 'bg-neo-orange',
    textClass: 'text-neo-black',
  },
  {
    id: 'supernova',
    minStreak: 10,
    labelKey: 'education.duels.comboSupernova',
    mascotSrc: '/mascot/streak-supernova-nobg.webp',
    fillClass: 'bg-neo-yellow',
    textClass: 'text-neo-black',
  },
] as const;

const NO_TIER: DuelComboTier = {
  id: 'none',
  minStreak: 0,
  labelKey: 'education.duels.comboNone',
  mascotSrc: '/mascot/streak-kindling-nobg.webp',
  fillClass: 'bg-neo-orange/30',
  textClass: 'text-neo-white',
};

/** Streak at which the meter reads full. */
export const DUEL_COMBO_METER_MAX = 10;

export function duelComboTier(streak: number): DuelComboTier {
  for (let i = DUEL_COMBO_TIERS.length - 1; i >= 0; i--) {
    const tier = DUEL_COMBO_TIERS[i];
    if (streak >= tier.minStreak) return tier;
  }
  return NO_TIER;
}

export function duelComboMeterFill(streak: number): number {
  if (streak <= 0) return 0;
  return Math.min(streak / DUEL_COMBO_METER_MAX, 1);
}

/** True when the chain just crossed into a hotter tier (fire a stinger). */
export function isDuelComboTierUp(previousStreak: number, streak: number): boolean {
  if (streak <= previousStreak) return false;
  return duelComboTier(streak).id !== duelComboTier(previousStreak).id;
}
