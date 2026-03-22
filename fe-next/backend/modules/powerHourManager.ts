/**
 * Power Hour Manager
 *
 * Backend module for the Power Hour daily boost feature.
 * First game of the day activates a 1-hour window with 2x XP
 * and 2x mystery reward probability.
 *
 * DB columns needed on player_engagement table (migrate separately):
 *   - power_hour_expires_at TIMESTAMPTZ
 *   - power_hour_activated_date DATE
 */

import { getSupabase } from './supabaseServer';

export const POWER_HOUR_DURATION_MS = 60 * 60 * 1000; // 60 minutes

export interface PowerHourStatus {
  active: boolean;
  expiresAt: string | null;
  remainingMinutes: number;
}

/**
 * Activate Power Hour for a player. Idempotent — won't re-activate if already active today.
 */
export async function activatePowerHour(playerId: string): Promise<PowerHourStatus> {
  const supabase = getSupabase()!;
  const today = new Date().toISOString().split('T')[0];

  const { data: engagement } = await supabase
    .from('player_engagement')
    .select('power_hour_expires_at, power_hour_activated_date')
    .eq('player_id', playerId)
    .single();

  // Already activated today — return current status
  if (engagement?.power_hour_activated_date === today) {
    const expiresAt = new Date(engagement.power_hour_expires_at);
    const remaining = Math.max(0, expiresAt.getTime() - Date.now());
    return {
      active: remaining > 0,
      expiresAt: engagement.power_hour_expires_at,
      remainingMinutes: Math.ceil(remaining / 60_000),
    };
  }

  // Activate new power hour
  const expiresAt = new Date(Date.now() + POWER_HOUR_DURATION_MS);

  await supabase
    .from('player_engagement')
    .upsert({
      player_id: playerId,
      power_hour_expires_at: expiresAt.toISOString(),
      power_hour_activated_date: today,
    })
    .eq('player_id', playerId);

  return {
    active: true,
    expiresAt: expiresAt.toISOString(),
    remainingMinutes: 60,
  };
}

/**
 * Get current Power Hour status for a player.
 */
export async function getPowerHourStatus(playerId: string): Promise<PowerHourStatus> {
  const supabase = getSupabase()!;
  const today = new Date().toISOString().split('T')[0];

  const { data: engagement } = await supabase
    .from('player_engagement')
    .select('power_hour_expires_at, power_hour_activated_date')
    .eq('player_id', playerId)
    .single();

  if (!engagement || engagement.power_hour_activated_date !== today) {
    return { active: false, expiresAt: null, remainingMinutes: 0 };
  }

  const expiresAt = new Date(engagement.power_hour_expires_at);
  const remaining = Math.max(0, expiresAt.getTime() - Date.now());

  return {
    active: remaining > 0,
    expiresAt: engagement.power_hour_expires_at,
    remainingMinutes: Math.ceil(remaining / 60_000),
  };
}

/**
 * Quick boolean check if Power Hour is active.
 */
export async function isPowerHourActive(playerId: string): Promise<boolean> {
  const status = await getPowerHourStatus(playerId);
  return status.active;
}
