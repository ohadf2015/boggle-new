import type { SupabaseClient } from '@supabase/supabase-js';
import type { HolidayKey } from './calendar';
import { GIFT_TRACK_LENGTH } from './gift';
import { HUNT_GOAL } from './hunt';
import { readHolidayTable } from './dailyTable.server';
import { litDays, readClaim } from './holidayGrant.server';
import type { HolidayInput } from './holidayRequest.server';

export interface HolidayWrappedStats {
  holiday: HolidayKey;
  lit: number;
  total: number;
  games: number;
  words: number;
  longest: string;
  huntFound: number;
  huntGoal: number;
  secrets: number;
  titles: string[];
  tableRank: number | null;
  tableSize: number;
}

async function rows<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>, what: string): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw new Error(`${what}: ${error.message}`);
  return (data ?? []) as T[];
}

export async function readWrapped(supabase: SupabaseClient, userId: string, i: HolidayInput): Promise<HolidayWrappedStats> {
  const by = (table: string, cols: string) => supabase.from(table).select(cols).eq('user_id', userId).eq('event_key', i.eventKey);
  const [lit, days, hunts, eggs, seeker, results, table] = await Promise.all([
    litDays(supabase, userId, i.eventKey),
    rows<{ games: number; words: number }>(by('holiday_day_games', 'games, words'), 'holiday_day_games'),
    rows<{ find_date: string }>(by('holiday_hunt_finds', 'find_date'), 'holiday_hunt_finds'),
    rows<{ egg_id: string }>(by('holiday_egg_finds', 'egg_id'), 'holiday_egg_finds'),
    readClaim<{ title?: string }>(supabase, userId, i.eventKey, 'seeker'),
    rows<{ longest_word: string | null }>(
      supabase
        .from('game_results')
        .select('longest_word')
        .eq('player_id', userId)
        .gte('created_at', i.win.start)
        .lte('created_at', `${i.win.end}T23:59:59Z`)
        .limit(500),
      'game_results',
    ),
    readHolidayTable({ supabase, userId, holiday: i.holiday, localDate: i.localDate, locale: i.locale }).catch(() => null),
  ]);
  const members = table?.members ?? [];
  const titles = [...lit.values()].flatMap((r) => (r.title ? [r.title] : []));
  if (seeker) titles.push(seeker.title ?? 'seeker');
  return {
    holiday: i.holiday,
    lit: lit.size,
    total: GIFT_TRACK_LENGTH[i.holiday],
    games: days.reduce((s, d) => s + (d.games ?? 0), 0),
    words: days.reduce((s, d) => s + (d.words ?? 0), 0),
    longest: results.reduce((best, r) => ((r.longest_word ?? '').length > best.length ? (r.longest_word as string) : best), ''),
    huntFound: hunts.length,
    huntGoal: HUNT_GOAL[i.holiday],
    secrets: eggs.filter((e) => e.egg_id.startsWith('word_')).length,
    titles: [...new Set(titles)],
    tableRank: members.find((m) => m.isYou)?.rank ?? null,
    tableSize: members.length,
  };
}
