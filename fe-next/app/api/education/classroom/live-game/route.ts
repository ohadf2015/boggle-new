import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import logger from '@/utils/logger';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { lookupLiveClassroomGame } from '@/lib/education/classroomGameLookup';
import { createAdminClient } from '@/utils/supabase/admin';

const querySchema = z.object({ code: z.string().min(1).max(10) });

/**
 * GET /api/education/classroom/live-game?code=ABC123
 *
 * "What is this classroom room playing, and whose class is it?" — the one read
 * path a student in a live classroom room has for that.
 *
 * The teacher's client keeps the answer in its own `sessionStorage`
 * (`lessonGameData`). A student has no copy, so their classroom lobby rendered
 * every tile from defaults and announced Classic + classic settings in the
 * middle of a Vocab Quiz, under a heading that said "Classroom Session" rather
 * than the class's name. The room's Redis record, written by the teacher's
 * create, already holds all of it.
 *
 * Unauthenticated on purpose: the QR on the projector is scanned by a logged-out
 * phone, and a guest must see the same lobby as an enrolled student. So it is
 * rate limited like the sibling `preview` route, and it answers with nothing a
 * student in the room cannot read off the board — no teacher id, no roster, no
 * vocabulary list.
 *
 * Response codes:
 * - 200: live game found
 * - 400: malformed code
 * - 404: no live game with that code
 * - 429: rate limited
 * - 500: server error
 */
export async function GET(request: NextRequest) {
  try {
    // Same reasoning and same budget as `classroom/preview`: a whole class shares
    // one school IP and 30 students joining at once is the normal case, so the cap
    // has to clear a real burst while remaining useless against a 36^6 space.
    const rateLimitResult = checkApiRateLimit(request, 'classroom-live-game', {
      maxRequests: 60,
      windowMs: 60_000,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const parsed = querySchema.safeParse({ code: request.nextUrl.searchParams.get('code') });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid game code' }, { status: 400 });
    }

    const code = parsed.data.code.trim().toUpperCase();
    if (code.length !== 6 || !/^[A-Z0-9]+$/.test(code)) {
      return NextResponse.json({ error: 'Invalid game code' }, { status: 400 });
    }

    const game = await lookupLiveClassroomGame(code);
    if (!game) {
      return NextResponse.json({ error: 'No live game with that code' }, { status: 404 });
    }

    // The classroom's name is the one field the Redis record does not carry, and
    // a guest is not a member yet, so own-row RLS would answer zero rows with no
    // error. Read it with the service role — and when there is no service role
    // key, degrade to an unnamed classroom rather than failing the whole answer.
    let classroomName: string | null = null;
    try {
      const admin = createAdminClient();
      if (admin) {
        const { data, error } = await admin
          .from('classrooms')
          .select('name')
          .eq('id', game.classroomId)
          .maybeSingle();
        if (error) {
          logger.error('live-game: classroom name lookup failed:', error);
        } else {
          classroomName = (data as { name?: string } | null)?.name ?? null;
        }
      }
    } catch (nameError) {
      logger.error('live-game: classroom name lookup threw:', nameError);
    }

    const settings = game.settings ?? {};

    return NextResponse.json(
      {
        gameCode: code,
        classroomId: game.classroomId,
        classroomName,
        lessonNames: game.lessonNames ?? [],
        // Hoisted out of `settings` because every caller branches on it first.
        gameMode: settings.gameMode ?? 'classic',
        // Explicitly enumerated, not spread: a spread would ship whatever a
        // future writer adds to the record, to an unauthenticated caller.
        settings: {
          timerMinutes: settings.timerMinutes ?? null,
          boardSize: settings.boardSize ?? null,
          allowLateJoin: settings.allowLateJoin ?? true,
          vocabQuizQuestionCount: settings.vocabQuizQuestionCount ?? null,
          vocabQuizSeconds: settings.vocabQuizSeconds ?? null,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in GET /api/education/classroom/live-game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
