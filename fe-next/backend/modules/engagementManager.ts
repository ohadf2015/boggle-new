/**
 * Engagement Manager
 * Handles streaks, calendar rewards, and come-back campaigns
 */

import { getSupabase } from './supabaseServer';
import logger from '../utils/logger';
import type {
  StreakBonus, StreakBonusWithDays, CalendarReward, LoginResult,
  CalendarStatus, EngagementStatus, MysteryRewardResult,
} from './engagementTypes';

// Re-export all types
export type {
  StreakBonus, StreakBonusWithDays, CalendarReward, ComebackTier,
  NearMissThreshold, GameStats, NearMiss, OneMoreGamePrompt,
  MysteryReward, MysteryRewardResult, LoginResult, CalendarStatus,
  ComebackBonusInfo, EngagementStatus,
} from './engagementTypes';

// Re-export rewards module
export {
  NEAR_MISS_THRESHOLDS, calculateNearMisses,
  ONE_MORE_GAME_PROMPTS, getOneMoreGamePrompt,
  MYSTERY_REWARD_POOLS, rollMysteryReward,
} from './engagementRewards';

// Re-export comeback module
import { COMEBACK_TIERS, checkComebackBonus, claimComebackBonus } from './engagementComeback';
export { COMEBACK_TIERS, checkComebackBonus, claimComebackBonus };

// ==================== STREAK SYSTEM ====================

export const STREAK_BONUSES: Record<number, StreakBonus> = {
  3: { multiplier: 1.25, badge: 'streak_3' },
  7: { multiplier: 1.5, badge: 'streak_7', achievement: 'WEEKLY_WARRIOR' },
  14: { multiplier: 1.75, badge: 'streak_14', title: 'DEDICATED_PLAYER' },
  30: { multiplier: 2.0, badge: 'streak_30', title: 'STREAK_MASTER', avatarFrame: 'flame_border' },
  60: { multiplier: 2.25, badge: 'streak_60', title: 'UNSTOPPABLE' },
  100: { multiplier: 2.5, badge: 'streak_100', title: 'LEGENDARY_STREAK', avatarFrame: 'cosmic_flame' },
};

export async function recordLogin(playerId: string): Promise<LoginResult> {
  const supabase = getSupabase()!;
  const today = new Date().toISOString().split('T')[0];

  let { data: engagement } = await supabase
    .from('player_engagement')
    .select('player_id, current_streak, longest_streak, last_login_date, streak_protected_until, streak_freezes_available, calendar_month, calendar_year, calendar_days_claimed, last_played_at, comeback_bonus_claimed, comeback_bonus_expires_at, comeback_xp_multiplier, total_sessions, avg_session_length, games_today, last_session_date')
    .eq('player_id', playerId)
    .single();

  if (!engagement) {
    const { error } = await supabase
      .from('player_engagement')
      .insert({ player_id: playerId, current_streak: 1, longest_streak: 1, last_login_date: today, last_played_at: new Date().toISOString() })
      .select().single();

    if (error) {
      logger.error('Engagement', 'Error creating record', { error: error.message || 'Unknown error' });
      return { streak: 1, isNewStreak: true, bonuses: [] };
    }
    return { streak: 1, isNewStreak: true, bonuses: [] };
  }

  if (engagement.last_login_date === today) {
    return { streak: engagement.current_streak, isNewStreak: false, bonuses: getStreakBonuses(engagement.current_streak) };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak: number;
  let streakFrozen = false;

  if (engagement.last_login_date === yesterdayStr) {
    newStreak = engagement.current_streak + 1;
  } else if (engagement.streak_protected_until && new Date(engagement.streak_protected_until) >= new Date(today)) {
    newStreak = engagement.current_streak + 1;
    streakFrozen = true;
  } else if (engagement.streak_freezes_available > 0) {
    newStreak = engagement.current_streak + 1;
    streakFrozen = true;
    await supabase.from('player_engagement').update({ streak_freezes_available: engagement.streak_freezes_available - 1 }).eq('player_id', playerId);
  } else {
    newStreak = 1;
  }

  const longestStreak = Math.max(newStreak, engagement.longest_streak || 0);

  await supabase.from('player_engagement').update({
    current_streak: newStreak, longest_streak: longestStreak, last_login_date: today, last_played_at: new Date().toISOString(), games_today: 0,
  }).eq('player_id', playerId);

  const newMilestones: StreakBonusWithDays[] = [];
  for (const [days, bonus] of Object.entries(STREAK_BONUSES)) {
    if (newStreak >= parseInt(days) && engagement.current_streak < parseInt(days)) {
      newMilestones.push({ days: parseInt(days), ...bonus });
    }
  }

  return {
    streak: newStreak, previousStreak: engagement.current_streak, longestStreak,
    isNewStreak: newStreak !== engagement.current_streak,
    streakBroken: newStreak === 1 && engagement.current_streak > 1,
    streakFrozen, bonuses: getStreakBonuses(newStreak), newMilestones,
  };
}

export function getStreakBonuses(streak: number): StreakBonusWithDays[] {
  const bonuses: StreakBonusWithDays[] = [];
  for (const [days, bonus] of Object.entries(STREAK_BONUSES)) {
    if (streak >= parseInt(days)) bonuses.push({ days: parseInt(days), ...bonus });
  }
  return bonuses;
}

export function getStreakXpMultiplier(streak: number): number {
  let multiplier = 1.0;
  for (const [days, bonus] of Object.entries(STREAK_BONUSES)) {
    if (streak >= parseInt(days)) multiplier = bonus.multiplier;
  }
  return multiplier;
}

// ==================== CALENDAR REWARDS ====================

export const CALENDAR_REWARDS: CalendarReward[] = [
  { day: 1, type: 'xp', amount: 50 }, { day: 2, type: 'xp', amount: 75 },
  { day: 3, type: 'hints', amount: 2 }, { day: 4, type: 'xp', amount: 100 },
  { day: 5, type: 'xp', amount: 125 }, { day: 6, type: 'hints', amount: 3 },
  { day: 7, type: 'mystery_box', rarity: 'common', isMilestone: true },
  { day: 8, type: 'xp', amount: 150 }, { day: 9, type: 'xp', amount: 175 },
  { day: 10, type: 'streak_freeze', amount: 1 },
  { day: 11, type: 'xp', amount: 200 }, { day: 12, type: 'xp', amount: 225 },
  { day: 13, type: 'hints', amount: 4 },
  { day: 14, type: 'mystery_box', rarity: 'rare', isMilestone: true },
  { day: 15, type: 'xp', amount: 250 }, { day: 16, type: 'xp', amount: 275 },
  { day: 17, type: 'hints', amount: 5 }, { day: 18, type: 'xp', amount: 300 },
  { day: 19, type: 'xp', amount: 325 }, { day: 20, type: 'streak_freeze', amount: 2 },
  { day: 21, type: 'mystery_box', rarity: 'epic', isMilestone: true },
  { day: 22, type: 'xp', amount: 350 }, { day: 23, type: 'xp', amount: 375 },
  { day: 24, type: 'hints', amount: 6 }, { day: 25, type: 'xp', amount: 400 },
  { day: 26, type: 'xp', amount: 425 }, { day: 27, type: 'hints', amount: 7 },
  { day: 28, type: 'exclusive_title', titleId: 'DEDICATED_PLAYER', isMilestone: true },
  { day: 29, type: 'xp', amount: 500 },
  { day: 30, type: 'mystery_box', rarity: 'legendary', isMilestone: true },
  { day: 31, type: 'xp', amount: 750 },
];

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export async function getCalendarStatus(playerId: string): Promise<CalendarStatus> {
  const supabase = getSupabase()!;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();

  const { data: engagement } = await supabase
    .from('player_engagement')
    .select('calendar_month, calendar_year, calendar_days_claimed')
    .eq('player_id', playerId).single();

  if (!engagement || engagement.calendar_month !== currentMonth || engagement.calendar_year !== currentYear) {
    await supabase.from('player_engagement').upsert({
      player_id: playerId, calendar_month: currentMonth, calendar_year: currentYear, calendar_days_claimed: [],
    });
    return {
      month: currentMonth, year: currentYear, daysClaimed: [], currentDay, canClaimToday: true,
      rewards: CALENDAR_REWARDS.slice(0, Math.min(31, getDaysInMonth(currentMonth, currentYear))),
    };
  }

  const daysClaimed = engagement.calendar_days_claimed || [];
  return {
    month: currentMonth, year: currentYear, daysClaimed, currentDay,
    canClaimToday: !daysClaimed.includes(currentDay),
    rewards: CALENDAR_REWARDS.slice(0, Math.min(31, getDaysInMonth(currentMonth, currentYear))),
  };
}

export async function claimCalendarReward(playerId: string): Promise<{
  success: boolean; error?: string; reward?: CalendarReward; appliedReward?: unknown; nextReward?: CalendarReward | null;
}> {
  const supabase = getSupabase()!;
  const status = await getCalendarStatus(playerId);

  if (!status.canClaimToday) return { success: false, error: 'Already claimed today' };

  const reward = CALENDAR_REWARDS[status.currentDay - 1];
  if (!reward) return { success: false, error: 'No reward for this day' };

  await supabase.from('player_engagement').update({ calendar_days_claimed: [...status.daysClaimed, status.currentDay] }).eq('player_id', playerId);
  const rewardResult = await applyReward(playerId, reward);

  return { success: true, reward, appliedReward: rewardResult, nextReward: CALENDAR_REWARDS[status.currentDay] || null };
}

export async function applyReward(playerId: string, reward: CalendarReward): Promise<unknown> {
  const supabase = getSupabase()!;
  switch (reward.type) {
    case 'xp':
      await supabase.rpc('increment_player_xp', { p_player_id: playerId, p_xp_amount: reward.amount });
      return { type: 'xp', amount: reward.amount };
    case 'hints':
      await supabase.from('profiles').update({ free_hints_available: supabase.rpc('increment', { x: reward.amount }) }).eq('id', playerId);
      return { type: 'hints', amount: reward.amount };
    case 'streak_freeze':
      await supabase.from('player_engagement').update({ streak_freezes_available: supabase.rpc('increment', { x: reward.amount }) }).eq('player_id', playerId);
      return { type: 'streak_freeze', amount: reward.amount };
    case 'mystery_box':
      return await rollMysteryBox(playerId, reward.rarity || 'common');
    case 'exclusive_title':
      return { type: 'title', titleId: reward.titleId };
    default:
      return reward;
  }
}

export async function rollMysteryBox(playerId: string, rarity: string): Promise<{
  type: 'mystery_box'; rarity: string; contents: { type: string; amount: number };
}> {
  const multiplier = ({ common: 1, rare: 2, epic: 3, legendary: 5 } as Record<string, number>)[rarity] || 1;
  const rewardTypes = [{ type: 'xp', baseAmount: 100 }, { type: 'hints', baseAmount: 2 }, { type: 'streak_freeze', baseAmount: 1 }];
  const selected = rewardTypes[Math.floor(Math.random() * rewardTypes.length)];
  return { type: 'mystery_box', rarity, contents: { type: selected.type, amount: selected.baseAmount * multiplier } };
}

export async function logMysteryReward(playerId: string, gameCode: string, reward: MysteryRewardResult): Promise<void> {
  const supabase = getSupabase()!;
  await supabase.from('mystery_rewards_log').insert({
    player_id: playerId, game_code: gameCode, trigger_type: reward.triggerType, reward_type: reward.type, reward_value: String(reward.value),
  });
}

export async function getEngagementStatus(playerId: string): Promise<EngagementStatus> {
  const supabase = getSupabase()!;

  // Fetch engagement + profile data in parallel
  const [engagementResult, profileResult] = await Promise.all([
    supabase.from('player_engagement')
      .select('current_streak, longest_streak, streak_freezes_available, calendar_month, calendar_year, calendar_days_claimed, last_played_at, comeback_bonus_claimed, comeback_bonus_expires_at, comeback_xp_multiplier, games_today')
      .eq('player_id', playerId).single(),
    supabase.from('profiles')
      .select('total_xp, current_level, total_coins')
      .eq('id', playerId).single(),
  ]);

  const engagement = engagementResult.data;
  const profile = profileResult.data;

  const calendarStatus = await getCalendarStatus(playerId);
  const comebackInfo = await checkComebackBonus(playerId);

  // Calculate XP progress within current level
  // Inline XP formula to avoid cross-rootDir import (same as adventureXpUtils.getXpForLevel)
  const getXpForLvl = (level: number): number => {
    if (level <= 1) return 0;
    const capped = Math.min(level, 50);
    let total = 0;
    for (let i = 2; i <= capped; i++) {
      total += Math.floor((i + 300 * Math.pow(2, i / 7)) / 4);
    }
    return total;
  };
  const currentLevel = profile?.current_level || 1;
  const totalXp = profile?.total_xp || 0;
  const xpForCurrentLevel = getXpForLvl(currentLevel);
  const xpForNextLevel = getXpForLvl(currentLevel + 1);
  const xpToNextLevel = Math.max(0, xpForNextLevel - totalXp);

  return {
    streak: {
      current: engagement?.current_streak || 0, longest: engagement?.longest_streak || 0,
      multiplier: getStreakXpMultiplier(engagement?.current_streak || 0),
      bonuses: getStreakBonuses(engagement?.current_streak || 0),
      freezesAvailable: engagement?.streak_freezes_available || 0,
    },
    calendar: calendarStatus, comeback: comebackInfo, gamesToday: engagement?.games_today || 0,
    xp: totalXp,
    level: currentLevel,
    xpToNextLevel,
    xpForCurrentLevel,
    gold: profile?.total_coins || 0,
  };
}
