/**
 * API Route: /api/admin/insights
 * Powers the admin dashboard "Insights" panel: day/hour activity heatmaps,
 * mode affinity ("players who played X also played Y"), records & deltas,
 * join-without-playing rate, and per-language word-quality.
 *
 * Single read-only round-trip to the admin_dashboard_insights() SQL function
 * (service-role; bypasses RLS). Cached in-memory for 5 minutes per `days`
 * window, mirroring /api/game-mode-stats — these are heavy aggregates and must
 * not run on every dashboard poll.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import type { InsightsBundle } from '@/lib/admin/insightsTypes';

const cache = new Map<number, { bundle: InsightsBundle; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const { searchParams } = new URL(request.url);
  const daysRaw = parseInt(searchParams.get('days') ?? '90', 10);
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 365) : 90;

  const now = Date.now();
  const cached = cache.get(days);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.bundle);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data, error } = await supabase.rpc('admin_dashboard_insights', { p_days: days });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bundle = data as InsightsBundle;
  cache.set(days, { bundle, timestamp: now });
  return NextResponse.json(bundle);
}
