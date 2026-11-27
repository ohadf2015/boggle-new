import type { SupabaseClient } from '@supabase/supabase-js';
import { markHolidayDayPlayed } from '@/lib/holidayEvent/progress.server';
import { eventKeyFor } from '@/lib/holidayEvent/rewards';
import logger from '@/utils/logger';
import { windowFor, type HolidayKey, type HolidayWindow } from './calendar';
import { latestMissedDay, missedDays } from './dailyRescue';

const REF_RE = /^[A-Z0-9]{4,16}$/;

export type RescueResult = { status: 'relit'; day: number } | { status: 'invalid' | 'not_finished' | 'nothing_missed' | 'already' | 'closed' };

async function litDays(supabase: SupabaseClient, userId: string, win: HolidayWindow): Promise<Set<number>> {
  const { data, error } = await supabase.from('holiday_event_progress').select('day_index').eq('user_id', userId).eq('event_key', eventKeyFor(win));
  if (error) throw new Error(`holiday rescue progress: ${error.message}`);
  return new Set(((data as Array<{ day_index: number }> | null) ?? []).map((r) => r.day_index));
}

export async function rescueInviter(i: {
  supabase: SupabaseClient;
  friendId: string;
  ref: unknown;
  holiday: HolidayKey;
  localDate: string;
  locale?: string | null;
}): Promise<RescueResult> {
  const ref = typeof i.ref === 'string' ? i.ref.trim().toUpperCase() : '';
  if (!REF_RE.test(ref)) return { status: 'invalid' };
  const win = windowFor(i.holiday, i.localDate, i.locale);
  if (!win) return { status: 'closed' };

  const { data: inviter, error } = await i.supabase.from('profiles').select('id').eq('referral_code', ref).maybeSingle();
  if (error) throw new Error(`holiday rescue inviter: ${error.message}`);
  const inviterId = (inviter as { id?: string } | null)?.id;
  if (!inviterId || inviterId === i.friendId) return { status: 'invalid' };

  const { data: played } = await i.supabase
    .from('daily_word_hunt_attempts')
    .select('player_id')
    .eq('player_id', i.friendId)
    .in('puzzle_date', [...new Set([i.localDate, new Date().toISOString().slice(0, 10)])])
    .limit(1);
  if (!Array.isArray(played) || !played.length) return { status: 'not_finished' };

  const index = latestMissedDay(win.trackDays, await litDays(i.supabase, inviterId, win), i.localDate);
  if (index === null) return { status: 'nothing_missed' };

  const eventKey = eventKeyFor(win);
  const { error: rErr } = await i.supabase.from('holiday_rescues').insert({
    inviter_id: inviterId,
    friend_id: i.friendId,
    event_key: eventKey,
    day_index: index,
    rescued_on: i.localDate,
  });
  if (rErr) {
    if (rErr.code === '23505') return { status: 'already' };
    throw new Error(`holiday rescue insert: ${rErr.message}`);
  }

  try {
    const mark = await markHolidayDayPlayed({ supabase: i.supabase, userId: inviterId, holiday: i.holiday, localDate: win.trackDays[index] });
    if ('index' in mark) {
      await i.supabase.from('holiday_event_progress').update({ source: 'friend' }).eq('user_id', inviterId).eq('event_key', eventKey).eq('day_index', index);
    }
  } catch (e) {
    await i.supabase.from('holiday_rescues').delete().eq('inviter_id', inviterId).eq('event_key', eventKey).eq('day_index', index);
    throw e;
  }
  logger.info('HOLIDAY_RESCUE', `${eventKey} day ${index} relit for ${inviterId} by ${i.friendId}`);
  return { status: 'relit', day: index + 1 };
}

export interface RescueState {
  code: string | null;
  missedDay: number | null;
  missedCount: number;
  rescuedDays: number[];
}

export async function readRescueState(i: {
  supabase: SupabaseClient;
  userId: string;
  holiday: HolidayKey;
  localDate: string;
  locale?: string | null;
}): Promise<RescueState | null> {
  const win = windowFor(i.holiday, i.localDate, i.locale);
  if (!win) return null;
  const [lit, { data: profile }, { data: rescues }] = await Promise.all([
    litDays(i.supabase, i.userId, win),
    i.supabase.from('profiles').select('referral_code').eq('id', i.userId).maybeSingle(),
    i.supabase.from('holiday_rescues').select('day_index').eq('inviter_id', i.userId).eq('event_key', eventKeyFor(win)),
  ]);
  const missed = missedDays(win.trackDays, lit, i.localDate);
  const latest = latestMissedDay(win.trackDays, lit, i.localDate);
  return {
    code: (profile as { referral_code?: string | null } | null)?.referral_code ?? null,
    missedDay: latest === null ? null : latest + 1,
    missedCount: missed.length,
    rescuedDays: ((rescues as Array<{ day_index: number }> | null) ?? []).map((r) => r.day_index + 1),
  };
}
