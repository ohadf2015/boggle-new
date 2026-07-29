/**
 * Ghost Rival API
 *
 * GET  — Fetch current weekly ghost rival status
 * POST — Update player's weekly rival score
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getOrCreateWeeklyRival, updateRivalScore } from '@/backend/modules/ghostRivalManager';
import { captureApiError } from '@/utils/sentry';

export async function GET(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'ghost-rival-get', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    const status = await getOrCreateWeeklyRival(userId);
    if (!status) {
      return NextResponse.json({ rival: null, player: { score: 0 }, weekEnd: null });
    }

    return NextResponse.json({
      rival: status.rival,
      player: status.player,
      weekEnd: status.weekEnd,
    });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'ghost-rival-get');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'ghost-rival-post', {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { userId, points } = body;

    if (!userId || typeof points !== 'number' || points <= 0) {
      return NextResponse.json({ error: 'Invalid userId or points' }, { status: 400 });
    }

    const result = await updateRivalScore(userId, points);
    if (!result) {
      return NextResponse.json({ error: 'No active rivalry' }, { status: 404 });
    }

    return NextResponse.json({ newScore: result.newScore });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'ghost-rival-post');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
