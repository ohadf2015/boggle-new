import type { SupabaseClient } from '@supabase/supabase-js';
import { grantStreakFreezes } from '../daily/chestFreezeGrant';
import { CALENDAR_REWARDS, rollCalendarMysteryBox, type CalendarReward, type MysteryBoxContents } from './calendarRewards';

export type CalendarClaimStatus = 'claimed' | 'already' | 'none';

export type AppliedCalendarReward =
  | { type: 'xp' | 'hints' | 'streak_freeze'; amount: number }
  | { type: 'mystery_box'; rarity: string; contents: MysteryBoxContents }
  | { type: 'title'; titleId?: string };

export interface CalendarClaimResult {
  status: CalendarClaimStatus;
  reward?: CalendarReward;
  appliedReward?: AppliedCalendarReward;
  nextReward?: CalendarReward | null;
}

/** The calendar runs on the server's local date, as it always has. */
export function calendarToday(now: Date): { year: number; month: number; day: number; date: string } {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return { year, month, day, date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

/** What a claim of this reward pays. A box's contents come from the server-side roll only. */
export function describeCalendarReward(playerId: string, reward: CalendarReward, date: string): AppliedCalendarReward {
  switch (reward.type) {
    case 'mystery_box': {
      const rarity = reward.rarity ?? 'common';
      return { type: 'mystery_box', rarity, contents: rollCalendarMysteryBox(playerId, date, rarity) };
    }
    case 'exclusive_title':
      return { type: 'title', titleId: reward.titleId };
    default:
      return { type: reward.type, amount: reward.amount ?? 0 };
  }
}

/** Starts this month's calendar without wiping a claim another request just made. */
async function ensureCurrentMonth(supabase: SupabaseClient, playerId: string, year: number, month: number): Promise<number[]> {
  const { data: row } = await supabase
    .from('player_engagement')
    .select('calendar_month, calendar_year, calendar_days_claimed')
    .eq('player_id', playerId)
    .maybeSingle();
  if (!row) {
    await supabase.from('player_engagement').insert({
      player_id: playerId, calendar_month: month, calendar_year: year, calendar_days_claimed: [],
    });
    return [];
  }
  const current = row as { calendar_month: number | null; calendar_year: number | null; calendar_days_claimed: number[] | null };
  if (current.calendar_month === month && current.calendar_year === year) return current.calendar_days_claimed ?? [];
  // Guarded on the month it read, so a racing request that already reset and claimed is left alone.
  let reset = supabase
    .from('player_engagement')
    .update({ calendar_month: month, calendar_year: year, calendar_days_claimed: [] })
    .eq('player_id', playerId);
  reset = current.calendar_month === null ? reset.is('calendar_month', null) : reset.eq('calendar_month', current.calendar_month);
  reset = current.calendar_year === null ? reset.is('calendar_year', null) : reset.eq('calendar_year', current.calendar_year);
  await reset;
  return [];
}

async function pay(supabase: SupabaseClient, playerId: string, applied: AppliedCalendarReward): Promise<void> {
  const what = applied.type === 'mystery_box' ? applied.contents : applied;
  if (what.type === 'xp') {
    const { error } = await supabase.rpc('increment_player_xp', { p_player_id: playerId, p_xp_amount: what.amount });
    if (error) throw new Error(`xp grant failed: ${error.message}`);
  } else if (what.type === 'streak_freeze') {
    if (!(await grantStreakFreezes(supabase, playerId, what.amount))) throw new Error('streak freeze grant failed');
  } else if (what.type === 'hints') {
    const { data: profile } = await supabase.from('profiles').select('free_hints_available').eq('id', playerId).maybeSingle();
    const hints = (profile as { free_hints_available?: number } | null)?.free_hints_available ?? 0;
    await supabase.from('profiles').update({ free_hints_available: hints + what.amount }).eq('id', playerId);
  }
}

/**
 * Claims today's calendar reward for a player. The day is marked claimed with
 * one conditional update (only if the array does not already hold today), and
 * only the request whose update changed the row pays. A re-claim, a replayed
 * request or a racing second tab gets `already` with the same contents and
 * pays nothing. Nothing from the request decides what is paid.
 */
export async function claimCalendarDay(supabase: SupabaseClient, playerId: string, now: Date = new Date()): Promise<CalendarClaimResult> {
  const { year, month, day, date } = calendarToday(now);
  const reward = CALENDAR_REWARDS[day - 1];
  if (!reward) return { status: 'none' };
  const applied = describeCalendarReward(playerId, reward, date);
  const nextReward = CALENDAR_REWARDS[day] ?? null;

  const claimed = await ensureCurrentMonth(supabase, playerId, year, month);
  if (claimed.includes(day)) return { status: 'already', reward, appliedReward: applied, nextReward };

  const { data: marked, error } = await supabase
    .from('player_engagement')
    .update({ calendar_days_claimed: [...claimed, day] })
    .eq('player_id', playerId)
    .eq('calendar_month', month)
    .eq('calendar_year', year)
    .not('calendar_days_claimed', 'cs', `{${day}}`)
    .select('player_id');
  if (error) throw new Error(`calendar claim failed: ${error.message}`);
  if (!marked || marked.length === 0) return { status: 'already', reward, appliedReward: applied, nextReward };

  try {
    await pay(supabase, playerId, applied);
  } catch (payError) {
    // Reopen today so a retry can pay; otherwise the mark blocks it with nothing given.
    await supabase
      .from('player_engagement')
      .update({ calendar_days_claimed: claimed })
      .eq('player_id', playerId)
      .eq('calendar_month', month)
      .eq('calendar_year', year);
    throw payError;
  }
  return { status: 'claimed', reward, appliedReward: applied, nextReward };
}
