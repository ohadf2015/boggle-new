import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { z } from 'zod';
import logger from '@/utils/logger';
import { canAddStudent } from '@/lib/subscriptions';
import { captureStudentJoinEvents } from '@/lib/education/joinTelemetry';
import { lookupLiveClassroomGame } from '@/lib/education/classroomGameLookup';
import { lookupLiveGameForClassroom } from '@/lib/education/liveGameForClassroom';
import { lookupEndedClassroomSession, recordEndedCodeTry } from './endedSessionCode';
import { guestSignInData, joinMissBudgetSpent, joinRateLimited, recordJoinMiss, sanitizeGuestName } from './joinGuards';

const joinClassroomSchema = z.object({
  joinCode: z.string().min(1).max(10),
});

/**
 * POST /api/education/classroom/join
 * Join a classroom using join code with subscription tier enforcement
 *
 * Response codes:
 * - 200: Successfully joined
 * - 400: Invalid input or classroom not found
 * - 401: Unauthorized
 * - 403: Classroom at student limit (error code: STUDENT_LIMIT_REACHED)
 * - 200: Already a member (idempotent — an earlier version of this comment claimed 409,
 *        which no branch below ever returns; callers treat a re-join as a success)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Read the body ONCE, up front. It carries both `guestName` (guest path) and
    // `joinCode` (everyone), and a Request body is single-use: the guest path used
    // to read it here and the join code read it again below, which threw "Body is
    // unusable" and 400'd the guest — after their auth user and profile row had
    // already been written. Orphaned identity, no membership.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (joinRateLimited(request) || joinMissBudgetSpent(request)) {
      return NextResponse.json({ error: 'Too many attempts. Wait a few minutes and try again.' }, { status: 429 });
    }

    const user = await getAuthedUser(request);
    let userId: string | undefined = user?.id;
    // Guests are created only after the code resolves and the class has a seat:
    // an anonymous auth user cannot be un-created.
    const guestName = user ? '' : sanitizeGuestName((body as { guestName?: unknown } | null)?.guestName);
    if (!user && !guestName) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Validate join code
    const parsed = joinClassroomSchema.safeParse(body);
    if (!parsed.success) {
      recordJoinMiss(request);
      return NextResponse.json(
        { error: 'Invalid join code' },
        { status: 400 }
      );
    }

    const { joinCode } = parsed.data;
    const normalizedCode = joinCode.trim().toUpperCase();

    // Validate code format
    if (!normalizedCode || normalizedCode.length !== 6) {
      recordJoinMiss(request);
      return NextResponse.json(
        { error: 'Invalid join code format (must be 6 characters)' },
        { status: 400 }
      );
    }

    if (!/^[A-Z0-9]+$/.test(normalizedCode)) {
      recordJoinMiss(request);
      return NextResponse.json(
        { error: 'Invalid join code format (letters and numbers only)' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find classroom by join code (secure RPC to prevent enumeration)
    const { data: classroomResult, error: classroomError } = await supabase.rpc(
      'lookup_classroom_by_join_code',
      { p_join_code: normalizedCode }
    );

    if (classroomError) {
      logger.error('Error querying classroom:', classroomError);
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 400 }
      );
    }

    let classroom = Array.isArray(classroomResult)
      ? classroomResult[0]
      : classroomResult;

    // Not a roster code? Try the code the student is far more likely to be holding: the LIVE
    // GAME code on the projector. Two systems mint six-character codes into the same
    // `/join/[code]` URL, and only the roster one used to resolve — so the common case, a
    // student typing what is on the board, answered "Classroom not found".
    //
    // Resolving it here enrols them AND hands back the room to walk into, which is the whole
    // journey ("join the class and play") in one request.
    let liveGameCode: string | null = null;
    if (!classroom) {
      try {
        const game = await lookupLiveClassroomGame(normalizedCode);
        if (game) {
          classroom = { id: game.classroomId };
          liveGameCode = normalizedCode;
        }
      } catch (gameLookupError) {
        // Redis down. Fall through to the not-found answer below rather than 500 — the
        // student's next action is the same either way (re-check the code).
        logger.error('Live game lookup failed during join:', gameLookupError);
      }
    }

    // A student holding yesterday's whiteboard code belongs to that class: enrol them there instead of a dead end.
    let endedSessionCode = false;
    if (!classroom) {
      const ended = await lookupEndedClassroomSession(normalizedCode);
      if (ended) {
        classroom = { id: ended.classroomId };
        endedSessionCode = true;
      }
    }

    if (!classroom) {
      recordJoinMiss(request);
      return NextResponse.json(
        { error: 'Classroom not found. Please check the code with your teacher.' },
        { status: 400 }
      );
    }

    // The OTHER direction of the same problem. Above resolves a projector code to
    // its classroom; this resolves a classroom to its projector code.
    //
    // The teacher posts ONE code in Google Classroom and it is the PERMANENT roster
    // code — the game code is minted per session and is only ever on the board. So
    // the code most students actually hold was the one that did not lead to the
    // game: they were enrolled, handed no `gameCode`, and `useJoinFlow` reads
    // exactly that field to choose between the room and the student hub. A green
    // "joined!" toast, a dashboard, and a class playing without them.
    //
    // Runs for BOTH the new student and the returning one — the "already a member"
    // branch below returns early, and returning students are the majority of any
    // second lesson.
    if (!liveGameCode) {
      try {
        liveGameCode = await lookupLiveGameForClassroom(classroom.id);
      } catch (liveGameError) {
        // Enrolment is the thing that must not be lost. A student on the roster with
        // no room can be walked in by the banner; a student refused outright cannot.
        logger.error('Live game lookup failed for classroom during join:', liveGameError);
      }
    }

    const fullClass = () => NextResponse.json({ error: 'STUDENT_LIMIT_REACHED' }, { status: 403 });

    if (!userId) {
      const seat = await canAddStudent(classroom.id);
      if (!seat.allowed) return fullClass();
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously({
        options: { data: guestSignInData(guestName) },
      });
      if (authError || !authData.user) {
        logger.error('Failed to create guest session:', authError);
        return NextResponse.json(
          { error: 'Failed to create guest session' },
          { status: 500 }
        );
      }
      userId = authData.user.id;
    }

    if (endedSessionCode && !liveGameCode) {
      await recordEndedCodeTry(classroom.id, userId);
    }
    const endedVerdict = endedSessionCode ? { verdict: 'class-join', endedSessionCode: true } : {};
    const alreadyMember = () => NextResponse.json(
      {
        message: 'Already a member of this classroom',
        classroomId: classroom.id,
        alreadyMember: true,
        ...endedVerdict,
        ...(liveGameCode ? { gameCode: liveGameCode } : {}),
      },
      { status: 200 }
    );

    if (user) {
      const { data: existing } = await supabase
        .from('classroom_memberships')
        .select('id')
        .eq('classroom_id', classroom.id)
        .eq('student_id', userId)
        .maybeSingle();
      if (existing) return alreadyMember();

      const studentCapCheck = await canAddStudent(classroom.id);
      if (!studentCapCheck.allowed) return fullClass();
    }

    // Membership writes are service-role only; the database re-checks the seat cap atomically.
    const admin = createAdminClient();
    if (!admin) {
      logger.error('classroom join: service role key not configured');
      return NextResponse.json({ error: 'Failed to join classroom' }, { status: 500 });
    }
    const { error: membershipError } = await admin
      .from('classroom_memberships')
      .insert({
        classroom_id: classroom.id,
        student_id: userId,
      });

    if (membershipError) {
      if (membershipError.code === '23505') return alreadyMember();
      if (membershipError.message?.includes('STUDENT_LIMIT_REACHED')) return fullClass();
      logger.error('Error joining classroom:', membershipError);
      return NextResponse.json(
        { error: 'Failed to join classroom' },
        { status: 500 }
      );
    }

    await captureStudentJoinEvents(createAdminClient(), { classroomId: classroom.id, studentId: userId });

    return NextResponse.json(
      {
        message: 'Successfully joined classroom',
        classroomId: classroom.id,
        ...endedVerdict,
        ...(liveGameCode ? { gameCode: liveGameCode } : {}),
      },
      { status: 200 }
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in POST /api/education/classroom/join:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
