/**
 * API Route: /api/admin/guests/[sessionId]
 * Returns full detail for one guest session: profile metadata + recent games
 * across all game types.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { sessionId } = await context.params;
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('guest_sessions')
      .select(
        'session_id, device_type, browser, language, utm_source, utm_medium, utm_campaign, referrer, country, first_visit_at, last_visit_at, user_id, linked_at, created_at',
      )
      .eq('session_id', sessionId)
      .maybeSingle();

    if (profileError) {
      console.error('[admin/guests/:id] profile error', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const [
      { data: gsData },
      { data: whData },
      { data: dpData },
    ] = await Promise.all([
      supabase
        .from('game_sessions')
        .select(
          'id, mode, language, score, words_found, room_code, final_rank, duration_seconds, started_at, completed_at, completed, difficulty, device_type, browser, country, referrer_source, is_first_game, player_count, tokens_earned, tokens_spent, clues_used',
        )
        .eq('guest_session_id', sessionId)
        .order('started_at', { ascending: false })
        .limit(200),
      supabase
        .from('daily_word_hunt_attempts')
        .select(
          'id, language, puzzle_number, solved, attempts_used, target_word, words_discovered, efficiency_score, completed_at, created_at',
        )
        .eq('guest_fingerprint', sessionId)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('daily_puzzle_attempts')
        .select(
          'id, puzzle_number, language, score, word_count, time_seconds, longest_word, completed_at',
        )
        .eq('guest_fingerprint', sessionId)
        .order('completed_at', { ascending: false })
        .limit(200),
    ]);

    return NextResponse.json({
      success: true,
      profile: profile ?? { session_id: sessionId, missing: true },
      gameSessions: gsData || [],
      wordHuntAttempts: whData || [],
      dailyPuzzleAttempts: dpData || [],
    });
  } catch (error) {
    console.error('[admin/guests/:id] error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
