/**
 * API Route: /api/game-mode-stats
 * Returns game mode popularity stats aggregated across all game tables.
 * Public endpoint — used by SSR landing page and admin dashboard.
 * Cached in-memory for 5 minutes to avoid hammering Supabase.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchGameModeStats, type GameModeStats } from '@/lib/landing/fetchGameModeStats';
import { checkApiRateLimit } from '@/lib/apiRateLimit';

// In-memory cache (5 min TTL)
let cachedStats: GameModeStats[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'game-mode-stats', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ stats: [] }, { status: 429 });
  }

  const days = Math.min(
    parseInt(request.nextUrl.searchParams.get('days') || '30', 10),
    90
  );

  const now = Date.now();
  if (cachedStats && now - cacheTimestamp < CACHE_TTL_MS) {
    return NextResponse.json({ stats: cachedStats });
  }

  const stats = await fetchGameModeStats(days);
  cachedStats = stats;
  cacheTimestamp = now;

  return NextResponse.json({ stats });
}
