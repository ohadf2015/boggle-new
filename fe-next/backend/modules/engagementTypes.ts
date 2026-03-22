/**
 * Engagement Manager Types
 */

export interface StreakBonus {
  multiplier: number;
  badge: string;
  achievement?: string;
  title?: string;
  avatarFrame?: string;
}

export interface StreakBonusWithDays extends StreakBonus {
  days: number;
}

export interface CalendarReward {
  day: number;
  type: 'xp' | 'hints' | 'streak_freeze' | 'mystery_box' | 'exclusive_title';
  amount?: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  titleId?: string;
  isMilestone?: boolean;
}

export interface ComebackTier {
  minDays: number;
  maxDays: number;
  xpMultiplier: number;
  duration: number;
  hints: number;
  streakFreezes?: number;
  title?: string;
  message: string;
}

export interface NearMissThreshold {
  target: number;
  nearMiss: number;
  message: string;
}

export interface GameStats {
  wordCount?: number;
  maxCombo?: number;
  personalBest?: number;
  score?: number;
  isMultiplayer?: boolean;
  isWinner?: boolean;
  scoreDifference?: number;
  challengeProgress?: {
    gamesRemaining: number;
    xpReward: number;
  };
  winStreak?: number;
  xpToNextLevel?: number;
  nextLevel?: number;
  earnedAchievements?: string[];
  nearMisses?: NearMiss[];
}

export interface NearMiss {
  achievement?: string;
  type?: string;
  current: number;
  target: number;
  remaining: number;
  message: string;
  hint?: string;
  scoreDifference?: number;
}

export interface OneMoreGamePrompt {
  title: string;
  message: string;
  incentive?: string;
  xpBonus?: number;
  achievement?: string;
  challenge?: GameStats['challengeProgress'];
  winStreak?: number;
  xpNeeded?: number;
}

export interface MysteryReward {
  type: string;
  value: number | string;
  weight: number;
  display: string;
}

export interface MysteryRewardResult extends MysteryReward {
  triggerType: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface LoginResult {
  streak: number;
  previousStreak?: number;
  longestStreak?: number;
  isNewStreak: boolean;
  streakBroken?: boolean;
  streakFrozen?: boolean;
  bonuses: StreakBonusWithDays[];
  newMilestones?: StreakBonusWithDays[];
}

export interface CalendarStatus {
  month: number;
  year: number;
  daysClaimed: number[];
  currentDay: number;
  canClaimToday: boolean;
  rewards: CalendarReward[];
}

export interface ComebackBonusInfo {
  eligible: boolean;
  active?: boolean;
  expiresAt?: string;
  daysAway?: number;
  tier?: {
    xpMultiplier: number;
    durationHours: number;
    hints: number;
    streakFreezes: number;
    title: string | null;
    message: string;
  };
}

export interface EngagementStatus {
  streak: {
    current: number;
    longest: number;
    multiplier: number;
    bonuses: StreakBonusWithDays[];
    freezesAvailable: number;
  };
  calendar: CalendarStatus;
  comeback: ComebackBonusInfo;
  gamesToday: number;
  /** Player XP/level/gold from profiles table */
  xp?: number;
  level?: number;
  xpToNextLevel?: number;
  xpForCurrentLevel?: number;
  gold?: number;
}
