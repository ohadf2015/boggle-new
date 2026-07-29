/**
 * Engagement System Type Definitions
 * Daily Challenges, Streaks, Calendar Rewards, Mystery Rewards
 */

// ==================== Daily Challenges ====================

export type ChallengeType =
  | 'word_count'
  | 'long_words'
  | 'perfect_games'
  | 'combo'
  | 'speed_run'
  | 'social_play'
  | 'accuracy'
  | 'unique_words';

export type ChallengeTier = 'easy' | 'medium' | 'hard';

export interface DailyChallenge {
  id: string;
  playerId: string;
  challengeDate: string;
  challengeType: ChallengeType;
  challengeTier: ChallengeTier;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  xpReward: number;
  bonusReward?: {
    multiplier?: number;
    hints?: number;
    title?: string;
  };
  completed: boolean;
  completedAt?: string;
  claimed: boolean;
  claimedAt?: string;
}

export interface ChallengeProgress {
  challengeId: string;
  previousValue: number;
  newValue: number;
  completed: boolean;
}

export interface ChallengeRewardClaim {
  success: boolean;
  error?: string;
  reward?: {
    baseXp: number;
    streakMultiplier: number;
    totalXp: number;
    challengeTitle: string;
  };
}

// ==================== Streak System ====================

export interface StreakBonus {
  days: number;
  multiplier: number;
  badge: string;
  achievement?: string;
  title?: string;
  avatarFrame?: string;
}

export interface StreakStatus {
  current: number;
  longest: number;
  multiplier: number;
  bonuses: StreakBonus[];
  freezesAvailable: number;
  protectedUntil?: string;
}

export interface LoginResult {
  streak: number;
  previousStreak?: number;
  longestStreak?: number;
  isNewStreak: boolean;
  streakBroken?: boolean;
  streakFrozen?: boolean;
  bonuses: StreakBonus[];
  newMilestones?: StreakBonus[];
}

// ==================== Calendar Rewards ====================

export type CalendarRewardType =
  | 'xp'
  | 'hints'
  | 'streak_freeze'
  | 'mystery_box'
  | 'exclusive_title';

export type MysteryBoxRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CalendarReward {
  day: number;
  type: CalendarRewardType;
  amount?: number;
  rarity?: MysteryBoxRarity;
  titleId?: string;
  isMilestone?: boolean;
}

export interface CalendarStatus {
  month: number;
  year: number;
  daysClaimed: number[];
  currentDay: number;
  canClaimToday: boolean;
  rewards: CalendarReward[];
}

export interface CalendarClaimResult {
  success: boolean;
  error?: string;
  reward?: CalendarReward;
  appliedReward?: AppliedReward;
  nextReward?: CalendarReward | null;
}

export interface AppliedReward {
  type: string;
  amount?: number;
  titleId?: string;
  contents?: {
    type: string;
    amount: number;
  };
}

// ==================== Come-Back Campaigns ====================

export interface ComebackTier {
  xpMultiplier: number;
  durationHours: number;
  hints: number;
  streakFreezes: number;
  title?: string;
  message: string;
}

export interface ComebackStatus {
  eligible: boolean;
  active?: boolean;
  daysAway?: number;
  tier?: ComebackTier;
  expiresAt?: string;
}

export interface ComebackClaimResult {
  success: boolean;
  error?: string;
  bonus?: ComebackTier;
  expiresAt?: string;
}

// ==================== Near-Miss Notifications ====================

export interface NearMiss {
  achievement?: string;
  type?: 'personal_best' | 'close_loss';
  current: number;
  target: number;
  remaining: number;
  message: string;
  hint?: string;
  scoreDifference?: number;
}

// ==================== One More Game Prompts ====================

export interface OneMoreGamePrompt {
  title: string;
  message: string;
  incentive: string;
  xpBonus?: number;
  achievement?: string;
  challenge?: {
    gamesRemaining: number;
    xpReward: number;
  };
  winStreak?: number;
  xpNeeded?: number;
}

// ==================== Mystery Rewards ====================

export type MysteryRewardTrigger =
  | 'game_completion'
  | 'long_word'
  | 'achievement'
  | 'win';

export type MysteryRewardType =
  | 'xp_multiplier'
  | 'bonus_hints'
  | 'streak_freeze'
  | 'xp_flat'
  | 'rare_title'
  | 'instant_xp'
  | 'combo_boost';

export type RewardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface MysteryReward {
  triggerType: MysteryRewardTrigger;
  type: MysteryRewardType;
  value: number | string;
  weight: number;
  display: string;
  rarity: RewardRarity;
}

// ==================== Engagement Status ====================

export interface EngagementStatus {
  streak: StreakStatus;
  calendar: CalendarStatus;
  comeback: ComebackStatus;
  gamesToday: number;
  /** Player XP/level/gold from profiles table */
  xp?: number;
  level?: number;
  xpToNextLevel?: number;
  xpForCurrentLevel?: number;
  gold?: number;
}

// ==================== Game Stats for Engagement ====================

export interface GameStatsForEngagement {
  wordCount: number;
  longWordCount: number;
  accuracy: number;
  maxCombo: number;
  wordsInFirst30Seconds: number;
  isMultiplayer: boolean;
  uniqueWordsFound: number;
  score: number;
  isWinner: boolean;
  scoreDifference?: number;
  personalBest?: number;
  earnedAchievements?: string[];
  winStreak?: number;
  xpToNextLevel?: number;
  nextLevel?: number;
  challengeProgress?: {
    gamesRemaining: number;
    xpReward: number;
  };
}

// ==================== Socket Events ====================

export interface EngagementSocketEvents {
  // Client -> Server
  'engagement:getDailyChallenges': () => void;
  'engagement:claimChallengeReward': (challengeId: string) => void;
  'engagement:getCalendarStatus': () => void;
  'engagement:claimCalendarReward': () => void;
  'engagement:getComebackStatus': () => void;
  'engagement:claimComebackBonus': () => void;
  'engagement:getStatus': () => void;

  // Server -> Client
  'engagement:dailyChallenges': (challenges: DailyChallenge[]) => void;
  'engagement:challengeProgress': (progress: ChallengeProgress[]) => void;
  'engagement:challengeCompleted': (challenge: DailyChallenge) => void;
  'engagement:rewardClaimed': (result: ChallengeRewardClaim | CalendarClaimResult) => void;
  'engagement:calendarStatus': (status: CalendarStatus) => void;
  'engagement:comebackStatus': (status: ComebackStatus) => void;
  'engagement:comebackClaimed': (result: ComebackClaimResult) => void;
  'engagement:loginResult': (result: LoginResult) => void;
  'engagement:nearMisses': (nearMisses: NearMiss[]) => void;
  'engagement:oneMoreGame': (prompt: OneMoreGamePrompt | null) => void;
  'engagement:mysteryReward': (reward: MysteryReward) => void;
  'engagement:status': (status: EngagementStatus) => void;
}
