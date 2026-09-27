/**
 * Engagement Rewards
 * Near-miss notifications, one-more-game prompts, and mystery rewards (variable ratio)
 */

import type {
  GameStats,
  NearMiss,
  NearMissThreshold,
  OneMoreGamePrompt,
  MysteryReward,
  MysteryRewardResult,
} from './engagementTypes';

// ==================== NEAR-MISS NOTIFICATIONS ====================

export const NEAR_MISS_THRESHOLDS: Record<string, NearMissThreshold> = {
  WORDSMITH: { target: 50, nearMiss: 45, message: 'So close! Just {remaining} more words for Wordsmith!' },
  LEXICON: { target: 65, nearMiss: 60, message: 'Almost there! {remaining} words away from Lexicon!' },
  COMBO_KING: { target: 25, nearMiss: 22, message: 'Almost had Combo King! Just {remaining} more combo!' },
  COMBO_GOD: { target: 30, nearMiss: 27, message: 'So close to Combo God! {remaining} more to go!' },
  SPEED_DEMON: { target: 40, nearMiss: 35, message: 'Nearly Speed Demon! {remaining} more fast words needed!' },
  PRECISION_MASTER: { target: 30, nearMiss: 25, message: '{remaining} more precise words for Precision Master!' },
};

/**
 * Calculate near-miss notifications for a game
 */
export function calculateNearMisses(gameStats: GameStats, earnedAchievements: string[] = []): NearMiss[] {
  const nearMisses: NearMiss[] = [];

  if (!earnedAchievements.includes('WORDSMITH') && (gameStats.wordCount || 0) >= 45 && (gameStats.wordCount || 0) < 50) {
    const remaining = 50 - (gameStats.wordCount || 0);
    nearMisses.push({
      achievement: 'WORDSMITH',
      current: gameStats.wordCount || 0,
      target: 50,
      remaining,
      message: NEAR_MISS_THRESHOLDS.WORDSMITH.message.replace('{remaining}', String(remaining)),
      hint: 'Try focusing on shorter words early to build volume',
    });
  }

  if (!earnedAchievements.includes('LEXICON') && (gameStats.wordCount || 0) >= 60 && (gameStats.wordCount || 0) < 65) {
    const remaining = 65 - (gameStats.wordCount || 0);
    nearMisses.push({
      achievement: 'LEXICON',
      current: gameStats.wordCount || 0,
      target: 65,
      remaining,
      message: NEAR_MISS_THRESHOLDS.LEXICON.message.replace('{remaining}', String(remaining)),
    });
  }

  if (!earnedAchievements.includes('COMBO_KING') && (gameStats.maxCombo || 0) >= 22 && (gameStats.maxCombo || 0) < 25) {
    const remaining = 25 - (gameStats.maxCombo || 0);
    nearMisses.push({
      achievement: 'COMBO_KING',
      current: gameStats.maxCombo || 0,
      target: 25,
      remaining,
      message: NEAR_MISS_THRESHOLDS.COMBO_KING.message.replace('{remaining}', String(remaining)),
      hint: 'Focus on accuracy to maintain your combo streak',
    });
  }

  if (gameStats.personalBest && (gameStats.score || 0) >= gameStats.personalBest * 0.9 && (gameStats.score || 0) < gameStats.personalBest) {
    nearMisses.push({
      type: 'personal_best',
      current: gameStats.score || 0,
      target: gameStats.personalBest,
      remaining: gameStats.personalBest - (gameStats.score || 0),
      message: `So close to your personal best! Just ${gameStats.personalBest - (gameStats.score || 0)} more points!`,
    });
  }

  if (gameStats.isMultiplayer && !gameStats.isWinner && gameStats.scoreDifference && gameStats.scoreDifference <= 50) {
    nearMisses.push({
      type: 'close_loss',
      current: gameStats.score || 0,
      target: (gameStats.score || 0) + gameStats.scoreDifference,
      remaining: gameStats.scoreDifference,
      scoreDifference: gameStats.scoreDifference,
      message: `That was so close! Lost by only ${gameStats.scoreDifference} points!`,
      hint: 'A rematch could go either way',
    });
  }

  return nearMisses;
}

// ==================== ONE MORE GAME PROMPTS ====================

interface PromptConfig {
  trigger: string;
  check: (stats: GameStats) => boolean;
  getMessage: (stats: GameStats) => OneMoreGamePrompt;
  priority: number;
}

export const ONE_MORE_GAME_PROMPTS: PromptConfig[] = [
  {
    trigger: 'close_loss',
    check: (stats) => !!(stats.isMultiplayer && !stats.isWinner && stats.scoreDifference && stats.scoreDifference <= 50),
    getMessage: (stats) => ({
      title: 'So Close!',
      message: `You lost by only ${stats.scoreDifference} points. Ready for a rematch?`,
      incentive: 'Play again for +25% XP bonus on your next game',
      xpBonus: 1.25,
    }),
    priority: 1,
  },
  {
    trigger: 'achievement_near_miss',
    check: (stats) => !!(stats.nearMisses && stats.nearMisses.length > 0),
    getMessage: (stats) => ({
      title: 'Almost Had It!',
      message: stats.nearMisses![0].message,
      incentive: `This achievement unlocks at ${stats.nearMisses![0].target}`,
      achievement: stats.nearMisses![0].achievement,
    }),
    priority: 2,
  },
  {
    trigger: 'daily_challenge_progress',
    check: (stats) => !!(stats.challengeProgress && stats.challengeProgress.gamesRemaining === 1),
    getMessage: (stats) => ({
      title: 'One More Game!',
      message: '1 more game completes your daily challenge!',
      incentive: `${stats.challengeProgress!.xpReward} XP + streak bonus waiting`,
      challenge: stats.challengeProgress,
    }),
    priority: 0,
  },
  {
    trigger: 'winning_streak',
    check: (stats) => !!(stats.isWinner && stats.winStreak && stats.winStreak >= 2),
    getMessage: (stats) => ({
      title: "You're On Fire!",
      message: `${stats.winStreak} wins in a row! Keep the streak going?`,
      incentive: '+10% XP for each consecutive win',
      winStreak: stats.winStreak,
    }),
    priority: 3,
  },
  {
    trigger: 'level_close',
    check: (stats) => !!(stats.xpToNextLevel && stats.xpToNextLevel <= 150),
    getMessage: (stats) => ({
      title: 'Level Up Soon!',
      message: `Just ${stats.xpToNextLevel} XP to reach level ${stats.nextLevel}!`,
      incentive: 'One more game should do it',
      xpNeeded: stats.xpToNextLevel,
    }),
    priority: 4,
  },
  {
    trigger: 'personal_best_close',
    check: (stats) => !!(stats.personalBest && stats.score && stats.score >= stats.personalBest * 0.9),
    getMessage: (stats) => ({
      title: 'Almost a Personal Best!',
      message: `You were ${stats.personalBest! - (stats.score || 0)} points away from your record!`,
      incentive: 'Try again while you\'re warmed up',
    }),
    priority: 5,
  },
];

/**
 * Get one-more-game prompt for player after a game
 */
export function getOneMoreGamePrompt(gameStats: GameStats): OneMoreGamePrompt | null {
  gameStats.nearMisses = calculateNearMisses(gameStats, gameStats.earnedAchievements || []);

  const matchingPrompts = ONE_MORE_GAME_PROMPTS
    .filter(prompt => prompt.check(gameStats))
    .sort((a, b) => a.priority - b.priority);

  if (matchingPrompts.length === 0) {
    return null;
  }

  return matchingPrompts[0].getMessage(gameStats);
}

// ==================== MYSTERY REWARDS (Variable Ratio) ====================

interface MysteryRewardPool {
  probability: number;
  rewards: MysteryReward[];
}

export const MYSTERY_REWARD_POOLS: Record<string, MysteryRewardPool> = {
  game_completion: {
    probability: 0.15,
    rewards: [
      { type: 'xp_multiplier', value: 2, weight: 50, display: '2x XP Bonus!' },
      { type: 'xp_multiplier', value: 3, weight: 25, display: '3x XP Jackpot!' },
      { type: 'bonus_hints', value: 2, weight: 40, display: '+2 Free Hints!' },
      { type: 'bonus_hints', value: 5, weight: 10, display: '+5 Hint Bundle!' },
      { type: 'streak_freeze', value: 1, weight: 20, display: 'Streak Freeze!' },
      { type: 'xp_flat', value: 500, weight: 15, display: '500 Bonus XP!' },
      { type: 'rare_title', value: 'LUCKY_FINDER', weight: 3, display: 'Rare Title: Lucky Finder!' },
    ],
  },
  long_word: {
    probability: 0.25,
    rewards: [
      { type: 'instant_xp', value: 50, weight: 60, display: '+50 XP!' },
      { type: 'instant_xp', value: 100, weight: 30, display: '+100 XP!' },
      { type: 'combo_boost', value: 2, weight: 25, display: '+2 Combo!' },
      { type: 'combo_boost', value: 3, weight: 10, display: '+3 Combo!' },
    ],
  },
  achievement: {
    probability: 0.3,
    rewards: [
      { type: 'xp_flat', value: 100, weight: 50, display: 'Achievement Bonus: +100 XP!' },
      { type: 'xp_flat', value: 250, weight: 25, display: 'Achievement Jackpot: +250 XP!' },
      { type: 'bonus_hints', value: 1, weight: 35, display: 'Free Hint!' },
    ],
  },
  win: {
    probability: 0.2,
    rewards: [
      { type: 'xp_multiplier', value: 1.5, weight: 50, display: '1.5x Win Bonus!' },
      { type: 'xp_multiplier', value: 2, weight: 30, display: '2x Win Bonus!' },
      { type: 'streak_freeze', value: 1, weight: 15, display: 'Streak Freeze Won!' },
      { type: 'rare_title', value: 'FORTUNE_FAVORS', weight: 5, display: 'Rare Title: Fortune Favors!' },
    ],
  },
};

/**
 * Roll for mystery reward
 */
export function rollMysteryReward(triggerType: string): MysteryRewardResult | null {
  const pool = MYSTERY_REWARD_POOLS[triggerType];
  if (!pool) return null;

  if (Math.random() > pool.probability) {
    return null;
  }

  const totalWeight = pool.rewards.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;

  for (const reward of pool.rewards) {
    random -= reward.weight;
    if (random <= 0) {
      return {
        triggerType,
        ...reward,
        rarity: calculateRewardRarity(reward.weight, totalWeight),
      };
    }
  }

  return null;
}

/**
 * Calculate rarity based on weight
 */
function calculateRewardRarity(weight: number, totalWeight: number): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
  const percentage = (weight / totalWeight) * 100;
  if (percentage <= 5) return 'legendary';
  if (percentage <= 15) return 'epic';
  if (percentage <= 30) return 'rare';
  if (percentage <= 50) return 'uncommon';
  return 'common';
}
