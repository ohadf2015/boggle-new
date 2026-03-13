/**
 * Blast Result API
 *
 * POST - Save a blast game result and update personal bests
 * GET  - Fetch recent blast results and personal bests for current user
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { validateBlastResult, calculatePersonalBests, type PersonalBests } from '../utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/blast/result
 * Save a blast game result and update personal bests
 */
export async function POST(request: Request) {
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
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Insert game result
    const { error: insertError } = await supabase
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
      });

    if (insertError) {
      console.error('[BLAST API] Insert result error:', insertError.message, insertError.code, { userId, difficulty: data.difficulty, score: data.score });
      return NextResponse.json({ error: `Failed to save result: ${insertError.code || 'unknown'}` }, { status: 500 });
    }

    // Fetch existing personal bests for this difficulty
    const { data: existingBests } = await supabase
      .from('blast_personal_bests')
      .select('best_score, best_clear_percentage, best_max_combo, total_games, total_words')
      .eq('user_id', userId)
      .eq('difficulty', data.difficulty)
      .single();

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

    return NextResponse.json({
      success: true,
      personalBests: updated,
      isNewBestScore,
      isNewBestCombo,
    });
  } catch (error) {
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
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[BLAST API] Error:', errorMessage);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
