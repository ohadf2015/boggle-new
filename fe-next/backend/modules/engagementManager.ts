/**
 * Engagement Manager
 * Handles streaks, calendar rewards, come-back campaigns, near-miss notifications,
 * one-more-game prompts, and variable ratio mystery rewards
 */

const { getSupabase } = require('./supabaseServer');

// ==================== TYPES ====================

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
}

// ==================== STREAK SYSTEM ====================

export const STREAK_BONUSES: Record<number, StreakBonus> = {
  3: { multiplier: 1.25, badge: 'streak_3' },
  7: { multiplier: 1.5, badge: 'streak_7', achievement: 'WEEKLY_WARRIOR' },
  14: { multiplier: 1.75, badge: 'streak_14', title: 'DEDICATED_PLAYER' },
  30: { multiplier: 2.0, badge: 'streak_30', title: 'STREAK_MASTER', avatarFrame: 'flame_border' },
  60: { multiplier: 2.25, badge: 'streak_60', title: 'UNSTOPPABLE' },
  100: { multiplier: 2.5, badge: 'streak_100', title: 'LEGENDARY_STREAK', avatarFrame: 'cosmic_flame' },
};

/**
 * Record player login and update streak
 */
export async function recordLogin(playerId: string): Promise<LoginResult> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];

  // Get or create engagement record
  let { data: engagement } = await supabase
    .from('player_engagement')
    .select('player_id, current_streak, longest_streak, last_login_date, streak_protected_until, streak_freezes_available, calendar_month, calendar_year, calendar_days_claimed, last_played_at, comeback_bonus_claimed, comeback_bonus_expires_at, comeback_xp_multiplier, total_sessions, avg_session_length, games_today, last_session_date')
    .eq('player_id', playerId)
    .single();

  if (!engagement) {
    // Create new engagement record
    const { error } = await supabase
      .from('player_engagement')
      .insert({
        player_id: playerId,
        current_streak: 1,
        longest_streak: 1,
        last_login_date: today,
        last_played_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error('[Engagement] Error creating record:', errorMessage);
      return { streak: 1, isNewStreak: true, bonuses: [] };
    }

    return {
      streak: 1,
      isNewStreak: true,
      bonuses: [],
    };
  }

  // Check if already logged in today
  if (engagement.last_login_date === today) {
    return {
      streak: engagement.current_streak,
      isNewStreak: false,
      bonuses: getStreakBonuses(engagement.current_streak),
    };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak: number;
  let streakFrozen = false;

  if (engagement.last_login_date === yesterdayStr) {
    // Continue streak
    newStreak = engagement.current_streak + 1;
  } else if (
    engagement.streak_protected_until &&
    new Date(engagement.streak_protected_until) >= new Date(today)
  ) {
    // Streak is protected
    newStreak = engagement.current_streak + 1;
    streakFrozen = true;
  } else if (engagement.streak_freezes_available > 0) {
    // Use a streak freeze
    newStreak = engagement.current_streak + 1;
    streakFrozen = true;
    await supabase
      .from('player_engagement')
      .update({ streak_freezes_available: engagement.streak_freezes_available - 1 })
      .eq('player_id', playerId);
  } else {
    // Streak broken
    newStreak = 1;
  }

  const longestStreak = Math.max(newStreak, engagement.longest_streak || 0);

  // Update engagement record
  await supabase
    .from('player_engagement')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_login_date: today,
      last_played_at: new Date().toISOString(),
      games_today: 0,
    })
    .eq('player_id', playerId);

  // Check for streak milestone rewards
  const newMilestones: StreakBonusWithDays[] = [];
  for (const [days, bonus] of Object.entries(STREAK_BONUSES)) {
    if (newStreak >= parseInt(days) && engagement.current_streak < parseInt(days)) {
      newMilestones.push({ days: parseInt(days), ...bonus });
    }
  }

  return {
    streak: newStreak,
    previousStreak: engagement.current_streak,
    longestStreak,
    isNewStreak: newStreak !== engagement.current_streak,
    streakBroken: newStreak === 1 && engagement.current_streak > 1,
    streakFrozen,
    bonuses: getStreakBonuses(newStreak),
    newMilestones,
  };
}

/**
 * Get bonuses for current streak level
 */
export function getStreakBonuses(streak: number): StreakBonusWithDays[] {
  const bonuses: StreakBonusWithDays[] = [];
  for (const [days, bonus] of Object.entries(STREAK_BONUSES)) {
    if (streak >= parseInt(days)) {
      bonuses.push({ days: parseInt(days), ...bonus });
    }
  }
  return bonuses;
}

/**
 * Get XP multiplier for streak
 */
export function getStreakXpMultiplier(streak: number): number {
  let multiplier = 1.0;
  for (const [days, bonus] of Object.entries(STREAK_BONUSES)) {
    if (streak >= parseInt(days)) {
      multiplier = bonus.multiplier;
    }
  }
  return multiplier;
}

// ==================== CALENDAR REWARDS ====================

export const CALENDAR_REWARDS: CalendarReward[] = [
  { day: 1, type: 'xp', amount: 50 },
  { day: 2, type: 'xp', amount: 75 },
  { day: 3, type: 'hints', amount: 2 },
  { day: 4, type: 'xp', amount: 100 },
  { day: 5, type: 'xp', amount: 125 },
  { day: 6, type: 'hints', amount: 3 },
  { day: 7, type: 'mystery_box', rarity: 'common', isMilestone: true },
  { day: 8, type: 'xp', amount: 150 },
  { day: 9, type: 'xp', amount: 175 },
  { day: 10, type: 'streak_freeze', amount: 1 },
  { day: 11, type: 'xp', amount: 200 },
  { day: 12, type: 'xp', amount: 225 },
  { day: 13, type: 'hints', amount: 4 },
  { day: 14, type: 'mystery_box', rarity: 'rare', isMilestone: true },
  { day: 15, type: 'xp', amount: 250 },
  { day: 16, type: 'xp', amount: 275 },
  { day: 17, type: 'hints', amount: 5 },
  { day: 18, type: 'xp', amount: 300 },
  { day: 19, type: 'xp', amount: 325 },
  { day: 20, type: 'streak_freeze', amount: 2 },
  { day: 21, type: 'mystery_box', rarity: 'epic', isMilestone: true },
  { day: 22, type: 'xp', amount: 350 },
  { day: 23, type: 'xp', amount: 375 },
  { day: 24, type: 'hints', amount: 6 },
  { day: 25, type: 'xp', amount: 400 },
  { day: 26, type: 'xp', amount: 425 },
  { day: 27, type: 'hints', amount: 7 },
  { day: 28, type: 'exclusive_title', titleId: 'DEDICATED_PLAYER', isMilestone: true },
  { day: 29, type: 'xp', amount: 500 },
  { day: 30, type: 'mystery_box', rarity: 'legendary', isMilestone: true },
  { day: 31, type: 'xp', amount: 750 },
];

/**
 * Get calendar status for player
 */
export async function getCalendarStatus(playerId: string): Promise<CalendarStatus> {
  const supabase = getSupabase();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();

  const { data: engagement } = await supabase
    .from('player_engagement')
    .select('calendar_month, calendar_year, calendar_days_claimed')
    .eq('player_id', playerId)
    .single();

  // Reset calendar if new month
  if (!engagement || engagement.calendar_month !== currentMonth || engagement.calendar_year !== currentYear) {
    await supabase
      .from('player_engagement')
      .upsert({
        player_id: playerId,
        calendar_month: currentMonth,
        calendar_year: currentYear,
        calendar_days_claimed: [],
      });

    return {
      month: currentMonth,
      year: currentYear,
      daysClaimed: [],
      currentDay,
      canClaimToday: true,
      rewards: CALENDAR_REWARDS.slice(0, Math.min(31, getDaysInMonth(currentMonth, currentYear))),
    };
  }

  const daysClaimed = engagement.calendar_days_claimed || [];
  const canClaimToday = !daysClaimed.includes(currentDay);

  return {
    month: currentMonth,
    year: currentYear,
    daysClaimed,
    currentDay,
    canClaimToday,
    rewards: CALENDAR_REWARDS.slice(0, Math.min(31, getDaysInMonth(currentMonth, currentYear))),
  };
}

/**
 * Claim calendar reward for today
 */
export async function claimCalendarReward(playerId: string): Promise<{
  success: boolean;
  error?: string;
  reward?: CalendarReward;
  appliedReward?: unknown;
  nextReward?: CalendarReward | null;
}> {
  const supabase = getSupabase();
  const status = await getCalendarStatus(playerId);

  if (!status.canClaimToday) {
    return { success: false, error: 'Already claimed today' };
  }

  const reward = CALENDAR_REWARDS[status.currentDay - 1];
  if (!reward) {
    return { success: false, error: 'No reward for this day' };
  }

  // Update claimed days
  const newDaysClaimed = [...status.daysClaimed, status.currentDay];
  await supabase
    .from('player_engagement')
    .update({ calendar_days_claimed: newDaysClaimed })
    .eq('player_id', playerId);

  // Apply reward based on type
  const rewardResult = await applyReward(playerId, reward);

  return {
    success: true,
    reward,
    appliedReward: rewardResult,
    nextReward: CALENDAR_REWARDS[status.currentDay] || null,
  };
}

/**
 * Apply a reward to player
 */
export async function applyReward(playerId: string, reward: CalendarReward): Promise<unknown> {
  const supabase = getSupabase();

  switch (reward.type) {
    case 'xp':
      await supabase.rpc('increment_player_xp', {
        p_player_id: playerId,
        p_xp_amount: reward.amount,
      });
      return { type: 'xp', amount: reward.amount };

    case 'hints':
      await supabase
        .from('profiles')
        .update({ free_hints_available: supabase.rpc('increment', { x: reward.amount }) })
        .eq('id', playerId);
      return { type: 'hints', amount: reward.amount };

    case 'streak_freeze':
      await supabase
        .from('player_engagement')
        .update({ streak_freezes_available: supabase.rpc('increment', { x: reward.amount }) })
        .eq('player_id', playerId);
      return { type: 'streak_freeze', amount: reward.amount };

    case 'mystery_box':
      return await rollMysteryBox(playerId, reward.rarity || 'common');

    case 'exclusive_title':
      return { type: 'title', titleId: reward.titleId };

    default:
      return reward;
  }
}

// ==================== COME-BACK CAMPAIGNS ====================

export const COMEBACK_TIERS: ComebackTier[] = [
  { minDays: 3, maxDays: 6, xpMultiplier: 1.5, duration: 24, hints: 1, message: "We missed you! Enjoy 50% bonus XP for 24 hours!" },
  { minDays: 7, maxDays: 13, xpMultiplier: 2.0, duration: 48, hints: 3, streakFreezes: 1, message: "Welcome back! Here's a gift: 2x XP for 48 hours + 3 free hints!" },
  { minDays: 14, maxDays: 29, xpMultiplier: 2.5, duration: 72, hints: 5, streakFreezes: 2, message: "You've been away! Take 2.5x XP for 72 hours + bonus rewards!" },
  { minDays: 30, maxDays: Infinity, xpMultiplier: 3.0, duration: 168, hints: 10, streakFreezes: 3, title: 'THE_RETURNED', message: "The legend returns! Massive 3x XP for a full week + exclusive title!" },
];

/**
 * Check and apply come-back bonuses
 */
export async function checkComebackBonus(playerId: string): Promise<ComebackBonusInfo> {
  const supabase = getSupabase();

  const { data: engagement } = await supabase
    .from('player_engagement')
    .select('last_played_at, comeback_bonus_claimed, comeback_bonus_expires_at')
    .eq('player_id', playerId)
    .single();

  if (!engagement || !engagement.last_played_at) {
    return { eligible: false };
  }

  // Check if bonus already active
  if (engagement.comeback_bonus_expires_at && new Date(engagement.comeback_bonus_expires_at) > new Date()) {
    return {
      eligible: false,
      active: true,
      expiresAt: engagement.comeback_bonus_expires_at,
    };
  }

  const lastPlayed = new Date(engagement.last_played_at);
  const now = new Date();
  const daysAway = Math.floor((now.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24));

  const tier = COMEBACK_TIERS.find(t => daysAway >= t.minDays && daysAway <= t.maxDays);

  if (!tier) {
    return { eligible: false, daysAway };
  }

  return {
    eligible: true,
    daysAway,
    tier: {
      xpMultiplier: tier.xpMultiplier,
      durationHours: tier.duration,
      hints: tier.hints,
      streakFreezes: tier.streakFreezes || 0,
      title: tier.title || null,
      message: tier.message,
    },
  };
}

/**
 * Claim come-back bonus
 */
export async function claimComebackBonus(playerId: string): Promise<{
  success: boolean;
  error?: string;
  bonus?: ComebackBonusInfo['tier'];
  expiresAt?: string;
}> {
  const supabase = getSupabase();
  const bonusInfo = await checkComebackBonus(playerId);

  if (!bonusInfo.eligible || !bonusInfo.tier) {
    return { success: false, error: 'Not eligible for comeback bonus' };
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + bonusInfo.tier.durationHours);

  // Update engagement with comeback bonus
  await supabase
    .from('player_engagement')
    .update({
      comeback_bonus_claimed: true,
      comeback_bonus_expires_at: expiresAt.toISOString(),
      comeback_xp_multiplier: bonusInfo.tier.xpMultiplier,
      streak_freezes_available: supabase.rpc('increment', { x: bonusInfo.tier.streakFreezes }),
    })
    .eq('player_id', playerId);

  // Add hints
  if (bonusInfo.tier.hints > 0) {
    await supabase
      .from('profiles')
      .update({ free_hints_available: supabase.rpc('increment', { x: bonusInfo.tier.hints }) })
      .eq('id', playerId);
  }

  return {
    success: true,
    bonus: bonusInfo.tier,
    expiresAt: expiresAt.toISOString(),
  };
}

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

  // Word count near misses
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

  // Combo near misses
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

  // Score near misses (personal best)
  if (gameStats.personalBest && (gameStats.score || 0) >= gameStats.personalBest * 0.9 && (gameStats.score || 0) < gameStats.personalBest) {
    nearMisses.push({
      type: 'personal_best',
      current: gameStats.score || 0,
      target: gameStats.personalBest,
      remaining: gameStats.personalBest - (gameStats.score || 0),
      message: `So close to your personal best! Just ${gameStats.personalBest - (gameStats.score || 0)} more points!`,
    });
  }

  // Win margin near miss
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
  // Add near misses to stats
  gameStats.nearMisses = calculateNearMisses(gameStats, gameStats.earnedAchievements || []);

  // Find matching prompts
  const matchingPrompts = ONE_MORE_GAME_PROMPTS
    .filter(prompt => prompt.check(gameStats))
    .sort((a, b) => a.priority - b.priority);

  if (matchingPrompts.length === 0) {
    return null;
  }

  // Return highest priority prompt
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

  // Check probability
  if (Math.random() > pool.probability) {
    return null;
  }

  // Weighted random selection
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

/**
 * Roll mystery box from calendar rewards
 */
export async function rollMysteryBox(playerId: string, rarity: string): Promise<{
  type: 'mystery_box';
  rarity: string;
  contents: { type: string; amount: number };
}> {
  const rarityMultipliers: Record<string, number> = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 5,
  };

  const multiplier = rarityMultipliers[rarity] || 1;

  // Random reward type
  const rewardTypes = [
    { type: 'xp', baseAmount: 100 },
    { type: 'hints', baseAmount: 2 },
    { type: 'streak_freeze', baseAmount: 1 },
  ];

  const selected = rewardTypes[Math.floor(Math.random() * rewardTypes.length)];
  const amount = selected.baseAmount * multiplier;

  return {
    type: 'mystery_box',
    rarity,
    contents: {
      type: selected.type,
      amount,
    },
  };
}

/**
 * Log mystery reward to database
 */
export async function logMysteryReward(
  playerId: string,
  gameCode: string,
  reward: MysteryRewardResult
): Promise<void> {
  const supabase = getSupabase();

  await supabase.from('mystery_rewards_log').insert({
    player_id: playerId,
    game_code: gameCode,
    trigger_type: reward.triggerType,
    reward_type: reward.type,
    reward_value: String(reward.value),
  });
}

// ==================== HELPER FUNCTIONS ====================

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Get full engagement status for a player
 */
export async function getEngagementStatus(playerId: string): Promise<EngagementStatus> {
  const supabase = getSupabase();

  const { data: engagement } = await supabase
    .from('player_engagement')
    .select('current_streak, longest_streak, streak_freezes_available, calendar_month, calendar_year, calendar_days_claimed, last_played_at, comeback_bonus_claimed, comeback_bonus_expires_at, comeback_xp_multiplier, games_today')
    .eq('player_id', playerId)
    .single();

  const calendarStatus = await getCalendarStatus(playerId);
  const comebackInfo = await checkComebackBonus(playerId);

  return {
    streak: {
      current: engagement?.current_streak || 0,
      longest: engagement?.longest_streak || 0,
      multiplier: getStreakXpMultiplier(engagement?.current_streak || 0),
      bonuses: getStreakBonuses(engagement?.current_streak || 0),
      freezesAvailable: engagement?.streak_freezes_available || 0,
    },
    calendar: calendarStatus,
    comeback: comebackInfo,
    gamesToday: engagement?.games_today || 0,
  };
}

// CommonJS exports for backward compatibility
module.exports = {
  // Streak system
  recordLogin,
  getStreakBonuses,
  getStreakXpMultiplier,
  STREAK_BONUSES,

  // Calendar rewards
  getCalendarStatus,
  claimCalendarReward,
  CALENDAR_REWARDS,

  // Come-back campaigns
  checkComebackBonus,
  claimComebackBonus,
  COMEBACK_TIERS,

  // Near-miss notifications
  calculateNearMisses,
  NEAR_MISS_THRESHOLDS,

  // One more game prompts
  getOneMoreGamePrompt,
  ONE_MORE_GAME_PROMPTS,

  // Mystery rewards
  rollMysteryReward,
  rollMysteryBox,
  logMysteryReward,
  MYSTERY_REWARD_POOLS,

  // General
  getEngagementStatus,
  applyReward,
};
