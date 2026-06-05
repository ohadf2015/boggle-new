/**
 * Blast completion persistence, extracted from the POST /api/blast/result route
 * so it can ALSO run on the offline-sync path (app/api/scores/sync) — a queued
 * Blast result replayed on reconnect must persist identically to a live submit.
 *
 * Behavior is preserved verbatim from the route (verified by the route's own
 * test). The caller owns auth, JSON parsing, validation, and the service-role
 * Supabase client; this owns the writes (result row, personal bests, profile
 * stats, XP, weekly leaderboard) and the result shape.
 *
 * Returns a discriminated result so callers map outcomes themselves:
 *  - { ok: true, body } — route → 200 { success: true, ...body }; sync → award
 *  - { ok: false, status, error } — route → status+error; sync → AwardError,
 *    where status>=500 is retryable (transient) and <500 is permanent.
 */
import { calculatePersonalBests, type PersonalBests } from '../utils';
import { getPostHogServer } from '@/lib/posthog';
import { addToWeeklyLeaderboard, getLeaderboardPercentile } from '@/lib/blastLeaderboard';
import { leaderboardPointsForGame } from '@/backend/modules/leaderboardScoring';

// Minimal structural type for the service-role client (matches the route's use).
type SupabaseLike = any;

export interface BlastResultData {
  score: number;
  tilesCleared: number;
  totalTiles: number;
  clearPercentage: number;
  wordsFound: string[];
  bestWord: string;
  maxCombo: number;
  stars: number;
  difficulty: string;
  language: string;
}

export interface BlastCompletionBody {
  personalBests: PersonalBests | null;
  previousBest: number | null;
  isNewBestScore: boolean;
  isNewBestCombo: boolean;
  xpAwarded: number;
  percentile: number | null;
  migrationPending?: boolean;
}

export type ProcessBlastResult =
  | { ok: true; body: BlastCompletionBody }
  | { ok: false; status: number; error: string };

export interface ProcessBlastContext {
  supabase: SupabaseLike;
  source?: 'route' | 'offline-sync';
}

const BLAST_XP_BASE: Record<string, number> = { easy: 30, medium: 50, hard: 80 };
const BLAST_XP_CAP: Record<string, number> = { easy: 100, medium: 175, hard: 250 };

export async function processBlastCompletion(
  data: BlastResultData,
  userId: string,
  ctx: ProcessBlastContext,
): Promise<ProcessBlastResult> {
  const { supabase } = ctx;

  // Insert game result and fetch personal bests in parallel.
  const [insertResult, bestsResult] = await Promise.all([
    supabase.from('blast_results').insert({
      user_id: userId,
      score: data.score,
      tiles_cleared: data.tilesCleared,
      total_tiles: data.totalTiles,
      clear_percentage: data.clearPercentage,
      words_found: data.wordsFound.length,
      best_word: data.bestWord,
      max_combo: data.maxCombo,
      stars: data.stars,
      difficulty: data.difficulty,
      language: data.language,
    }),
    supabase
      .from('blast_personal_bests')
      .select('best_score, best_clear_percentage, best_max_combo, total_games, total_words')
      .eq('user_id', userId)
      .eq('difficulty', data.difficulty)
      .single(),
  ]);

  const { error: insertError } = insertResult;
  if (insertError) {
    // PGRST205 / 42P01 = table/view not found — migration not applied yet.
    if (
      insertError.code === 'PGRST205' ||
      insertError.code === '42P01' ||
      insertError.message?.includes('not found in the schema cache')
    ) {
      console.warn('[BLAST API] blast_results table not found (migration pending). Skipping save.');
      return {
        ok: true,
        body: {
          personalBests: null,
          previousBest: null,
          isNewBestScore: false,
          isNewBestCombo: false,
          xpAwarded: 0,
          percentile: null,
          migrationPending: true,
        },
      };
    }
    console.error('[BLAST API] Insert result error:', insertError.message, insertError.code, {
      userId,
      difficulty: data.difficulty,
      score: data.score,
    });
    return { ok: false, status: 500, error: `Failed to save result: ${insertError.code || 'unknown'}` };
  }

  const { data: existingBests } = bestsResult;

  const existing: PersonalBests | null = existingBests
    ? {
        bestScore: existingBests.best_score,
        bestClearPercentage: existingBests.best_clear_percentage,
        bestMaxCombo: existingBests.best_max_combo,
        totalGames: existingBests.total_games,
        totalWords: existingBests.total_words,
      }
    : null;

  const updated = calculatePersonalBests(existing, {
    score: data.score,
    clearPercentage: data.clearPercentage,
    maxCombo: data.maxCombo,
    wordsFound: data.wordsFound.length,
  });

  const { error: upsertError } = await supabase.from('blast_personal_bests').upsert(
    {
      user_id: userId,
      difficulty: data.difficulty,
      best_score: updated.bestScore,
      best_clear_percentage: updated.bestClearPercentage,
      best_max_combo: updated.bestMaxCombo,
      total_games: updated.totalGames,
      total_words: updated.totalWords,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,difficulty' },
  );
  if (upsertError) {
    console.error('[BLAST API] Upsert personal bests error:', upsertError);
    // Non-fatal — result was saved, just bests update failed.
  }

  const isNewBestScore = !existing || data.score > existing.bestScore;
  const isNewBestCombo = !existing || data.maxCombo > existing.bestMaxCombo;

  // Update profile stats so blast scores contribute to the main leaderboard.
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_score, total_games, total_words')
      .eq('id', userId)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({
          total_score: (profile.total_score || 0) + leaderboardPointsForGame('blast', data.score),
          total_games: (profile.total_games || 0) + 1,
          total_words: (profile.total_words || 0) + data.wordsFound.length,
          last_game_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }
  } catch (profileError) {
    console.error('[BLAST API] Profile stats update error (non-fatal):', profileError);
  }

  // Award XP — per-difficulty cap preserves the progression gradient.
  const baseXp = BLAST_XP_BASE[data.difficulty] ?? 30;
  const cap = BLAST_XP_CAP[data.difficulty] ?? 100;
  const scoreBonus = Math.min(cap - baseXp, Math.floor(data.score / 100));
  const xpToAward = Math.min(Math.round(baseXp + scoreBonus), cap);
  let xpAwarded = 0;

  if (xpToAward > 0) {
    const { data: xpData, error: xpError } = await supabase.rpc('increment_player_xp', {
      p_player_id: userId,
      p_xp_amount: xpToAward,
    });
    if (xpError) {
      console.error('[BLAST API] XP award error (non-fatal):', xpError);
    } else if (xpData && (xpData as unknown[]).length > 0) {
      xpAwarded = ((xpData as Record<string, unknown>[])[0].xp_granted as number) ?? xpToAward;
    } else {
      xpAwarded = xpToAward;
    }
  }

  // Weekly leaderboard — both calls are internally fault-tolerant (null, never throw).
  await addToWeeklyLeaderboard(userId, data.score, data.language, data.difficulty);
  const percentile = await getLeaderboardPercentile(userId, data.language, data.difficulty);

  getPostHogServer()?.capture({
    distinctId: userId,
    event: 'blast_completed',
    properties: {
      difficulty: data.difficulty,
      score: data.score,
      stars: data.stars,
      is_new_best_score: isNewBestScore,
      xp_awarded: xpAwarded,
      percentile,
      source: ctx.source ?? 'route',
    },
  });

  return {
    ok: true,
    body: {
      personalBests: updated,
      previousBest: existing?.bestScore ?? null,
      isNewBestScore,
      isNewBestCombo,
      xpAwarded,
      percentile,
    },
  };
}
