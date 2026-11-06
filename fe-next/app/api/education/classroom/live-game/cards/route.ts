import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import logger from '@/utils/logger';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { lookupLiveClassroomGame } from '@/lib/education/classroomGameLookup';
import { foldJoinCode } from '@/lib/education/joinCodeInput';

const querySchema = z.object({ code: z.string().min(1).max(10) });

/**
 * GET /api/education/classroom/live-game/cards?code=ABC123
 *
 * The lesson's study cards for the projector wall. Teacher-only, unlike the sibling
 * `live-game` route, which is open to logged-out phones and so carries no words.
 *
 * 200 { cards } · 204 no live game · 400 bad code · 401 no session · 403 not this room's teacher · 429
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = checkApiRateLimit(request, 'classroom-live-game-cards', {
      maxRequests: 30,
      windowMs: 60_000,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const parsed = querySchema.safeParse({ code: request.nextUrl.searchParams.get('code') });
    const code = parsed.success ? foldJoinCode(parsed.data.code) : '';
    if (code.length !== 6 || !/^[A-Z0-9]+$/.test(code)) {
      return NextResponse.json({ error: 'Invalid game code' }, { status: 400 });
    }

    const user = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const game = await lookupLiveClassroomGame(code);
    if (!game) return new NextResponse(null, { status: 204 });
    if (!game.teacherId || game.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ cards: game.studyCards ?? [] }, { status: 200 });
  } catch (err) {
    logger.error('Exception in GET /api/education/classroom/live-game/cards:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
