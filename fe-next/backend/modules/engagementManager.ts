/**
 * Engagement Manager
 * Handles streaks, calendar rewards, and come-back campaigns
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './supabaseServer';
import { xpForLevel } from '@/shared/xp/levelCurve';
import { CALENDAR_REWARDS } from '../../lib/engagement/calendarRewards';
import { claimCalendarDay } from '../../lib/engagement/claimCalendarReward.server';
import logger from '../utils/logger';
import type {
  StreakBonus, StreakBonusWithDays, CalendarReward, LoginResult,
  CalendarStatus, EngagementStatus,
} from './engagementTypes';

// Re-export all types
export type {
  StreakBonus, StreakBonusWithDays, CalendarReward, ComebackTier,
  NearMissThreshold, GameStats, NearMiss, OneMoreGamePrompt,
  LoginResult, CalendarStatus,
  ComebackBonusInfo, EngagementStatus,
} from './engagementTypes';

// Re-export rewards module
export {
  NEAR_MISS_THRESHOLDS, calculateNearMisses,
  ONE_MORE_GAME_PROMPTS, getOneMoreGamePrompt,
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
    current_streak: newStreak, longest_streak: longestStreak, last_login_date: today, games_today: 0,
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

export { CALENDAR_REWARDS };

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/** Read-only: a new month reads as an empty calendar; the claim itself starts the month. */
export async function getCalendarStatus(playerId: string): Promise<CalendarStatus> {
  const supabase = getSupabase()!;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();

  const { data: engagement } = await supabase
    .from('player_engagement')
    .select('calendar_month, calendar_year, calendar_days_claimed')
    .eq('player_id', playerId).maybeSingle();

  const sameMonth = !!engagement && engagement.calendar_month === currentMonth && engagement.calendar_year === currentYear;
  const daysClaimed: number[] = sameMonth ? engagement.calendar_days_claimed || [] : [];
  return {
    month: currentMonth, year: currentYear, daysClaimed, currentDay,
    canClaimToday: !daysClaimed.includes(currentDay),
    rewards: CALENDAR_REWARDS.slice(0, Math.min(31, getDaysInMonth(currentMonth, currentYear))),
  };
}

/** Same claim as POST /api/engagement/calendar: one payout per player per calendar day. */
export async function claimCalendarReward(playerId: string): Promise<{
  success: boolean; error?: string; reward?: CalendarReward; appliedReward?: unknown; nextReward?: CalendarReward | null;
}> {
  const result = await claimCalendarDay(getSupabase()! as unknown as SupabaseClient, playerId);
  if (result.status === 'none') return { success: false, error: 'No reward for this day' };
  if (result.status === 'already') return { success: false, error: 'Already claimed today' };
  return { success: true, reward: result.reward, appliedReward: result.appliedReward, nextReward: result.nextReward };
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

  const currentLevel = profile?.current_level || 1;
  const totalXp = profile?.total_xp || 0;
  const xpToNextLevel = Math.max(0, xpForLevel(currentLevel + 1) - totalXp);

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
    xpForCurrentLevel: xpForLevel(currentLevel),
    gold: profile?.total_coins || 0,
  };
}
