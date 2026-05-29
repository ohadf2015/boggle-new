/**
 * API Route: /api/game-mode-stats
 * Returns game mode popularity stats aggregated across all game tables.
 * Public endpoint — used by SSR landing page and admin dashboard.
 * Cached in-memory for 5 minutes to avoid hammering Supabase.
 *
 * Response shape:
 *   {
 *     stats: GameModeStats[]      // Landing page bucket (unchanged for back-compat)
 *     mpBreakdown?: MpModeBreakdownStat[] // Admin MP breakdown (classic/blast/word-hunt/wheel-rush)
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchGameModeStats, type GameModeStats } from '@/lib/landing/fetchGameModeStats';
import { fetchMpModeBreakdown, type MpModeBreakdownStat } from '@/lib/admin/fetchMpModeBreakdown';
import { checkApiRateLimit } from '@/lib/apiRateLimit';

// In-memory cache keyed by days (5 min TTL)
export const statsCache = new Map<number, { stats: GameModeStats[]; mpBreakdown: MpModeBreakdownStat[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'game-mode-stats', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ stats: [], mpBreakdown: [] }, { status: 429 });
  }

  const days = Math.min(
    parseInt(request.nextUrl.searchParams.get('days') || '30', 10),
    90
  );

  const now = Date.now();
  const cached = statsCache.get(days);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(
      { stats: cached.stats, mpBreakdown: cached.mpBreakdown },
      {
        headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
      }
    );
  }

  const [stats, mpBreakdown] = await Promise.all([
    fetchGameModeStats(days),
    fetchMpModeBreakdown(days),
  ]);

  statsCache.set(days, { stats, mpBreakdown, timestamp: now });

  return NextResponse.json(
    { stats, mpBreakdown },
    {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
    }
  );
}
