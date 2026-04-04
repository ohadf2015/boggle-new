/**
 * Weekly Challenge API
 *
 * GET  — Fetch leaderboard for current week (top 50)
 * POST — Submit score for current week (upsert — keeps highest score)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient } from '@/utils/supabase/server';
import { getCurrentWeekId } from '@/lib/adventure/weeklyChallenge';
import { captureApiError } from '@/utils/sentry';

export async function GET(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'weekly-challenge-get', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const weekId = getCurrentWeekId();
    const supabase = await createClient();

    const { data: scores, error } = await supabase
      .from('weekly_challenge_scores')
      .select('score, words_found, longest_word, player_name, submitted_at')
      .eq('week_id', weekId)
      .order('score', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[WEEKLY CHALLENGE API] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Add rank
    const leaderboard = (scores ?? []).map((entry, i) => ({
      rank: i + 1,
      playerName: entry.player_name,
      score: entry.score,
      wordsFound: entry.words_found,
      longestWord: entry.longest_word,
      submittedAt: entry.submitted_at,
    }));

    return NextResponse.json({ weekId, leaderboard });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/weekly-challenge', { method: 'GET' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'weekly-challenge-post', {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { score, wordsFound, longestWord, playerName } = body;

    if (typeof score !== 'number' || score < 0 || score > 100000) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
    }
    if (typeof wordsFound !== 'number' || wordsFound < 0 || wordsFound > 500) {
      return NextResponse.json({ error: 'Invalid wordsFound' }, { status: 400 });
    }

    // Plausibility check: score must be roughly proportional to words found
    // A generous upper bound is ~200 points per word (long word + combo bonus)
    const maxPlausibleScore = wordsFound * 200;
    if (wordsFound > 0 && score > maxPlausibleScore) {
      return NextResponse.json({ error: 'Score implausible for words found' }, { status: 400 });
    }
    // Zero words but positive score is also implausible
    if (wordsFound === 0 && score > 0) {
      return NextResponse.json({ error: 'Score implausible for zero words' }, { status: 400 });
    }

    const weekId = getCurrentWeekId();
    const newScore = score as number;
    const rowData = {
      user_id: user.id,
      week_id: weekId,
      score: newScore,
      words_found: (wordsFound as number) || 0,
      longest_word: (typeof longestWord === 'string' ? longestWord : '').slice(0, 50),
      player_name: (typeof playerName === 'string' ? playerName : 'Adventurer').slice(0, 30),
      submitted_at: new Date().toISOString(),
    };

    // Step 1: Try to update only if new score is higher (atomic — no TOCTOU)
    const { data: updated, error: updateError } = await supabase
      .from('weekly_challenge_scores')
      .update(rowData)
      .eq('user_id', user.id)
      .eq('week_id', weekId)
      .lt('score', newScore)
      .select('score')
      .maybeSingle();

    if (updateError) {
      console.error('[WEEKLY CHALLENGE API] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
    }

    if (updated) {
      // Score was higher — row updated. Compute rank.
      const { count } = await supabase
        .from('weekly_challenge_scores')
        .select('*', { count: 'exact', head: true })
        .eq('week_id', weekId)
        .gt('score', newScore);
      return NextResponse.json({ success: true, updated: true, rank: (count ?? 0) + 1 });
    }

    // Step 2: No row updated — either no row exists (first submission) or existing score is higher.
    // Try insert; if conflict, existing is already >= newScore so we're done.
    const { error: insertError } = await supabase
      .from('weekly_challenge_scores')
      .insert(rowData);

    if (insertError) {
      // Conflict = row exists with higher or equal score
      if (insertError.code === '23505') {
        // Read current best for response
        const { data: existing } = await supabase
          .from('weekly_challenge_scores')
          .select('score')
          .eq('user_id', user.id)
          .eq('week_id', weekId)
          .single();
        return NextResponse.json({
          success: true,
          updated: false,
          currentBest: existing?.score ?? newScore,
        });
      }
      console.error('[WEEKLY CHALLENGE API] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
    }

    // First submission — compute rank
    const { count } = await supabase
      .from('weekly_challenge_scores')
      .select('*', { count: 'exact', head: true })
      .eq('week_id', weekId)
      .gt('score', newScore);
    return NextResponse.json({ success: true, updated: true, rank: (count ?? 0) + 1 });
  } catch (error) {
    captureApiError(error instanceof Error ? error : new Error(String(error)), '/api/adventure/weekly-challenge', { method: 'POST' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
