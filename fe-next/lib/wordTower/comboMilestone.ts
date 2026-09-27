/**
 * Word Tower — combo-milestone fanfare (pure).
 *
 * The combo multiplier already lifts height; this surfaces the MOMENT a combo
 * crosses a notable threshold as a one-shot celebration ("×5 ON FIRE!"). Fires
 * only on the exact crossing tick (the manager bumps combo by 1 per word, so
 * equality is the crossing) — never between milestones, so it can't spam.
 */

export type ComboTier = 'roll' | 'fire' | 'blaze' | 'inferno';

export interface ComboMilestone {
  combo: number;
  tier: ComboTier;
  /** i18n key for the celebratory label. */
  labelKey: string;
}

/** Combo values that trigger a fanfare, ascending. */
export const COMBO_MILESTONES = [3, 5, 10, 20] as const;

const TIERS: Record<number, ComboTier> = { 3: 'roll', 5: 'fire', 10: 'blaze', 20: 'inferno' };

/**
 * The milestone reached when the combo hits exactly `combo`, or null if `combo`
 * is not a milestone value. Pure — the caller fires the banner off the bump key.
 */
export function comboMilestone(combo: number): ComboMilestone | null {
  if (!COMBO_MILESTONES.includes(combo as (typeof COMBO_MILESTONES)[number])) return null;
  const tier = TIERS[combo];
  return { combo, tier, labelKey: `wordTower.combo.${tier}` };
}
