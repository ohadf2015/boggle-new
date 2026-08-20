import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { z } from 'zod';
import logger from '@/utils/logger';
import { canAddStudent } from '@/lib/subscriptions';

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
 * - 409: Already a member
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (or create guest session)
    let userId: string | undefined;
    let isGuest = false;

    const user = await getAuthedUser(request);
    if (user) {
      userId = user.id;
    } else {
      // Guest path: body should contain guestName
      try {
        const body = await request.json();
        const guestName = body.guestName?.trim();
        if (!guestName) {
          return NextResponse.json(
            { error: 'Not authenticated' },
            { status: 401 }
          );
        }
        // Create guest session
        const supabase = await createClient();
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        if (authError || !authData.user) {
          logger.error('Failed to create guest session:', authError);
          return NextResponse.json(
            { error: 'Failed to create guest session' },
            { status: 500 }
          );
        }
        userId = authData.user.id;
        isGuest = true;

        // Create or update guest profile.
        //
        // No `is_guest` column is written: `profiles` has none, and naming a column that does
        // not exist makes PostgREST reject the WHOLE upsert. That is what used to happen —
        // the error was logged and the route carried on, so the guest joined with no profile
        // row at all and showed up on the teacher's roster nameless and faceless. Supabase
        // already records guest-ness as `auth.users.is_anonymous`, which signInAnonymously()
        // sets, so there is nothing of ours to store.
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: userId,
              username: guestName,
            },
            { onConflict: 'id' }
          );

        // Fail loudly. A membership whose student has no profile is a ghost in the classroom:
        // the teacher sees a row with no name and no avatar and cannot tell who joined.
        if (profileError) {
          logger.error('Failed to create guest profile:', profileError);
          return NextResponse.json(
            { error: 'Failed to create guest profile' },
            { status: 500 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }
    }

    // Parse and validate join code
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = joinClassroomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid join code' },
        { status: 400 }
      );
    }

    const { joinCode } = parsed.data;
    const normalizedCode = joinCode.trim().toUpperCase();

    // Validate code format
    if (!normalizedCode || normalizedCode.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid join code format (must be 6 characters)' },
        { status: 400 }
      );
    }

    if (!/^[A-Z0-9]+$/.test(normalizedCode)) {
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

    const classroom = Array.isArray(classroomResult)
      ? classroomResult[0]
      : classroomResult;

    if (!classroom) {
      return NextResponse.json(
        { error: 'Classroom not found. Please check the code with your teacher.' },
        { status: 400 }
      );
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('classroom_memberships')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('student_id', userId)
      .maybeSingle();

    if (existing) {
      // Already a member
      return NextResponse.json(
        {
          message: 'Already a member of this classroom',
          classroomId: classroom.id,
        },
        { status: 200 }
      );
    }

    // Check subscription tier limits for adding a student
    const studentCapCheck = await canAddStudent(classroom.id);
    if (!studentCapCheck.allowed) {
      return NextResponse.json(
        {
          error: 'STUDENT_LIMIT_REACHED',
          message: studentCapCheck.reason,
          currentCount: studentCapCheck.currentCount,
          limit: studentCapCheck.limit,
        },
        { status: 403 }
      );
    }

    // Add membership
    const { error: membershipError } = await supabase
      .from('classroom_memberships')
      .insert({
        classroom_id: classroom.id,
        student_id: userId,
      });

    if (membershipError) {
      logger.error('Error joining classroom:', membershipError);
      return NextResponse.json(
        { error: 'Failed to join classroom' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Successfully joined classroom',
        classroomId: classroom.id,
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
