/**
 * Public Player Profile Types
 * Data that is safe to expose on public profile pages
 */

import type { CustomAvatarConfig } from './customAvatar';
import type { ModeXpSlice } from '../../lib/xp/xpByMode';

export type { ModeXpSlice };

/**
 * Public profile data returned by /api/player-profile/:id
 * Only includes data that is safe to show publicly
 */
export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  customAvatar?: CustomAvatarConfig | null;
  countryCode?: string | null;
  currentLevel: number;
  totalXp: number;
  totalGames: number;
  totalScore: number;
  totalWords: number;
  winRate: number; // Computed: (casual_wins + ranked_wins) / total_games * 100
  longestWord?: string | null;
  longestWordLength: number;
  achievementCounts: Record<string, number>;
  memberSince: string; // Month/year only (e.g., "2025-03")
  percentile: number; // Computed: top X% of players by score
  currentStreak?: number; // Daily challenge streak
  rankedMmr?: number;
  peakMmr?: number;
  xpByMode?: ModeXpSlice[]; // Estimated share of total XP per game mode
}

/**
 * Head-to-head comparison data (shown when viewing another player's profile)
 */
export interface HeadToHeadStats {
  myWins: number;
  theirWins: number;
  totalGames: number;
  myAvgScore: number;
  theirAvgScore: number;
}
