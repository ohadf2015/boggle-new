import type { SupabaseClient } from '@supabase/supabase-js';
import { holidayReward, type HolidayDayReward } from '@/lib/holidayEvent/rewards';
import { trackIndex } from './calendar';
import { COMEBACK_GAMES, lastMissedIndex } from './comeback';
import { fnv1a } from './hash';
import { claimOnce, grantHolidayReward, litDays, readClaim } from './holidayGrant.server';
import type { HolidayInput } from './holidayRequest.server';

const TABLE = 'holiday_day_games';
const MIN_GAP_MS = 20_000;
const MAX_WORDS_PER_GAME = 300;
const TOTALS_TTL_MS = 60_000;

export type KohakuTeam = 'red' | 'white';

export function kohakuTeam(userId: string): KohakuTeam {
  return fnv1a(`${userId}|kohaku`) % 2 ? 'red' : 'white';
}

const isKohakuDay = (i: HolidayInput) => i.locale === 'ja' && i.localDate.endsWith('-12-31');

interface DayRow {
  games: number;
  words: number;
  team: KohakuTeam | null;
  last_game_at: string;
}

export interface GameNoteResult {
  games: number;
  counted: boolean;
  comeback?: { index: number; reward: HolidayDayReward };
}

async function tryComeback(supabase: SupabaseClient, userId: string, i: HolidayInput) {
  if (await readClaim(supabase, userId, i.eventKey, 'comeback')) return undefined;
  const todayIdx = trackIndex(i.win, i.localDate);
  if (todayIdx === null && i.localDate < i.win.trackDays[0]) return undefined;
  const lit = await litDays(supabase, userId, i.eventKey);
  const index = lastMissedIndex(new Set(lit.keys()), todayIdx, i.win.trackDays.length);
  if (index === null) return undefined;
  const reward = holidayReward(i.holiday, index) ?? {};
  const res = await claimOnce(supabase, { userId, eventKey: i.eventKey, kind: 'comeback', detail: { index, reward } }, async () => {
    const { error } = await supabase.from('holiday_event_progress').insert({
      user_id: userId, event_key: i.eventKey, day_index: index, played_on: i.localDate, claimed_reward: reward,
    });
    if (error) return false;
    if (await grantHolidayReward(supabase, userId, i.eventKey, reward, 'comeback')) return true;
    await supabase.from('holiday_event_progress').delete().eq('user_id', userId).eq('event_key', i.eventKey).eq('day_index', index);
    return false;
  });
  return res.status === 'claimed' ? res.detail : undefined;
}

export async function noteHolidayGame(
  supabase: SupabaseClient,
  userId: string,
  i: HolidayInput,
  words: number,
  now: Date = new Date(),
): Promise<GameNoteResult> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('games, words, team, last_game_at')
    .eq('user_id', userId)
    .eq('event_key', i.eventKey)
    .eq('played_on', i.localDate)
    .maybeSingle();
  if (error) throw new Error(`${TABLE} read: ${error.message}`);
  const row = data as DayRow | null;
  if (row && now.getTime() - Date.parse(row.last_game_at) < MIN_GAP_MS) return { games: row.games, counted: false };

  const games = (row?.games ?? 0) + 1;
  const add = Math.max(0, Math.min(MAX_WORDS_PER_GAME, Math.floor(Number(words) || 0)));
  const { error: upErr } = await supabase.from(TABLE).upsert({
    user_id: userId,
    event_key: i.eventKey,
    played_on: i.localDate,
    games,
    words: (row?.words ?? 0) + add,
    team: isKohakuDay(i) ? kohakuTeam(userId) : (row?.team ?? null),
    last_game_at: now.toISOString(),
  });
  if (upErr) throw new Error(`${TABLE} upsert: ${upErr.message}`);

  const comeback = games >= COMEBACK_GAMES ? await tryComeback(supabase, userId, i) : undefined;
  return comeback ? { games, counted: true, comeback } : { games, counted: true };
}

const TOTALS_PAGE = 1000;

const totalsCache = new Map<string, { at: number; red: number; white: number }>();

export async function kohakuTotals(supabase: SupabaseClient, localDate: string, now = Date.now()) {
  const hit = totalsCache.get(localDate);
  if (hit && now - hit.at < TOTALS_TTL_MS) return { red: hit.red, white: hit.white };
  const sum = { red: 0, white: 0 };
  for (let from = 0; ; from += TOTALS_PAGE) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('team, words')
      .eq('played_on', localDate)
      .not('team', 'is', null)
      .order('user_id')
      .order('event_key')
      .range(from, from + TOTALS_PAGE - 1);
    if (error) throw new Error(`${TABLE} totals: ${error.message}`);
    const rows = (data ?? []) as { team: KohakuTeam; words: number }[];
    for (const r of rows) sum[r.team] += r.words ?? 0;
    if (rows.length < TOTALS_PAGE) break;
  }
  totalsCache.set(localDate, { at: now, ...sum });
  return sum;
}

export function __resetKohakuCache() {
  totalsCache.clear();
}
