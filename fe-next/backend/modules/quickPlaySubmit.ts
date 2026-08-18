/**
 * Quick Play submit pipeline: validate vs recomputed perfect, persist,
 * award coins/XP, update rival + challenge rows, return the results payload.
 * Pure over an injected supabase-like client so it's unit-testable.
 */
import { buildQuickRound, type QuickMode } from './quickPlayRound';
import { awardCoinsServer } from '../services/economy/awardCoins';
import { updateRivalScore } from './ghostRivalManager';
import { savePlayerWord } from './supabase/words';
import logger from '../utils/logger';

type SupabaseLike = {
  rpc: (name: string, params?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => any;
};

export interface QuickSubmitInput {
  userId: string;
  mode: QuickMode;
  language: string;
  seed: string;
  score: number;
  wordsFound: number;
  durationMs: number;
  challengeId?: string;
  words?: Array<{ word: string; score: number }>;
}

export interface QuickSubmitOutcome {
  scorePct: number;
  coins: number;
  xp: number;
  percentileToday: number;
  /** Last 10 same-mode scorePct values (most recent first), for the improvement chip */
  history: number[];
  /** All-time sum of score_pct across every quick round — Quick Rank points */
  totalPoints: number;
}

const QUICK_XP_BASE = 20;
const QUICK_XP_PCT_FACTOR = 0.8; // 100% round = 100 XP total
const COINS_FLAT = 25;
const COINS_CAP = 200;
// Blast cascades legitimately exceed the initial-grid solver max; anything past
// 3x is a forged payload. Other modes cannot exceed perfect at all.
const BLAST_OVERSHOOT_LIMIT = 3;

export function quickPlayCoinsFor(scorePct: number): number {
  return Math.min(COINS_CAP, COINS_FLAT + Math.round(scorePct));
}

export async function processQuickSubmit(
  db: SupabaseLike,
  input: QuickSubmitInput
): Promise<QuickSubmitOutcome> {
  const { userId, mode, language, seed, score, challengeId, words } = input;

  const round = await buildQuickRound(mode, language, seed);
  const limit = mode === 'blast' ? round.perfectScore * BLAST_OVERSHOOT_LIMIT : round.perfectScore;
  if (!Number.isFinite(score) || score < 0 || score > limit) {
    throw new Error(`Implausible score ${score} for ${mode} round (perfect=${round.perfectScore})`);
  }

  const scorePct = Math.min(100, Math.round((score / round.perfectScore) * 100));

  const { error: insertError } = await db.from('quick_play_results').insert({
    user_id: userId,
    mode,
    seed,
    score,
    perfect_score: round.perfectScore,
    score_pct: scorePct,
  });
  if (insertError) throw new Error(`quick_play_results insert failed: ${insertError.message}`);

  // Save words to player's collection (best-effort, non-blocking)
  if (words && words.length > 0) {
    try {
      for (const w of words) {
        // ponytail: savePlayerWord is async but we don't await; words save in background
        savePlayerWord({
          word: w.word,
          language,
          gameCode: `quick-${mode}`,
          playerId: userId,
        }).catch(err => {
          logger.warn('QUICK_PLAY', `Failed to save word "${w.word}" for ${userId}: ${String(err)}`);
        });
      }
    } catch (err) {
      logger.warn('QUICK_PLAY', `Word collection save failed: ${String(err)}`);
    }
  }

  const coins = quickPlayCoinsFor(scorePct);
  await awardCoinsServer(userId, coins, 'quick_play_round', { mode, seed, scorePct });

  const xp = Math.round(QUICK_XP_BASE + scorePct * QUICK_XP_PCT_FACTOR);
  const { error: xpError } = await db.rpc('increment_player_xp', {
    p_player_id: userId,
    p_xp_amount: xp,
  });
  if (xpError) logger.error('QUICK_PLAY', `XP grant failed for ${userId}: ${xpError.message}`);

  // Weekly ghost rival keeps ticking from quick rounds too (best-effort)
  try {
    await updateRivalScore(userId, scorePct);
  } catch (e) {
    logger.warn('QUICK_PLAY', `rival update failed for ${userId}: ${String(e)}`);
  }

  if (challengeId) {
    await db.from('quick_play_challenges')
      .update({ accepted_by: userId, accepted_score: score, accepted_score_pct: scorePct })
      .eq('id', challengeId)
      .is('accepted_by', null);
  }

  const { data: pctData, error: pctError } = await db.rpc('quick_play_percentile_today', {
    p_score_pct: scorePct,
  });
  if (pctError) logger.warn('QUICK_PLAY', `percentile RPC failed: ${pctError.message}`);
  const percentileToday = Number(pctData ?? 0);

  // Quick Rank points: lifetime sum of score_pct (rank ladder computed client-side)
  const { data: sumRow } = await db.from('quick_play_results')
    .select('sum:score_pct.sum()')
    .eq('user_id', userId)
    .single();
  const totalPoints = Math.round(Number((sumRow as { sum: number | null } | null)?.sum ?? 0));

  const { data: historyRows } = await db.from('quick_play_results')
    .select('score_pct')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('created_at', { ascending: false })
    .limit(10);
  const history = (historyRows ?? []).map((r: { score_pct: number }) => Number(r.score_pct));

  return { scorePct, coins, xp, percentileToday, history, totalPoints };
}

export async function createQuickChallenge(
  db: SupabaseLike,
  args: { userId: string; mode: QuickMode; seed: string; score: number; scorePct: number }
): Promise<{ id: string }> {
  const { data, error } = await db.from('quick_play_challenges')
    .insert({
      challenger_id: args.userId,
      mode: args.mode,
      seed: args.seed,
      challenger_score: args.score,
      challenger_score_pct: args.scorePct,
    })
    .select('id')
    .single();
  if (error) throw new Error(`challenge insert failed: ${error.message}`);
  return { id: (data as { id: string }).id };
}
