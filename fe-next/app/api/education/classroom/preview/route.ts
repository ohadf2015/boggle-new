import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import logger from '@/utils/logger';
import { checkApiRateLimit } from '@/lib/apiRateLimit';

const previewQuerySchema = z.object({
  code: z.string().min(1).max(10),
});

/**
 * GET /api/education/classroom/preview?code=ABC123
 *
 * Preview classroom info before join (student-facing).
 * Returns minimal classroom metadata for confirmation UX.
 *
 * Resolved via RPC (SECURITY DEFINER), same as join route.
 * Rate limited to prevent code enumeration attempts.
 *
 * Response codes:
 * - 200: Successfully resolved classroom preview
 * - 400: Invalid input or classroom not found
 * - 429: Rate limited
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // This endpoint is unauthenticated and keyed on a 6-character code, which makes it an
    // enumeration oracle: walk the space and every hit reveals a classroom's name. Teacher-written
    // names are routinely personal, so cap it.
    //
    // The cap is per-IP and a whole class shares one school IP, so it must clear a realistic burst:
    // 30 students joining at once, some retyping, is the normal case we are built for. 60/minute
    // covers that while remaining useless against a 36^6 code space. The join button deliberately
    // does NOT depend on this endpoint (see JoinClassroomForm), so a 429 costs a student the
    // confirmation card, never the ability to join.
    // Enforced by `__tests__/route.rateLimit.test.ts` — this used to be a comment with no code.
    const rateLimitResult = checkApiRateLimit(request, 'classroom-preview', {
      maxRequests: 60,
      windowMs: 60_000,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Extract and validate query params
    const code = request.nextUrl.searchParams.get('code');

    const parsed = previewQuerySchema.safeParse({ code });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid classroom code' },
        { status: 400 }
      );
    }

    const { code: joinCode } = parsed.data;
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

    // Find classroom by join code using secure RPC function
    const { data: classroomResult, error: classroomError } = await supabase.rpc(
      'lookup_classroom_by_join_code',
      { p_join_code: normalizedCode }
    );

    if (classroomError) {
      logger.error('Error querying classroom preview:', classroomError);
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
        { error: 'Classroom not found' },
        { status: 400 }
      );
    }

    // Return minimal preview: id, name, language
    return NextResponse.json(
      {
        id: classroom.id,
        name: classroom.name,
        language: classroom.language,
      },
      { status: 200 }
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in GET /api/education/classroom/preview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
