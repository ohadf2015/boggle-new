/**
 * API Route: /api/activity/recent
 * Public endpoint returning recent game activity for the live ticker.
 * Returns anonymized events — no user IDs, just display names and game stats.
 * Cached for 30s to avoid hammering the DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';

// Lazy-init to avoid crash on missing env vars
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export interface ActivityEvent {
  type: 'multiplayer_win' | 'daily_solved' | 'word_hunt_solved' | 'blast_highscore' | 'long_word' | 'streak';
  playerName: string;
  detail: string;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'activity-recent', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ events: [] }, { status: 429 });
  }

  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json({ events: [] });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(config.url, config.key);

    const events: ActivityEvent[] = [];
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Recent multiplayer wins (placement = 1)
    const { data: mpWins } = await supabase
      .from('game_results')
      .select('score, word_count, longest_word, created_at, profiles:player_id(display_name, username)')
      .eq('placement', 1)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5);

    for (const g of mpWins || []) {
      const profile = g.profiles as any;
      const name = profile?.display_name || profile?.username || 'Someone';
      events.push({
        type: 'multiplayer_win',
        playerName: name,
        detail: `scored ${g.score} pts with ${g.word_count} words`,
        timestamp: g.created_at,
      });
    }

    // 2. Daily challenge completions
    const { data: dailySolves } = await supabase
      .from('daily_puzzle_attempts')
      .select('score, word_count, longest_word, completed_at, profiles:player_id(display_name, username)')
      .gte('completed_at', since)
      .order('completed_at', { ascending: false })
      .limit(5);

    for (const d of dailySolves || []) {
      const profile = d.profiles as any;
      const name = profile?.display_name || profile?.username || 'A player';
      events.push({
        type: 'daily_solved',
        playerName: name,
        detail: d.longest_word
          ? `found "${d.longest_word.toUpperCase()}" (${d.score} pts)`
          : `scored ${d.score} pts`,
        timestamp: d.completed_at,
      });
    }

    // 3. Word Hunt solves
    const { data: whSolves } = await supabase
      .from('daily_word_hunt_attempts')
      .select('target_word, attempts_used, solved, completed_at, created_at, profiles:player_id(display_name, username)')
      .eq('solved', true)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5);

    for (const w of whSolves || []) {
      const profile = w.profiles as any;
      const name = profile?.display_name || profile?.username || 'A detective';
      events.push({
        type: 'word_hunt_solved',
        playerName: name,
        detail: `cracked the target word in ${w.attempts_used} tries`,
        timestamp: w.completed_at || w.created_at,
      });
    }

    // 4. Blast high scores (stars >= 3)
    const { data: blastScores } = await supabase
      .from('blast_results')
      .select('score, tiles_cleared, max_combo, stars, difficulty, created_at, profiles:user_id(display_name, username)')
      .gte('stars', 3)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5);

    for (const b of blastScores || []) {
      const profile = b.profiles as any;
      const name = profile?.display_name || profile?.username || 'A blaster';
      events.push({
        type: 'blast_highscore',
        playerName: name,
        detail: `cleared ${b.tiles_cleared} tiles with a ${b.max_combo}x combo`,
        timestamp: b.created_at,
      });
    }

    // 5. Long words found (7+ letters) from game results
    const { data: longWords } = await supabase
      .from('game_results')
      .select('longest_word, score, created_at, profiles:player_id(display_name, username)')
      .gte('created_at', since)
      .not('longest_word', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    for (const lw of longWords || []) {
      if (lw.longest_word && lw.longest_word.length >= 7) {
        const profile = lw.profiles as any;
        const name = profile?.display_name || profile?.username || 'A wordsmith';
        events.push({
          type: 'long_word',
          playerName: name,
          detail: `found "${lw.longest_word.toUpperCase()}" (${lw.longest_word.length} letters!)`,
          timestamp: lw.created_at,
        });
      }
    }

    // Shuffle and limit to 15 events for variety
    const shuffled = events
      .sort(() => Math.random() - 0.5)
      .slice(0, 15);

    return NextResponse.json(
      { events: shuffled },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('[activity/recent] Error:', error);
    return NextResponse.json({ events: [] });
  }
}
