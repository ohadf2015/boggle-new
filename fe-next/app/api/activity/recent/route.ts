/**
 * API Route: /api/activity/recent
 * Public endpoint returning recent game activity for the live ticker.
 * Returns anonymized events — no user IDs, just display names and game stats.
 * In-memory cached for 30s + queries run in parallel.
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
  /** @deprecated Use detailData for translated rendering */
  detail: string;
  /** Structured data for client-side i18n formatting */
  detailData?: Record<string, string | number>;
  timestamp: string;
}

type ProfileRef = { display_name?: string | null; username?: string | null } | null | undefined;
function pickProfile(p: unknown): ProfileRef {
  if (Array.isArray(p)) return p[0] as ProfileRef;
  return p as ProfileRef;
}

// ── In-memory cache (30s TTL) ──
let cachedEvents: ActivityEvent[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

export async function GET(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'activity-recent', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ events: [] }, { status: 429 });
  }

  // Return cached data if fresh
  if (cachedEvents && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return NextResponse.json(
      { events: cachedEvents },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    );
  }

  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.json({ events: [] });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(config.url, config.key);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Run ALL 5 queries in parallel instead of sequentially
    const [mpWinsResult, dailySolvesResult, whSolvesResult, blastScoresResult, longWordsResult] = await Promise.all([
      supabase
        .from('game_results')
        .select('score, word_count, longest_word, created_at, profiles:player_id(display_name, username)')
        .eq('placement', 1)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5),

      supabase
        .from('daily_puzzle_attempts')
        .select('score, word_count, longest_word, completed_at, profiles:player_id(display_name, username)')
        .gte('completed_at', since)
        .order('completed_at', { ascending: false })
        .limit(5),

      supabase
        .from('daily_word_hunt_attempts')
        .select('target_word, attempts_used, solved, completed_at, created_at, profiles:player_id(display_name, username)')
        .eq('solved', true)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5),

      supabase
        .from('blast_results')
        .select('score, tiles_cleared, max_combo, stars, difficulty, created_at, profiles:user_id(display_name, username)')
        .gte('stars', 3)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5),

      supabase
        .from('game_results')
        .select('longest_word, score, created_at, profiles:player_id(display_name, username)')
        .gte('created_at', since)
        .not('longest_word', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const events: ActivityEvent[] = [];

    for (const g of mpWinsResult.data || []) {
      const profile = pickProfile(g.profiles);
      const name = profile?.display_name || profile?.username || 'Someone';
      events.push({
        type: 'multiplayer_win',
        playerName: name,
        detail: `scored ${g.score} pts with ${g.word_count} words`,
        detailData: { score: g.score, count: g.word_count },
        timestamp: g.created_at,
      });
    }

    for (const d of dailySolvesResult.data || []) {
      const profile = pickProfile(d.profiles);
      const name = profile?.display_name || profile?.username || 'A player';
      events.push({
        type: 'daily_solved',
        playerName: name,
        detail: d.longest_word
          ? `found "${d.longest_word.toUpperCase()}" (${d.score} pts)`
          : `scored ${d.score} pts`,
        detailData: d.longest_word
          ? { word: d.longest_word.toUpperCase(), score: d.score }
          : { score: d.score },
        timestamp: d.completed_at,
      });
    }

    for (const w of whSolvesResult.data || []) {
      const profile = pickProfile(w.profiles);
      const name = profile?.display_name || profile?.username || 'A detective';
      events.push({
        type: 'word_hunt_solved',
        playerName: name,
        detail: `cracked the target word in ${w.attempts_used} tries`,
        detailData: { tries: w.attempts_used },
        timestamp: w.completed_at || w.created_at,
      });
    }

    for (const b of blastScoresResult.data || []) {
      const profile = pickProfile(b.profiles);
      const name = profile?.display_name || profile?.username || 'A blaster';
      events.push({
        type: 'blast_highscore',
        playerName: name,
        detail: `cleared ${b.tiles_cleared} tiles with a ${b.max_combo}x combo`,
        detailData: { tiles: b.tiles_cleared, combo: b.max_combo },
        timestamp: b.created_at,
      });
    }

    for (const lw of longWordsResult.data || []) {
      if (lw.longest_word && lw.longest_word.length >= 7) {
        const profile = pickProfile(lw.profiles);
        const name = profile?.display_name || profile?.username || 'A wordsmith';
        events.push({
          type: 'long_word',
          playerName: name,
          detail: `found "${lw.longest_word.toUpperCase()}" (${lw.longest_word.length} letters!)`,
          detailData: { word: lw.longest_word.toUpperCase(), length: lw.longest_word.length },
          timestamp: lw.created_at,
        });
      }
    }

    // Shuffle and limit to 15 events for variety
    const shuffled = events
      .sort(() => Math.random() - 0.5)
      .slice(0, 15);

    // Update in-memory cache
    cachedEvents = shuffled;
    cacheTimestamp = Date.now();

    return NextResponse.json(
      { events: shuffled },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    );
  } catch (error) {
    console.error('[activity/recent] Error:', error);
    return NextResponse.json({ events: [] });
  }
}
