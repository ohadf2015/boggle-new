import type { SupabaseClient } from '@supabase/supabase-js';
import { awardCoinsServer } from '@/backend/services/economy/awardCoins';
import { grantPremiumPart } from '@/lib/avatar/grantChestPart.server';
import { trackIndex, windowFor, type HolidayKey, type HolidayWindow } from '@/lib/holidays/calendar';
import logger from '@/utils/logger';
import { buildProgressView, type HolidayDaySource, type HolidayProgressView } from './progressView';
import { eventKeyFor, holidayReward, type HolidayDayReward } from './rewards';

const TABLE = 'holiday_event_progress';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isPlausibleLocalDate(localDate: string, now: Date = new Date()): boolean {
  if (!DATE_RE.test(localDate)) return false;
  const t = Date.parse(`${localDate}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== localDate) return false;
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.abs(t - today) <= DAY_MS;
}

export async function readHolidayProgress(supabase: SupabaseClient, userId: string, win: HolidayWindow): Promise<HolidayProgressView> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('day_index, source')
    .eq('user_id', userId)
    .eq('event_key', eventKeyFor(win));
  if (error) throw new Error(`${TABLE} read: ${error.message}`);
  const rows = (data ?? []) as { day_index: number; source?: HolidayDaySource | null }[];
  const sources = new Map(rows.flatMap((r) => (r.source ? [[r.day_index, r.source] as const] : [])));
  return buildProgressView(win, new Set(rows.map((r) => r.day_index)), sources);
}

export type MarkResult =
  | { status: 'outside_window' | 'not_track_day' }
  | { status: 'already' | 'lit'; index: number; reward: HolidayDayReward };

async function grant(userId: string, supabase: SupabaseClient, eventKey: string, index: number, reward: HolidayDayReward): Promise<boolean> {
  if (reward.partKey) return grantPremiumPart(supabase, userId, reward.partKey);
  if (reward.coins) return (await awardCoinsServer(userId, reward.coins, 'holiday_event', { event: eventKey, day: index })).success;
  return true;
}

export async function markHolidayDayPlayed(args: {
  supabase: SupabaseClient;
  userId: string;
  holiday: HolidayKey;
  localDate: string;
  locale?: string;
}): Promise<MarkResult> {
  const { supabase, userId, holiday, localDate, locale } = args;
  const win = windowFor(holiday, localDate, locale);
  if (!win) return { status: 'outside_window' };
  const index = trackIndex(win, localDate);
  const reward = index === null ? null : holidayReward(holiday, index);
  if (index === null || !reward) return { status: 'not_track_day' };

  const eventKey = eventKeyFor(win);
  const { error } = await supabase.from(TABLE).insert({
    user_id: userId,
    event_key: eventKey,
    day_index: index,
    played_on: localDate,
    claimed_reward: reward,
  });
  if (error) {
    if (error.code === '23505') return { status: 'already', index, reward };
    throw new Error(`${TABLE} insert: ${error.message}`);
  }

  if (!(await grant(userId, supabase, eventKey, index, reward))) {
    const { error: undoError } = await supabase
      .from(TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('event_key', eventKey)
      .eq('day_index', index);
    throw new Error(`holiday grant failed for ${userId} ${eventKey}/${index}${undoError ? `; undo failed: ${undoError.message}` : ''}`);
  }
  logger.info('HOLIDAY_EVENT', `${eventKey} day ${index} lit for ${userId}`);
  return { status: 'lit', index, reward };
}
