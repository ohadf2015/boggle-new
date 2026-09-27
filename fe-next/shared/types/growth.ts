/**
 * Growth & Retention Feature Types
 * Async challenges, word clubs, player recaps, churn signals,
 * dynamic difficulty, ranked tiers, re-engagement
 */

// ==================== Async Board Challenges ====================

export type AsyncChallengeStatus = 'pending' | 'accepted' | 'completed' | 'expired' | 'declined';

export interface AsyncBoardChallenge {
  id: string;
  challengerId: string;
  challengerName?: string;
  challengerAvatar?: string;
  challengedId: string;
  challengedName?: string;
  challengedAvatar?: string;
  gameMode: 'classic' | 'blast' | 'word-hunt';
  letterGrid: string[][];
  gridSize: number;
  challengerScore: number;
  challengerWords: string[];
  challengerBestWord?: string;
  challengedScore?: number;
  challengedWords?: string[];
  challengedBestWord?: string;
  status: AsyncChallengeStatus;
  message?: string;
  createdAt: string;
  playedAt?: string;
  expiresAt: string;
}

export interface CreateAsyncChallengePayload {
  challengedId: string;
  gameMode: 'classic' | 'blast' | 'word-hunt';
  letterGrid: string[][];
  gridSize: number;
  score: number;
  words: string[];
  bestWord?: string;
  message?: string;
}

export interface SubmitAsyncChallengePayload {
  challengeId: string;
  score: number;
  words: string[];
  bestWord?: string;
}

// ==================== Word Clubs ====================

export type ClubMemberRole = 'owner' | 'admin' | 'member';

export interface WordClub {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  maxMembers: number;
  inviteCode: string;
  isPublic: boolean;
  weeklyXpTotal: number;
  memberCount: number;
  createdAt: string;
}

export interface WordClubMember {
  id: string;
  clubId: string;
  userId: string;
  displayName?: string;
  avatarConfig?: string;
  weeklyXp: number;
  totalXp: number;
  gamesThisWeek: number;
  bestWordThisWeek?: string;
  role: ClubMemberRole;
  joinedAt: string;
}

export interface CreateClubPayload {
  name: string;
  description?: string;
  maxMembers?: number;
  isPublic?: boolean;
}

// ==================== Player Recaps ====================

export type RecapPeriod = 'weekly' | 'monthly';

export interface PlayerRecap {
  id: string;
  userId: string;
  periodType: RecapPeriod;
  periodStart: string;
  periodEnd: string;
  totalGames: number;
  totalScore: number;
  totalWords: number;
  longestWord?: string;
  rarestWord?: string;
  bestScore: number;
  bestCombo: number;
  streakDays: number;
  rankChange: number;
  gamesWon: number;
  favoriteMode?: string;
  uniqueWordsFound: number;
  improvementPercent: number;
  createdAt: string;
}

// ==================== Churn Prediction ====================

export type ChurnRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ChurnSignal {
  userId: string;
  signalDate: string;
  avgSessionLengthSeconds?: number;
  gamesPerSession?: number;
  notificationDismissals: number;
  streakFreezeUsed: boolean;
  socialInteractions: number;
  scoreTrend: number;
  daysSinceImprovement: number;
  riskLevel: ChurnRiskLevel;
  riskScore: number;
  interventionSent: boolean;
  interventionType?: string;
}

// ==================== Dynamic Difficulty ====================

export interface DifficultyTracking {
  userId: string;
  gameMode: string;
  recentWins: number;
  recentGames: number;
  winRate: number;
  difficultyOffset: number;
  lastAdjustmentAt: string;
}

// ==================== Ranked Tiers ====================

export type RankedTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';

export interface RankedTierInfo {
  tier: RankedTier;
  rating: number;
  peakRating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  ratingChange?: number;
}

export const RANKED_TIER_THRESHOLDS: Record<RankedTier, { min: number; max: number; color: string; label: string }> = {
  bronze: { min: 0, max: 799, color: '#CD7F32', label: 'Bronze' },
  silver: { min: 800, max: 1199, color: '#C0C0C0', label: 'Silver' },
  gold: { min: 1200, max: 1599, color: '#FFD700', label: 'Gold' },
  platinum: { min: 1600, max: 1999, color: '#E5E4E2', label: 'Platinum' },
  diamond: { min: 2000, max: 2399, color: '#B9F2FF', label: 'Diamond' },
  master: { min: 2400, max: 9999, color: '#FF4500', label: 'Master' },
};

export function getTierFromRating(rating: number): RankedTier {
  if (rating >= 2400) return 'master';
  if (rating >= 2000) return 'diamond';
  if (rating >= 1600) return 'platinum';
  if (rating >= 1200) return 'gold';
  if (rating >= 800) return 'silver';
  return 'bronze';
}

export function getTierProgress(rating: number): number {
  const tier = getTierFromRating(rating);
  const { min, max } = RANKED_TIER_THRESHOLDS[tier];
  return Math.min(100, Math.round(((rating - min) / (max - min)) * 100));
}

// ==================== Re-engagement Sequences ====================

export type ReengagementTier = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReengagementSequence {
  userId: string;
  daysLapsed: number;
  currentTier: ReengagementTier;
  lastNotificationAt?: string;
  lastNotificationType?: string;
  notificationsSent: number;
  reopened: boolean;
  optedOut: boolean;
}

/**
 * Tiered re-engagement schedule:
 * Tier 0: Day 2 — streak at risk
 * Tier 1: Day 3-4 — social trigger
 * Tier 2: Day 7 — loss aversion
 * Tier 3: Day 14 — incentive (coins/freeze)
 * Tier 4: Day 30 — major incentive (premium trial)
 * Tier 5: Day 60+ — stop notifications, email only
 */
export const REENGAGEMENT_TIERS: {
  tier: ReengagementTier;
  daysAfterLapse: number;
  type: string;
  messageKey: string;
}[] = [
  { tier: 0, daysAfterLapse: 2, type: 'streak_risk', messageKey: 'reengagement.streakRisk' },
  { tier: 1, daysAfterLapse: 3, type: 'social_trigger', messageKey: 'reengagement.socialTrigger' },
  { tier: 2, daysAfterLapse: 7, type: 'loss_aversion', messageKey: 'reengagement.lossAversion' },
  { tier: 3, daysAfterLapse: 14, type: 'incentive', messageKey: 'reengagement.incentive' },
  { tier: 4, daysAfterLapse: 30, type: 'major_incentive', messageKey: 'reengagement.majorIncentive' },
  { tier: 5, daysAfterLapse: 60, type: 'email_only', messageKey: 'reengagement.emailOnly' },
];

// ==================== Seasonal Events (frontend types for existing DB) ====================

export type SeasonalEventType = 'tournament' | 'holiday' | 'weekend' | 'special';
export type SeasonalEventStatus = 'upcoming' | 'active' | 'ended';

export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  type: SeasonalEventType;
  status: SeasonalEventStatus;
  startTime: string;
  endTime: string;
  config: Record<string, unknown>;
  rewards: SeasonalEventReward[];
}

export interface SeasonalEventReward {
  rank: number;
  type: 'coins' | 'avatar_part' | 'title' | 'streak_freeze';
  amount?: number;
  itemId?: string;
  description: string;
}

export interface EventParticipation {
  eventId: string;
  userId: string;
  score: number;
  rank?: number;
  rewardsClaimed: boolean;
  joinedAt: string;
}

// ==================== Quick Play ====================

export interface QuickPlayConfig {
  mode: 'classic' | 'blast' | 'word-hunt' | 'daily';
  /** Seconds from tap to gameplay */
  estimatedSeconds: number;
  /** Priority order for landing page display */
  priority: number;
}

export const QUICK_PLAY_OPTIONS: QuickPlayConfig[] = [
  { mode: 'daily', estimatedSeconds: 3, priority: 1 },
  { mode: 'classic', estimatedSeconds: 4, priority: 2 },
  { mode: 'blast', estimatedSeconds: 4, priority: 3 },
  { mode: 'word-hunt', estimatedSeconds: 5, priority: 4 },
];
