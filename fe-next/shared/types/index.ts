/**
 * Shared Types Index
 * Central export for all shared type definitions
 */

// Blast tile types (canonical — import before game to avoid re-export conflicts)
export * from './blast';

// Game types
export * from './game';

// View types (used by Host and Player views)
export * from './view';

// Socket event types (includes engagement payload types)
export * from './socket';

// Spam detection types
export * from './spam';

// Score card types
export * from './scorecard';

// Cognitive scoring types (Brain Training)
export * from './cognitive';

// Engagement system types - export only unique types not already in socket.ts
// The socket.ts file contains simplified versions of engagement types for socket payloads
// For full engagement types, import directly from './engagement'
export type {
  ChallengeType,
  ChallengeTier,
  ChallengeRewardClaim,
  StreakBonus,
  StreakStatus,
  CalendarRewardType,
  MysteryBoxRarity,
  CalendarClaimResult,
  AppliedReward,
  ComebackTier,
  MysteryRewardTrigger,
  MysteryRewardType,
  RewardRarity,
  GameStatsForEngagement,
  EngagementSocketEvents,
} from './engagement';
