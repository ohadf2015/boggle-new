/**
 * Archetype mastery + per-world mastery progression types.
 */

import type { LevelArchetype } from './level';

export type ArchetypeMasteryTier = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';

export interface ArchetypeMasteryThresholds {
  bronze: number;
  silver: number;
  gold: number;
  diamond: number;
}

export interface ArchetypeMasteryBonus {
  description: string;
  bonusType: 'timer' | 'score' | 'tiles' | 'objectives';
  value: number;
}

export interface ArchetypeMasteryState {
  totalStars: number;
  tier: ArchetypeMasteryTier;
}

/** Boss levels have no mastery track. */
export type MasterableArchetype = Exclude<LevelArchetype, 'boss'>;

/** World mastery tier — 0 = not started, 5 = complete mastery. */
export type MasteryTier = 0 | 1 | 2 | 3 | 4 | 5;

export interface MasteryCriteria {
  allLevelsCompleted: boolean;
  allLevelsPerfect: boolean;
  allQuestsCompleted: boolean;
  bossHighHealth: boolean;
  flashChallengesMastered: boolean;
}

export interface WorldMastery {
  worldId: number;
  tier: MasteryTier;
  criteria: MasteryCriteria;
}
