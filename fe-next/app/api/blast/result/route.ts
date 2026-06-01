/**
 * Blast Result API
 *
 * POST - Save a blast game result and update personal bests
 * GET  - Fetch recent blast results and personal bests for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { validateBlastResult, calculatePersonalBests, type PersonalBests } from '../utils';
import { captureApiError } from '@/utils/sentry';
import { getPostHogServer } from '@/lib/posthog';
import { addToWeeklyLeaderboard, getLeaderboardPercentile } from '@/lib/blastLeaderboard';
import { leaderboardPointsForGame } from '@/backend/modules/leaderboardScoring';

// Lazy-init to avoid crash on missing env vars
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/**
 * POST /api/blast/result
 * Save a blast game result and update personal bests
 */
export async function POST(request: NextRequest) {
  // Rate limit: 20 requests per minute
  const rateLimitResult = checkApiRateLimit(request, 'blast-result', {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429 }
    );
  }

  try {
    // Auth check
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Parse and validate
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateBlastResult(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data;
    const config = getSupabaseConfig();
    if (!config) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
    const supabase = createServiceClient(config.url, config.key);

    // Insert game result and fetch personal bests in parallel
    const [insertResult, bestsResult] = await Promise.all([
      supabase
        .from('blast_results')
        .insert({
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
      // PGRST205 / 42P01 = table/view not found — migration hasn't been applied yet
      if (insertError.code === 'PGRST205' || insertError.code === '42P01' || insertError.message?.includes('not found in the schema cache')) {
        console.warn('[BLAST API] blast_results table not found (migration pending). Skipping save.');
        return NextResponse.json({ success: true, personalBests: null, isNewBestScore: false, isNewBestCombo: false, migrationPending: true });
      }
      console.error('[BLAST API] Insert result error:', insertError.message, insertError.code, { userId, difficulty: data.difficulty, score: data.score });
      return NextResponse.json({ error: `Failed to save result: ${insertError.code || 'unknown'}` }, { status: 500 });
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

    // Calculate updated personal bests
    const updated = calculatePersonalBests(existing, {
      score: data.score,
      clearPercentage: data.clearPercentage,
      maxCombo: data.maxCombo,
      wordsFound: data.wordsFound.length,
    });

    // Upsert personal bests
    const { error: upsertError } = await supabase
      .from('blast_personal_bests')
      .upsert(
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
        { onConflict: 'user_id,difficulty' }
      );

    if (upsertError) {
      console.error('[BLAST API] Upsert personal bests error:', upsertError);
      // Non-fatal — result was saved, just bests update failed
    }

    // Check for new records
    const isNewBestScore = !existing || data.score > existing.bestScore;
    const isNewBestCombo = !existing || data.maxCombo > existing.bestMaxCombo;

    // Update profile stats so blast scores contribute to the main leaderboard
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_score, total_games, total_words')
        .eq('id', userId)
        .single();

      if (profile) {
        // Blast is casual free-play: its leaderboard contribution is down-weighted
        // so the Daily Challenge stays the dominant point source. Raw score is
        // preserved in blast_results / personal bests above.
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

    // Award XP based on difficulty and score performance.
    // Per-difficulty cap preserves the progression gradient — previously a flat
    // 150 cap meant a great Easy run earned as much as a great Hard run.
    const BLAST_XP_BASE: Record<string, number> = { easy: 30, medium: 50, hard: 80 };
    const BLAST_XP_CAP: Record<string, number> = { easy: 100, medium: 175, hard: 250 };
    const baseXp = BLAST_XP_BASE[data.difficulty] ?? 30;
    const cap = BLAST_XP_CAP[data.difficulty] ?? 100;
    const scoreBonus = Math.min(cap - baseXp, Math.floor(data.score / 100));
    const xpToAward = Math.min(Math.round(baseXp + scoreBonus), cap);
    let xpAwarded = 0;

    if (xpToAward > 0) {
      const { data: xpData, error: xpError } = await supabase
        .rpc('increment_player_xp', {
          p_player_id: userId,
          p_xp_amount: xpToAward,
        });

      if (xpError) {
        console.error('[BLAST API] XP award error (non-fatal):', xpError);
      } else if (xpData && (xpData as unknown[]).length > 0) {
        xpAwarded = (xpData as Record<string, unknown>[])[0].xp_granted as number ?? xpToAward;
      } else {
        xpAwarded = xpToAward;
      }
    }

    // Weekly leaderboard: record score + compute player's percentile.
    // Both calls are internally fault-tolerant — Redis downtime returns null, never throws.
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
      },
    });

    return NextResponse.json({
      success: true,
      personalBests: updated,
      previousBest: existing?.bestScore ?? null,
      isNewBestScore,
      isNewBestCombo,
      xpAwarded,
      percentile,
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/blast/result', { method: 'POST' });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[BLAST API] Error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/blast/result
 * Fetch recent blast results and personal bests
 */
export async function GET(request: Request) {
  try {
    // Auth check
    const authSupabase = await createClient();
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const config = getSupabaseConfig();
    if (!config) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
    const supabase = createServiceClient(config.url, config.key);

    // Parse optional difficulty filter from query
    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get('difficulty');

    // Fetch recent results (last 20)
    let resultsQuery = supabase
      .from('blast_results')
      .select('score, tiles_cleared, total_tiles, clear_percentage, words_found, best_word, max_combo, stars, difficulty, language, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (difficulty) {
      resultsQuery = resultsQuery.eq('difficulty', difficulty);
    }

    const { data: results, error: resultsError } = await resultsQuery;

    if (resultsError) {
      console.error('[BLAST API] Fetch results error:', resultsError);
      return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
    }

    // Fetch personal bests (all difficulties)
    const { data: bests, error: bestsError } = await supabase
      .from('blast_personal_bests')
      .select('difficulty, best_score, best_clear_percentage, best_max_combo, total_games, total_words, updated_at')
      .eq('user_id', userId);

    if (bestsError) {
      console.error('[BLAST API] Fetch personal bests error:', bestsError);
    }

    // Transform results to camelCase
    const transformedResults = (results || []).map(r => ({
      score: r.score,
      tilesCleared: r.tiles_cleared,
      totalTiles: r.total_tiles,
      clearPercentage: r.clear_percentage,
      wordsFound: r.words_found,
      bestWord: r.best_word,
      maxCombo: r.max_combo,
      stars: r.stars,
      difficulty: r.difficulty,
      language: r.language,
      createdAt: r.created_at,
    }));

    // Transform personal bests to camelCase, keyed by difficulty
    const personalBests: Record<string, PersonalBests & { updatedAt: string }> = {};
    for (const b of bests || []) {
      personalBests[b.difficulty] = {
        bestScore: b.best_score,
        bestClearPercentage: b.best_clear_percentage,
        bestMaxCombo: b.best_max_combo,
        totalGames: b.total_games,
        totalWords: b.total_words,
        updatedAt: b.updated_at,
      };
    }

    return NextResponse.json({
      success: true,
      results: transformedResults,
      personalBests,
    });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/blast/result', { method: 'GET' });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[BLAST API] Error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
