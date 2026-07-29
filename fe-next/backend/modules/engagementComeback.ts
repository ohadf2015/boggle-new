/**
 * Engagement Comeback Campaigns
 * Handles come-back bonus detection and claiming for returning players
 */

import { getSupabase } from './supabaseServer';
import type { ComebackTier, ComebackBonusInfo } from './engagementTypes';

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
  const supabase = getSupabase()!;

  const { data: engagement } = await supabase
    .from('player_engagement')
    .select('last_played_at, comeback_bonus_claimed, comeback_bonus_expires_at')
    .eq('player_id', playerId)
    .single();

  if (!engagement || !engagement.last_played_at) {
    return { eligible: false };
  }

  if (engagement.comeback_bonus_expires_at && new Date(engagement.comeback_bonus_expires_at) > new Date()) {
    return { eligible: false, active: true, expiresAt: engagement.comeback_bonus_expires_at };
  }

  const lastPlayed = new Date(engagement.last_played_at);
  const daysAway = Math.floor((Date.now() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24));
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
  const supabase = getSupabase()!;
  const bonusInfo = await checkComebackBonus(playerId);

  if (!bonusInfo.eligible || !bonusInfo.tier) {
    return { success: false, error: 'Not eligible for comeback bonus' };
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + bonusInfo.tier.durationHours);

  await supabase
    .from('player_engagement')
    .update({
      comeback_bonus_claimed: true,
      comeback_bonus_expires_at: expiresAt.toISOString(),
      comeback_xp_multiplier: bonusInfo.tier.xpMultiplier,
      streak_freezes_available: supabase.rpc('increment', { x: bonusInfo.tier.streakFreezes }),
    })
    .eq('player_id', playerId);

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
