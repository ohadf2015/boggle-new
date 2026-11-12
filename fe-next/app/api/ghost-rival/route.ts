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
import { getAuthedUser } from '@/lib/auth/getAuthedUser';

export async function GET(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, 'ghost-rival-get', {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const user = await getAuthedUser(request).catch(() => null);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = user.id;

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
    const user = await getAuthedUser(request).catch(() => null);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { points } = await request.json();

    if (typeof points !== 'number' || points <= 0) {
      return NextResponse.json({ error: 'Invalid points' }, { status: 400 });
    }

    const result = await updateRivalScore(user.id, points);
    if (!result) {
      // No rivalry this week is a normal state, not a missing resource: 200 so the
      // fire-and-forget sync doesn't surface as a 404 in FDT.
      return NextResponse.json({ newScore: null, rivalry: false });
    }

    return NextResponse.json({ newScore: result.newScore });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'ghost-rival-post');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
