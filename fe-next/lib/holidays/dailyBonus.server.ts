import type { SupabaseClient } from '@supabase/supabase-js';
import { awardCoinsServer } from '@/backend/services/economy/awardCoins';
import { markHolidayDayPlayed } from '@/lib/holidayEvent/progress.server';
import { eventKeyFor } from '@/lib/holidayEvent/rewards';
import type { LetterGrid } from '@/types';
import logger from '@/utils/logger';
import { CHRISTMAS_LOCALES, HOLIDAY_KEYS, windowFor, type HolidayKey } from './calendar';
import { holidayDailyPlan, settleHolidayWords } from './dailyBoard';
import { CRACKER_COINS, crackerJoke, dreidelCoins, rollDreidel, type DreidelFace } from './dailyDreidel';

const RESULTS = 'holiday_daily_results';

export interface HolidaySettlement {
  holiday: HolidayKey;
  puzzleDate: string;
  kind: 'nightly' | 'advent';
  day: number;
  geltWords: number;
  giftFound: boolean;
  coins: number;
  spinFace: DreidelFace | null;
  spinCoins: number | null;
  crackerJoke: number | null;
  crackerCoins: number | null;
  alreadySettled: boolean;
}

interface ResultRow {
  user_id: string;
  event_key: string;
  puzzle_date: string;
  kind: 'nightly' | 'advent';
  gelt_words: number;
  gift_found: boolean;
  coins: number;
  spin_face: DreidelFace | null;
  spin_coins: number | null;
  cracker_joke: number | null;
  cracker_coins: number | null;
}

function isHolidayKey(v: unknown): v is HolidayKey {
  return typeof v === 'string' && (HOLIDAY_KEYS as readonly string[]).includes(v);
}

function eventKeysFor(puzzleDate: string): string[] {
  const keys = new Set<string>();
  for (const k of HOLIDAY_KEYS) {
    for (const l of [null, ...CHRISTMAS_LOCALES]) {
      const win = windowFor(k, puzzleDate, l);
      if (win) keys.add(eventKeyFor(win));
    }
  }
  return [...keys];
}

async function award(userId: string, coins: number, meta: Record<string, string | number>): Promise<boolean> {
  if (coins <= 0) return true;
  return (await awardCoinsServer(userId, coins, 'holiday_event', meta)).success;
}

async function readResult(supabase: SupabaseClient, userId: string, eventKey: string, puzzleDate: string): Promise<ResultRow | null> {
  const { data, error } = await supabase
    .from(RESULTS)
    .select('*')
    .eq('user_id', userId)
    .eq('event_key', eventKey)
    .eq('puzzle_date', puzzleDate)
    .maybeSingle();
  if (error) throw new Error(`${RESULTS} read: ${error.message}`);
  return (data as ResultRow | null) ?? null;
}

function view(holiday: HolidayKey, day: number, row: ResultRow, alreadySettled: boolean): HolidaySettlement {
  return {
    holiday,
    puzzleDate: row.puzzle_date,
    kind: row.kind,
    day,
    geltWords: row.gelt_words,
    giftFound: row.gift_found,
    coins: row.coins,
    spinFace: row.spin_face ?? null,
    spinCoins: row.spin_coins ?? null,
    crackerJoke: row.cracker_joke ?? null,
    crackerCoins: row.cracker_coins ?? null,
    alreadySettled,
  };
}

export async function settleHolidayDaily(i: {
  supabase: SupabaseClient;
  userId: string;
  holiday: unknown;
  puzzleDate: string;
  language: string;
  grid: LetterGrid;
  words: readonly string[];
  isCatchup: boolean;
  isValidWord: (word: string) => boolean;
}): Promise<HolidaySettlement | null> {
  if (i.isCatchup || !isHolidayKey(i.holiday) || !i.grid?.length) return null;
  const win = windowFor(i.holiday, i.puzzleDate, i.language);
  const plan = win ? holidayDailyPlan({ holiday: i.holiday, puzzleDate: i.puzzleDate, language: i.language, grid: i.grid }) : null;
  if (!win || !plan) return null;

  const eventKey = eventKeyFor(win);
  const result = settleHolidayWords(plan, i.grid, i.words.filter(i.isValidWord));
  const row: ResultRow = {
    user_id: i.userId,
    event_key: eventKey,
    puzzle_date: i.puzzleDate,
    kind: plan.kind,
    gelt_words: result.geltWords.length,
    gift_found: result.giftFound,
    coins: result.coins,
    spin_face: null,
    spin_coins: null,
    cracker_joke: null,
    cracker_coins: null,
  };
  const { error } = await i.supabase.from(RESULTS).insert({ ...row, language: i.language });
  if (error) {
    if (error.code !== '23505') throw new Error(`${RESULTS} insert: ${error.message}`);
    const existing = await readResult(i.supabase, i.userId, eventKey, i.puzzleDate);
    return existing ? view(i.holiday, plan.day, existing, true) : null;
  }

  if (!(await award(i.userId, result.coins, { source: 'holiday_daily', date: i.puzzleDate }))) {
    await i.supabase.from(RESULTS).delete().eq('user_id', i.userId).eq('event_key', eventKey).eq('puzzle_date', i.puzzleDate);
    throw new Error(`holiday daily grant failed for ${i.userId} ${eventKey}/${i.puzzleDate}`);
  }

  try {
    const mark = await markHolidayDayPlayed({ supabase: i.supabase, userId: i.userId, holiday: i.holiday, localDate: i.puzzleDate });
    if ('index' in mark) {
      await i.supabase
        .from('holiday_event_progress')
        .update({ source: 'daily' })
        .eq('user_id', i.userId)
        .eq('event_key', eventKey)
        .eq('day_index', mark.index);
    }
  } catch (e) {
    logger.error('HOLIDAY_DAILY', `progress mark failed for ${i.userId}: ${(e as Error).message}`);
  }
  return view(i.holiday, plan.day, row, false);
}

async function claimOnce(
  supabase: SupabaseClient,
  row: ResultRow,
  column: 'spin_face' | 'cracker_joke',
  patch: Partial<ResultRow>,
): Promise<boolean> {
  const { data, error } = await supabase
    .from(RESULTS)
    .update(patch)
    .eq('user_id', row.user_id)
    .eq('event_key', row.event_key)
    .eq('puzzle_date', row.puzzle_date)
    .is(column, null)
    .select('user_id');
  if (error) throw new Error(`${RESULTS} claim: ${error.message}`);
  return Array.isArray(data) && data.length > 0;
}

async function release(supabase: SupabaseClient, row: ResultRow, patch: Partial<ResultRow>): Promise<void> {
  await supabase.from(RESULTS).update(patch).eq('user_id', row.user_id).eq('event_key', row.event_key).eq('puzzle_date', row.puzzle_date);
}

async function todaysRow(supabase: SupabaseClient, userId: string, puzzleDate: string, kind: ResultRow['kind']): Promise<ResultRow | null> {
  for (const eventKey of eventKeysFor(puzzleDate)) {
    const row = await readResult(supabase, userId, eventKey, puzzleDate);
    if (row?.kind === kind) return row;
  }
  return null;
}

export type SpinResult = { status: 'not_played' } | { status: 'spun' | 'already'; face: DreidelFace; coins: number };

export async function spinHolidayDreidel(i: {
  supabase: SupabaseClient;
  userId: string;
  puzzleDate: string;
  random?: () => number;
}): Promise<SpinResult> {
  const row = await todaysRow(i.supabase, i.userId, i.puzzleDate, 'nightly');
  if (!row) return { status: 'not_played' };
  if (row.spin_face) return { status: 'already', face: row.spin_face, coins: row.spin_coins ?? 0 };

  const face = rollDreidel(i.random);
  const coins = dreidelCoins(face, row.coins);
  if (!(await claimOnce(i.supabase, row, 'spin_face', { spin_face: face, spin_coins: coins }))) {
    const now = await readResult(i.supabase, i.userId, row.event_key, i.puzzleDate);
    return { status: 'already', face: now?.spin_face ?? face, coins: now?.spin_coins ?? 0 };
  }
  if (!(await award(i.userId, coins, { source: 'holiday_dreidel', date: i.puzzleDate, face }))) {
    await release(i.supabase, row, { spin_face: null, spin_coins: null });
    throw new Error(`dreidel coins failed for ${i.userId} ${i.puzzleDate}`);
  }
  return { status: 'spun', face, coins };
}

async function partnerFinished(supabase: SupabaseClient, userId: string, eventKey: string, puzzleDate: string): Promise<boolean> {
  const ids = new Set<string>();
  const { data: mine } = await supabase.from('holiday_table_members').select('table_id').eq('user_id', userId).eq('event_key', eventKey);
  const tableId = (mine as Array<{ table_id: string }> | null)?.[0]?.table_id;
  if (tableId) {
    const { data: mates } = await supabase.from('holiday_table_members').select('user_id').eq('table_id', tableId);
    for (const m of (mates as Array<{ user_id: string }> | null) ?? []) ids.add(m.user_id);
  }
  const [{ data: invited }, { data: inviters }] = await Promise.all([
    supabase.from('holiday_rescues').select('friend_id').eq('inviter_id', userId).eq('event_key', eventKey),
    supabase.from('holiday_rescues').select('inviter_id').eq('friend_id', userId).eq('event_key', eventKey),
  ]);
  for (const r of (invited as Array<{ friend_id: string }> | null) ?? []) ids.add(r.friend_id);
  for (const r of (inviters as Array<{ inviter_id: string }> | null) ?? []) ids.add(r.inviter_id);
  ids.delete(userId);
  if (!ids.size) return false;
  const { data } = await supabase
    .from('daily_word_hunt_attempts')
    .select('player_id')
    .in('player_id', [...ids])
    .eq('puzzle_date', puzzleDate)
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

export type CrackerResult = { status: 'not_played' | 'locked' } | { status: 'pulled' | 'already'; joke: number; coins: number };

export async function pullHolidayCracker(i: {
  supabase: SupabaseClient;
  userId: string;
  puzzleDate: string;
  random?: () => number;
}): Promise<CrackerResult> {
  const row = await todaysRow(i.supabase, i.userId, i.puzzleDate, 'advent');
  if (!row) return { status: 'not_played' };
  if (row.cracker_joke) return { status: 'already', joke: row.cracker_joke, coins: row.cracker_coins ?? 0 };
  if (!(await partnerFinished(i.supabase, i.userId, row.event_key, i.puzzleDate))) return { status: 'locked' };

  const joke = crackerJoke(i.random);
  if (!(await claimOnce(i.supabase, row, 'cracker_joke', { cracker_joke: joke, cracker_coins: CRACKER_COINS }))) {
    const now = await readResult(i.supabase, i.userId, row.event_key, i.puzzleDate);
    return { status: 'already', joke: now?.cracker_joke ?? joke, coins: now?.cracker_coins ?? 0 };
  }
  if (!(await award(i.userId, CRACKER_COINS, { source: 'holiday_cracker', date: i.puzzleDate }))) {
    await release(i.supabase, row, { cracker_joke: null, cracker_coins: null });
    throw new Error(`cracker coins failed for ${i.userId} ${i.puzzleDate}`);
  }
  return { status: 'pulled', joke, coins: CRACKER_COINS };
}
