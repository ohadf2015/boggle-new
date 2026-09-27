/**
 * Score-based feedback tiers for the Daily Challenge (DAGLIG) results badge.
 *
 * Why this exists: the results badge used to praise the player by how FEW
 * attempts they used (`getAttemptTier`), so solving in 2/10 tries always read
 * "Magnifikt!" — even on a 490/1000 (49%) run. That broke the sense of
 * progression: top praise for a sub-50% score. This module keys the praise to
 * the ACTUAL share of the score earned, so the words escalate with mastery.
 *
 * Design (Senior Game Designer): five bands, cold→hot, encouraging at the
 * bottom (never "you failed") and epic at the top. Pure + side-effect free so
 * it's trivially unit-testable and reusable anywhere a score/maxScore pair is
 * shown.
 */

import type { GaugeColor } from './ScoreGaugeRing';

export type ScoreTierId = 'budding' | 'rising' | 'solid' | 'stellar' | 'legendary';

export interface ScoreTier {
  /** Stable identifier for logic/tests. */
  id: ScoreTierId;
  /** i18n key for the badge label (resolved via `t()`). */
  key: string;
  /** Inclusive lower bound of the tier as a percent (0–100). */
  minPercent: number;
  /** Neo color token driving the badge theme + gauge ring. */
  color: GaugeColor;
  /** Tailwind gradient class string (JIT needs complete literals). */
  gradient: string;
  /** Box-shadow glow color for the badge. */
  glow: string;
}

/**
 * Tier table, ordered HIGH → LOW so the first matching threshold wins.
 *
 * | Band     | Score %  | Feel                  |
 * |----------|----------|-----------------------|
 * | budding  | 0–29%    | warm encouragement    |
 * | rising   | 30–49%   | momentum building     |
 * | solid    | 50–69%   | genuinely good        |
 * | stellar  | 70–89%   | excellent             |
 * | legendary| 90–100%  | epic / celebratory    |
 */
export const SCORE_TIERS: readonly ScoreTier[] = [
  {
    id: 'legendary',
    key: 'wordHunt.results.scoreTierLegendary',
    minPercent: 90,
    color: 'neo-cyan',
    gradient: 'from-neo-cyan via-cyan-300 to-neo-cyan',
    glow: 'rgba(0,255,255,0.4)',
  },
  {
    id: 'stellar',
    key: 'wordHunt.results.scoreTierStellar',
    minPercent: 70,
    color: 'neo-lime',
    gradient: 'from-neo-lime via-green-300 to-neo-lime',
    glow: 'rgba(191,255,0,0.35)',
  },
  {
    id: 'solid',
    key: 'wordHunt.results.scoreTierSolid',
    minPercent: 50,
    color: 'neo-yellow',
    gradient: 'from-amber-400 via-yellow-300 to-amber-400',
    glow: 'rgba(255,225,53,0.3)',
  },
  {
    id: 'rising',
    key: 'wordHunt.results.scoreTierRising',
    minPercent: 30,
    color: 'neo-orange',
    gradient: 'from-neo-orange via-orange-300 to-neo-orange',
    glow: 'rgba(255,107,53,0.28)',
  },
  {
    id: 'budding',
    key: 'wordHunt.results.scoreTierBudding',
    minPercent: 0,
    color: 'neo-pink',
    gradient: 'from-neo-pink via-pink-300 to-neo-pink',
    glow: 'rgba(255,20,147,0.25)',
  },
] as const;

/**
 * Resolve the feedback tier for a score relative to its max.
 *
 * Guards a zero/negative `maxScore` (no divide-by-zero) and clamps the percent
 * to [0, 100], so overflow scores land in the top tier and negative scores in
 * the bottom one. Always returns a tier — never null.
 */
export function getScoreTier(score: number, maxScore: number): ScoreTier {
  const percent = maxScore > 0 ? Math.max(0, Math.min(100, (score / maxScore) * 100)) : 0;
  // SCORE_TIERS is ordered high→low, so the first threshold we clear is ours.
  // The budding floor (minPercent 0) guarantees a match.
  return SCORE_TIERS.find((tier) => percent >= tier.minPercent) ?? SCORE_TIERS[SCORE_TIERS.length - 1];
}
