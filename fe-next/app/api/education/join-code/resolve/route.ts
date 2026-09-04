import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { lookupLiveClassroomGame } from '@/lib/education/classroomGameLookup';
import logger from '@/utils/logger';

/**
 * GET /api/education/join-code/resolve?code=ABC123
 *
 * Answers one question: what KIND of thing is this six-character code?
 *
 * Two independent systems mint six-character codes and both are handed to students through
 * the same `/[locale]/join/[code]` URL:
 *
 *   - `classrooms.join_code` — DB trigger, permanent, enrolls a student on a roster.
 *   - the live game's `gameCode` — minted in ClassroomGameLobby, lives 4h in Redis, and is
 *     what the projector's QR code and the big on-screen code actually show.
 *
 * `/join/[code]` only ever tried the first. A student reading the code off the classroom
 * board got `400 Classroom not found` from both preview and join, with nowhere to go.
 *
 * Callers route on `kind` instead of guessing. Deliberate contract choices:
 *
 *   - An unresolvable code answers `kind: 'unknown'` with **200**, not an error status. The
 *     page needs a branchable answer so it can still offer the student both doors; a 4xx
 *     here is what produced the dead end in the first place.
 *   - Redis being down degrades to `kind: 'unknown'`, never a 500. A student whose classroom
 *     code is fine must not be blocked by the game lookup failing.
 *   - The rate limit is generous and, like `preview`, must never be load-bearing for the
 *     ability to join — a whole class shares one school IP.
 */

const CODE_RE = /^[A-Z0-9]{6}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get('code') ?? '';
  const code = raw.trim().toUpperCase();

  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: 'Invalid join code' }, { status: 400 });
  }

  const rateLimit = checkApiRateLimit(request as never, 'join-code-resolve', {
    maxRequests: 120,
    windowMs: 60_000,
  });
  if (!rateLimit.success) {
    // Not a hard failure: an unresolved code still renders an actionable page.
    return NextResponse.json({ kind: 'unknown' }, { status: 200 });
  }

  // 1. Classroom roster code. Checked first and allowed to win a (vanishingly unlikely)
  //    collision: enrolment is permanent, a game code expires in four hours.
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('lookup_classroom_by_join_code', {
      p_join_code: code,
    });
    if (!error) {
      const classroom = Array.isArray(data) ? data[0] : data;
      if (classroom) {
        return NextResponse.json({
          kind: 'classroom',
          id: classroom.id,
          name: classroom.name,
          language: classroom.language,
        });
      }
    } else {
      logger.error('join-code resolve: classroom lookup failed:', error);
    }
  } catch (err) {
    logger.error('join-code resolve: classroom lookup threw:', err);
  }

  // 2. Live game code — the one on the projector.
  try {
    const game = await lookupLiveClassroomGame(code);
    if (game) {
      return NextResponse.json({
        kind: 'game',
        gameCode: code,
        classroomId: game.classroomId,
        teacherName: game.teacherName,
        lessonIds: game.lessonIds,
      });
    }
  } catch (err) {
    // Redis unavailable. Degrade to 'unknown' so the page still renders both doors.
    logger.error('join-code resolve: game lookup threw:', err);
  }

  return NextResponse.json({ kind: 'unknown' });
}
