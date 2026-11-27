import { randomInt } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { awardCoinsServer } from '@/backend/services/economy/awardCoins';
import { validateWordOnServer } from '@/lib/wordValidation/serverDicts';
import { BadRequest } from '../holidayRoute.server';
import type { HolidayInput } from '../holidayRequest.server';
import { playFits, playKey, scoreBound } from './content';
import { buildContent } from './content.server';
import { ARCADE_GAMES, DAILY_COIN_CAP, isArcadeGame, roundCoins, type ArcadeGameId, type ArcadePlay } from './games';
import { wordLength } from './letters';

const TABLE = 'holiday_arcade_rounds';
const MIN_SECONDS = 8;
const MAX_SECONDS = 20 * 60;
const MAX_POINTS_PER_SECOND = 40;
const MAX_PLAYS = 200;

export async function startRound(supabase: SupabaseClient, userId: string | null, input: HolidayInput, game: unknown) {
  if (!isArcadeGame(game) || ARCADE_GAMES[game].holiday !== input.holiday) throw new BadRequest('Unknown arcade game');
  const seed = randomInt(1, 2 ** 31 - 1);
  const content = await buildContent(game, input.locale, seed);
  let roundId: string | null = null;
  if (userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ user_id: userId, event_key: input.eventKey, game, lang: input.locale, seed, played_on: input.localDate })
      .select('id')
      .single();
    if (error) throw new Error(`${TABLE} insert: ${error.message}`);
    roundId = (data as { id: string }).id;
  }
  return { roundId, game, lang: input.locale, seconds: ARCADE_GAMES[game].seconds, content };
}

interface RoundRow {
  id: string;
  game: ArcadeGameId;
  lang: string;
  seed: number;
  started_at: string;
  finished_at: string | null;
  coins: number;
  score: number | null;
}

function cleanPlays(raw: unknown): ArcadePlay[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_PLAYS)
    .filter((p): p is ArcadePlay => !!p && typeof p === 'object' && typeof (p as ArcadePlay).w === 'string')
    .map((p) => ({ w: p.w.slice(0, 20), ...(Number.isInteger(p.i) ? { i: p.i } : {}) }));
}

async function acceptedLengths(row: RoundRow, content: unknown, plays: ArcadePlay[]): Promise<number[]> {
  const seen = new Set<string>();
  const fits = plays.filter((p) => {
    const key = playKey(row.game, p, row.lang);
    if (seen.has(key) || !playFits(row.game, content, p, row.lang)) return false;
    seen.add(key);
    return true;
  });
  const real = row.game === 'snowball' ? fits.map(() => true) : await Promise.all(fits.map((p) => validateWordOnServer(p.w.toLowerCase(), row.lang)));
  return fits.filter((_, i) => real[i]).map((p) => wordLength(p.w, row.lang));
}

export async function finishRound(
  supabase: SupabaseClient,
  userId: string,
  _input: HolidayInput,
  body: { roundId?: unknown; plays?: unknown; score?: unknown },
  now: Date = new Date(),
) {
  if (typeof body.roundId !== 'string') throw new BadRequest('Missing round');
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, game, lang, seed, started_at, finished_at, coins, score')
    .eq('id', body.roundId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`${TABLE} read: ${error.message}`);
  const row = data as RoundRow | null;
  if (!row) throw new BadRequest('Unknown round');
  if (row.finished_at) return { status: 'already' as const, score: row.score ?? 0, coins: row.coins };

  const elapsed = (now.getTime() - Date.parse(row.started_at)) / 1000;
  if (elapsed < MIN_SECONDS) throw new BadRequest('Round too short');

  const content = await buildContent(row.game, row.lang, row.seed);
  const lengths = elapsed > MAX_SECONDS ? [] : await acceptedLengths(row, content, cleanPlays(body.plays));
  const claimed = Math.max(0, Math.floor(Number(body.score) || 0));
  const score = Math.floor(Math.min(claimed, scoreBound(row.game, content, lengths), elapsed * MAX_POINTS_PER_SECOND));
  const earned = elapsed > MAX_SECONDS ? 0 : roundCoins(score);

  const { data: granted, error: rpcErr } = await supabase.rpc('holiday_arcade_settle', {
    p_round: row.id, p_user: userId, p_score: score, p_coins: earned, p_cap: DAILY_COIN_CAP,
  });
  if (rpcErr) throw new Error(`holiday_arcade_settle: ${rpcErr.message}`);
  const coins = Number(granted);
  if (coins < 0) return { status: 'already' as const, score, coins: 0 };

  if (coins > 0) {
    const award = await awardCoinsServer(userId, coins, 'holiday_event', { kind: 'arcade', game: row.game });
    if (!award.success) {
      await supabase.from(TABLE).update({ coins: 0 }).eq('id', row.id);
      return { status: 'settled' as const, score, coins: 0, capped: false, coinError: true, accepted: lengths.length };
    }
  }
  return { status: 'settled' as const, score, coins, capped: coins < earned, accepted: lengths.length };
}
