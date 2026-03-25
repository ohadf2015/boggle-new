/**
 * API Route: /api/game-mode-stats
 * Returns game mode popularity stats aggregated across all game tables.
 * Public endpoint — used by SSR landing page and admin dashboard.
 * Cached in-memory for 5 minutes to avoid hammering Supabase.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchGameModeStats, type GameModeStats } from '@/lib/landing/fetchGameModeStats';
import { checkApiRateLimit } from '@/lib/apiRateLimit';

// In-memory cache keyed by days (5 min TTL)
const statsCache = new Map<number, { stats: GameModeStats[]; timestamp: number }>();
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
  const cached = statsCache.get(days);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ stats: cached.stats });
  }

  const stats = await fetchGameModeStats(days);
  statsCache.set(days, { stats, timestamp: now });

  return NextResponse.json({ stats });
}
