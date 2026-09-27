/**
 * Blast Result API
 *
 * POST - Save a blast game result and update personal bests
 * GET  - Fetch recent blast results and personal bests for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { validateBlastResult, type PersonalBests } from '../utils';
import { captureApiError } from '@/utils/sentry';
import { processBlastCompletion } from './processCompletion';

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
    // Auth check (local-first JWT verify; read/write scoped to user.id below)
    const user = await getAuthedUser(request);
    if (!user) {
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

    // Persistence (shared with the offline-sync replay path).
    const result = await processBlastCompletion(data, userId, { supabase, source: 'route' });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, ...result.body });
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
    // Auth check (local-first JWT verify; read scoped to user.id below)
    const user = await getAuthedUser(request);
    if (!user) {
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
