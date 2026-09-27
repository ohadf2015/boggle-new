/**
 * Shareable snapshot of adventure progress.
 */

import type { MasteryTier } from './mastery';

export interface AdventureShareData {
  worldsCompleted: number;
  totalStars: number;
  maxStars: number;
  bossesDefeated: number;
  bestStreak: number;
  masteryTiers: MasteryTier[];
}
