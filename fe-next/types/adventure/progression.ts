/**
 * Player progression types — completed levels, attempts, overall progression state.
 */

import type { ArchetypeMasteryState, MasterableArchetype } from './mastery';
import type { PlayerRune } from './runes';

export interface LevelCompletion {
  world: number;
  level: number;
  stars: 0 | 1 | 2 | 3;
  bestScore: number;
  bestWords: number;
  completedAt: string;
}

/**
 * LevelAttempt tracks partial / failed attempts for "Partial Progress" UX.
 */
export interface LevelAttempt {
  world: number;
  level: number;
  bestWords: number;
  bestScore: number;
  bestTimeRemaining: number;
  objectiveProgress: Record<string, number>;
  attemptCount: number;
  /** Resets on completion — used by Retry Assist */
  consecutiveFailures: number;
  firstAttemptAt: string;
  lastAttemptAt: string;
}

export interface PlayerProgression {
  userId: string;
  playerLevel: number;
  xp: number;
  currentWorld: number;
  currentLevel: number;
  totalStars: number;
  gold: number;
  /** upgradeId → tier level */
  upgrades: Record<string, number>;
  skillPoints: number;
  /** skillId → level */
  skillTree: Record<string, number>;
  runeFragments: number;
  runes: PlayerRune[];
  streak?: {
    currentStreak: number;
    bestStreak: number;
    lastPlayedAt: string | null;
    freezesUsedThisWeek: number;
    lastFreezeWeek: string | null;
  };
  bossTrophies?: number;
  prestigeLevel?: number;
  endlessHighFloor?: number;
  /** questId → count (persists across sessions) */
  chapterQuestProgress?: Record<string, number>;
  /** Unique words found across adventure mode (uppercase) */
  wordAlbum?: string[];
  wordAlbumClaimedMilestones?: number[];
  archetypeMastery?: Partial<Record<MasterableArchetype, ArchetypeMasteryState>>;
  completions: LevelCompletion[];
  createdAt: string;
  updatedAt: string;
}
