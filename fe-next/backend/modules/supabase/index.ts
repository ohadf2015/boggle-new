/**
 * Supabase Module Index
 * Re-exports all Supabase functionality from domain modules
 */

// Client and types
export {
  getSupabase,
  isSupabaseConfigured,
  // Types
  type GameStats,
  type GameResultInput,
  type PlayerScore,
  type GameInfo,
  type UserAuthInfo,
  type XpInfo,
  type XpResultWithSocket,
  type UpdatedUserStats,
  type LifetimeAchievement,
} from './client';

// Game results
export { recordGameResult } from './gameResults';

// Player stats
export { updatePlayerStats } from './playerStats';

// Leaderboard
export { updateLeaderboardEntry, updateRankedProgress } from './leaderboard';

// Guest tokens
export { getOrCreateGuestToken, updateGuestStats } from './guestTokens';

// Words
export {
  saveHostApprovedWord,
  savePlayerWord,
  getPopularPlayerWords,
  incrementBotWordUsage,
  recordPlayerWrongWord,
  type WordApprovalInput,
  type PlayerWordInput,
  type InvalidWordReason,
} from './words';

// Ranked MMR
export { updateRankedMmr, type RankedParticipant } from './rankedMmr';

// Game processing (orchestrator)
export {
  processGameResults,
  type PlayerResultOutput,
  type GameResultsOutput,
} from './gameProcessing';
