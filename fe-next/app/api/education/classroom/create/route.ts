import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { z } from 'zod';
import logger from '@/utils/logger';
import { canCreateClass } from '@/lib/subscriptions';
import { captureEduServerEvents } from '@/backend/utils/educationTelemetry';
import { buildClassroomCreatedEvent, isQaEmail } from '@/backend/utils/educationRoundTelemetry';
import {
  buildTeacherActivationFunnelStepEvent,
  resolveTeacherActivationPlan,
} from '@/lib/education/teacherActivationFunnelServer';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';

const createClassroomSchema = z.object({
  name: z.string().min(1).max(100),
  language: z.enum(EDUCATION_LANGUAGES),
});

/**
 * POST /api/education/classroom/create
 * Create a new classroom with subscription tier enforcement
 *
 * Response codes:
 * - 201: Classroom created
 * - 400: Invalid input
 * - 401: Unauthorized
 * - 403: Limit reached (error code: CLASS_LIMIT_REACHED)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate input
    const parsed = createClassroomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, language } = parsed.data;

    // Check subscription tier limits
    const capCheck = await canCreateClass(user.id);
    if (!capCheck.allowed) {
      return NextResponse.json(
        {
          error: 'CLASS_LIMIT_REACHED',
          message: capCheck.reason,
          currentCount: capCheck.currentCount,
          limit: capCheck.limit,
        },
        { status: 403 }
      );
    }

    // Create classroom in Supabase
    const supabase = await createClient();

    // Once-only funnel gate for the first_classroom step, counted BEFORE the
    // insert. A read failure (null) skips only the funnel event — the insert,
    // the cap check and edu_classroom_created are all untouched.
    let classroomsBeforeInsert: number | null = null;
    try {
      const { count, error: countError } = await supabase
        .from('classrooms')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', user.id);
      if (!countError && typeof count === 'number') {
        classroomsBeforeInsert = count;
      }
    } catch {
      /* funnel gate unreadable — insert proceeds, step is skipped */
    }

    const { data: classroom, error: createError } = await supabase
      .from('classrooms')
      .insert({
        teacher_id: user.id,
        name,
        language,
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating classroom:', createError);
      return NextResponse.json(
        { error: 'Failed to create classroom' },
        { status: 500 }
      );
    }

    captureEduServerEvents([
      buildClassroomCreatedEvent({
        teacherId: user.id,
        classroomId: classroom.id,
        language,
        isTestAccount: isQaEmail(user.email),
      }),
    ]);

    // First classroom ever → activation funnel step 2. Completed is NOT
    // emitted here; it fires client-side on the first assignment.
    if (classroomsBeforeInsert === 0) {
      captureEduServerEvents([
        buildTeacherActivationFunnelStepEvent({
          teacherId: user.id,
          step: 'first_classroom',
          locale: language,
          plan: await resolveTeacherActivationPlan(user.id),
          isTestAccount: isQaEmail(user.email),
        }),
      ]);
    }

    return NextResponse.json(
      {
        data: classroom,
        message: 'Classroom created successfully',
      },
      { status: 201 }
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in POST /api/education/classroom/create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
