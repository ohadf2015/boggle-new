/**
 * Daily Challenges Manager
 * Generates and tracks daily challenges for player engagement
 */

import { getSupabase } from './supabaseServer';
import logger from '../utils/logger';

// Challenge type definitions
export const CHALLENGE_TYPES = {
  WORD_COUNT: 'word_count',
  LONG_WORDS: 'long_words',
  PERFECT_GAMES: 'perfect_games',
  COMBO: 'combo',
  SPEED_RUN: 'speed_run',
  SOCIAL_PLAY: 'social_play',
  ACCURACY: 'accuracy',
  UNIQUE_WORDS: 'unique_words',
} as const;

export type ChallengeType = typeof CHALLENGE_TYPES[keyof typeof CHALLENGE_TYPES];
export type ChallengeTier = 'easy' | 'medium' | 'hard';

// Challenge tier configuration interface
export interface ChallengeTierConfig {
  completionRate: number;
  xpReward: number;
  bonusMultiplier: number;
}

// Challenge tier configurations
export const CHALLENGE_TIERS: Record<ChallengeTier, ChallengeTierConfig> = {
  easy: {
    completionRate: 0.7,
    xpReward: 100,
    bonusMultiplier: 1.0,
  },
  medium: {
    completionRate: 0.4,
    xpReward: 250,
    bonusMultiplier: 1.25,
  },
  hard: {
    completionRate: 0.15,
    xpReward: 500,
    bonusMultiplier: 1.5,
  },
};

// Challenge template interface
export interface ChallengeTemplate {
  target: number;
  title: string;
  description: string;
}

// Challenge templates by type and tier
const CHALLENGE_TEMPLATES: Record<ChallengeType, Record<ChallengeTier, ChallengeTemplate>> = {
  [CHALLENGE_TYPES.WORD_COUNT]: {
    easy: { target: 30, title: 'Word Finder', description: 'Find {target} words today' },
    medium: { target: 75, title: 'Word Hunter', description: 'Find {target} words today' },
    hard: { target: 150, title: 'Word Master', description: 'Find {target} words today' },
  },
  [CHALLENGE_TYPES.LONG_WORDS]: {
    easy: { target: 5, title: 'Big Words', description: 'Find {target} words with 6+ letters' },
    medium: { target: 15, title: 'Scholar', description: 'Find {target} words with 6+ letters' },
    hard: { target: 30, title: 'Lexicographer', description: 'Find {target} words with 6+ letters' },
  },
  [CHALLENGE_TYPES.PERFECT_GAMES]: {
    easy: { target: 1, title: 'Precision', description: 'Complete {target} game with 90%+ accuracy' },
    medium: { target: 3, title: 'Sharpshooter', description: 'Complete {target} games with 90%+ accuracy' },
    hard: { target: 5, title: 'Perfectionist', description: 'Complete {target} games with 95%+ accuracy' },
  },
  [CHALLENGE_TYPES.COMBO]: {
    easy: { target: 10, title: 'Combo Starter', description: 'Reach a combo of {target}' },
    medium: { target: 20, title: 'Combo Builder', description: 'Reach a combo of {target}' },
    hard: { target: 30, title: 'Combo Master', description: 'Reach a combo of {target}' },
  },
  [CHALLENGE_TYPES.SPEED_RUN]: {
    easy: { target: 10, title: 'Quick Start', description: 'Find {target} words in first 30 seconds' },
    medium: { target: 20, title: 'Speed Demon', description: 'Find {target} words in first 30 seconds' },
    hard: { target: 30, title: 'Lightning', description: 'Find {target} words in first 30 seconds' },
  },
  [CHALLENGE_TYPES.SOCIAL_PLAY]: {
    easy: { target: 2, title: 'Social Butterfly', description: 'Play {target} multiplayer games' },
    medium: { target: 5, title: 'Team Player', description: 'Play {target} multiplayer games' },
    hard: { target: 10, title: 'Party Host', description: 'Play {target} multiplayer games' },
  },
  [CHALLENGE_TYPES.ACCURACY]: {
    easy: { target: 80, title: 'Careful', description: 'Maintain {target}% accuracy across games' },
    medium: { target: 90, title: 'Precise', description: 'Maintain {target}% accuracy across games' },
    hard: { target: 95, title: 'Flawless', description: 'Maintain {target}% accuracy across games' },
  },
  [CHALLENGE_TYPES.UNIQUE_WORDS]: {
    easy: { target: 5, title: 'Explorer', description: 'Find {target} words no one else found' },
    medium: { target: 10, title: 'Pioneer', description: 'Find {target} words no one else found' },
    hard: { target: 20, title: 'Trailblazer', description: 'Find {target} words no one else found' },
  },
};

// Challenge database record interface
export interface DailyChallenge {
  id?: string;
  player_id: string;
  challenge_date: string;
  challenge_type: ChallengeType;
  challenge_tier: ChallengeTier;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  xp_reward: number;
  bonus_reward: {
    multiplier: number;
  };
  completed: boolean;
  completed_at?: string | null;
  claimed: boolean;
  claimed_at?: string | null;
}

// Game stats interface for challenge progress
export interface GameStats {
  wordCount?: number;
  longWordCount?: number;
  accuracy?: number;
  maxCombo?: number;
  wordsInFirst30Seconds?: number;
  isMultiplayer?: boolean;
  uniqueWordsFound?: number;
}

// Challenge update result
export interface ChallengeUpdateResult {
  updated: Array<{
    id: string;
    current_value: number;
    completed: boolean;
    completed_at: string | null;
  }>;
  completed: DailyChallenge[];
}

// Challenge reward result
export interface ChallengeRewardResult {
  success: boolean;
  error?: string;
  reward?: {
    baseXp: number;
    streakMultiplier: number;
    totalXp: number;
    challengeTitle: string;
  };
}

// Challenge stats interface
export interface ChallengeStats {
  totalCompleted: number;
  easyCompleted: number;
  mediumCompleted: number;
  hardCompleted: number;
}

/**
 * Generate daily challenges for a player
 * @param playerId - Player UUID
 * @returns Array of generated challenges
 */
export async function generateDailyChallenges(playerId: string): Promise<DailyChallenge[]> {
  const supabase = getSupabase()!;
  const today = new Date().toISOString().split('T')[0];

  // Check if challenges already exist for today
  const { data: existing } = await supabase
    .from('daily_challenges')
    .select('id, player_id, challenge_date, challenge_type, challenge_tier, title, description, target_value, current_value, xp_reward, bonus_reward, completed, completed_at, claimed, claimed_at, created_at')
    .eq('player_id', playerId)
    .eq('challenge_date', today);

  if (existing && existing.length > 0) {
    return existing;
  }

  // Generate 3 challenges: 1 easy, 1 medium, 1 hard
  const challengeTypes = Object.values(CHALLENGE_TYPES);
  const selectedTypes = shuffleArray(challengeTypes).slice(0, 3);
  const tiers: ChallengeTier[] = ['easy', 'medium', 'hard'];

  const challenges: DailyChallenge[] = selectedTypes.map((type, index) => {
    const tier = tiers[index];
    const template = CHALLENGE_TEMPLATES[type][tier];
    const tierConfig = CHALLENGE_TIERS[tier];

    return {
      player_id: playerId,
      challenge_date: today,
      challenge_type: type,
      challenge_tier: tier,
      title: template.title,
      description: template.description.replace('{target}', String(template.target)),
      target_value: template.target,
      current_value: 0,
      xp_reward: tierConfig.xpReward,
      bonus_reward: {
        multiplier: tierConfig.bonusMultiplier,
      },
      completed: false,
      claimed: false,
    };
  });

  // Insert challenges
  const { data, error } = await supabase
    .from('daily_challenges')
    .insert(challenges)
    .select();

  if (error) {
    const errorMessage = error.message || 'Unknown error';
    logger.error('DailyChallenges', 'Error generating challenges', { error: errorMessage });
    return [];
  }

  return data;
}

/**
 * Update challenge progress based on game results
 * @param playerId - Player UUID
 * @param gameStats - Game statistics
 * @returns Updated challenges and any completions
 */
export async function updateChallengeProgress(playerId: string, gameStats: GameStats): Promise<ChallengeUpdateResult> {
  const supabase = getSupabase()!;
  const today = new Date().toISOString().split('T')[0];

  // Get today's challenges
  const { data: challenges } = await supabase
    .from('daily_challenges')
    .select('id, player_id, challenge_date, challenge_type, challenge_tier, title, description, target_value, current_value, xp_reward, bonus_reward, completed, completed_at, claimed, claimed_at, created_at')
    .eq('player_id', playerId)
    .eq('challenge_date', today)
    .eq('completed', false);

  if (!challenges || challenges.length === 0) {
    return { updated: [], completed: [] };
  }

  const updates: Array<{
    id: string;
    current_value: number;
    completed: boolean;
    completed_at: string | null;
  }> = [];
  const completed: DailyChallenge[] = [];

  for (const challenge of challenges) {
    let progressIncrement = 0;

    switch (challenge.challenge_type) {
      case CHALLENGE_TYPES.WORD_COUNT:
        progressIncrement = gameStats.wordCount || 0;
        break;

      case CHALLENGE_TYPES.LONG_WORDS:
        progressIncrement = gameStats.longWordCount || 0;
        break;

      case CHALLENGE_TYPES.PERFECT_GAMES:
        const accuracyThreshold = challenge.challenge_tier === 'hard' ? 0.95 : 0.9;
        if ((gameStats.accuracy || 0) >= accuracyThreshold) {
          progressIncrement = 1;
        }
        break;

      case CHALLENGE_TYPES.COMBO:
        // Track highest combo, not cumulative
        if ((gameStats.maxCombo || 0) >= challenge.target_value) {
          progressIncrement = challenge.target_value - challenge.current_value;
        }
        break;

      case CHALLENGE_TYPES.SPEED_RUN:
        progressIncrement = gameStats.wordsInFirst30Seconds || 0;
        break;

      case CHALLENGE_TYPES.SOCIAL_PLAY:
        if (gameStats.isMultiplayer) {
          progressIncrement = 1;
        }
        break;

      case CHALLENGE_TYPES.UNIQUE_WORDS:
        progressIncrement = gameStats.uniqueWordsFound || 0;
        break;
    }

    if (progressIncrement > 0) {
      const newValue = Math.min(
        challenge.current_value + progressIncrement,
        challenge.target_value
      );
      const isCompleted = newValue >= challenge.target_value;

      updates.push({
        id: challenge.id,
        current_value: newValue,
        completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      });

      if (isCompleted) {
        completed.push({
          ...challenge,
          current_value: newValue,
          completed: true,
        });
      }
    }
  }

  // Batch update challenges
  for (const update of updates) {
    await supabase
      .from('daily_challenges')
      .update({
        current_value: update.current_value,
        completed: update.completed,
        completed_at: update.completed_at,
      })
      .eq('id', update.id);
  }

  return { updated: updates, completed };
}

/**
 * Claim rewards for completed challenges
 * @param playerId - Player UUID
 * @param challengeId - Challenge UUID
 * @returns Reward details
 */
export async function claimChallengeReward(playerId: string, challengeId: string): Promise<ChallengeRewardResult> {
  const supabase = getSupabase()!;

  // Get the challenge
  const { data: challenge, error: fetchError } = await supabase
    .from('daily_challenges')
    .select('id, player_id, challenge_type, challenge_tier, title, xp_reward, bonus_reward, completed, claimed')
    .eq('id', challengeId)
    .eq('player_id', playerId)
    .single();

  if (fetchError || !challenge) {
    return { success: false, error: 'Challenge not found' };
  }

  if (!challenge.completed) {
    return { success: false, error: 'Challenge not completed' };
  }

  if (challenge.claimed) {
    return { success: false, error: 'Reward already claimed' };
  }

  // Get streak bonus
  const { data: engagement } = await supabase
    .from('player_engagement')
    .select('current_streak')
    .eq('player_id', playerId)
    .single();

  const streakMultiplier = getStreakMultiplier(engagement?.current_streak || 0);
  const totalXp = Math.round(challenge.xp_reward * streakMultiplier);

  // Mark as claimed
  const { error: updateError } = await supabase
    .from('daily_challenges')
    .update({
      claimed: true,
      claimed_at: new Date().toISOString(),
    })
    .eq('id', challengeId);

  if (updateError) {
    return { success: false, error: 'Failed to claim reward' };
  }

  // Update player XP
  await supabase.rpc('increment_player_xp', {
    p_player_id: playerId,
    p_xp_amount: totalXp,
  });

  return {
    success: true,
    reward: {
      baseXp: challenge.xp_reward,
      streakMultiplier,
      totalXp,
      challengeTitle: challenge.title,
    },
  };
}

/**
 * Get all challenges for a player for today
 * @param playerId - Player UUID
 * @returns Today's challenges
 */
export async function getTodaysChallenges(playerId: string): Promise<DailyChallenge[]> {
  const supabase = getSupabase()!;
  const today = new Date().toISOString().split('T')[0];

  // First, ensure challenges exist
  await generateDailyChallenges(playerId);

  const { data } = await supabase
    .from('daily_challenges')
    .select('id, player_id, challenge_date, challenge_type, challenge_tier, title, description, target_value, current_value, xp_reward, bonus_reward, completed, completed_at, claimed, claimed_at, created_at')
    .eq('player_id', playerId)
    .eq('challenge_date', today)
    .order('challenge_tier', { ascending: true });

  return data || [];
}

/**
 * Calculate streak XP multiplier
 * @param streak - Current streak days
 * @returns Multiplier value
 */
export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.75;
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.25;
  return 1.0;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get challenge completion statistics
 * @param playerId - Player UUID
 * @returns Completion stats
 */
export async function getChallengeStats(playerId: string): Promise<ChallengeStats> {
  const supabase = getSupabase()!;

  const { data: completed } = await supabase
    .from('daily_challenges')
    .select('challenge_tier')
    .eq('player_id', playerId)
    .eq('completed', true);

  const stats: ChallengeStats = {
    totalCompleted: completed?.length || 0,
    easyCompleted: completed?.filter((c: { challenge_tier: string }) => c.challenge_tier === 'easy').length || 0,
    mediumCompleted: completed?.filter((c: { challenge_tier: string }) => c.challenge_tier === 'medium').length || 0,
    hardCompleted: completed?.filter((c: { challenge_tier: string }) => c.challenge_tier === 'hard').length || 0,
  };

  return stats;
}

// CommonJS exports for backward compatibility
