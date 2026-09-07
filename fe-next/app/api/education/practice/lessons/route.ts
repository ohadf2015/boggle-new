/**
 * GET /api/education/practice/lessons — the lessons a student may practise.
 *
 * WHY THIS ROUTE EXISTS (the gate it removes)
 *
 * Solo practice used to require a separate, easy-to-miss teacher step. A lesson
 * became practisable only once a teacher opened the Review tab and created an
 * *assignment* for it, because the gate was doubled up:
 *
 *   1. `useStudentProgress` builds the student's lesson list from
 *      `getStudentAssignedLessons` — assignment rows and nothing else.
 *   2. The `vocabulary_lessons` SELECT policy for a student is
 *      `has_lesson_access(id, auth.uid())` (migration 057), which resolves
 *      through `lesson_assignments`. A lesson sitting in the student's own
 *      classroom therefore reads back as ZERO ROWS WITH `error: null` — the
 *      quiet RLS failure this repo has been bitten by repeatedly.
 *
 * So the client could not route around the gate: the database enforced it too.
 * This route reads with the service-role client and applies the authorization
 * the product actually wants — "a lesson in my classroom is mine to practise" —
 * while assignments stay exactly where they were, as optional metadata (due
 * date, pinned focus) rather than the thing that grants access.
 *
 * TWO MODES
 *   - `?lessonId=<uuid>` → one lesson, NO session required. A lesson link is a
 *     share link: a student with no account can open it and practise. Only the
 *     material is returned.
 *   - no params → the practisable list for the signed-in student.
 *
 * Neither mode returns `teacher_id` or anything else identifying the author.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Columns a student is allowed to see. `teacher_id` is deliberately absent. */
const LESSON_COLUMNS = 'id, name, description, language, words, classroom_id';

interface LessonRow {
  id: string;
  name: string | null;
  description?: string | null;
  language: string | null;
  words: unknown[] | null;
  classroom_id: string | null;
}

interface AssignmentRow {
  lesson_id: string | null;
  classroom_id: string | null;
  due_date?: string | null;
  created_at?: string | null;
  practice_focus?: string | null;
}

function shapeLesson(row: LessonRow) {
  return {
    id: row.id,
    name: row.name ?? '',
    description: row.description ?? null,
    language: row.language ?? 'en',
    words: Array.isArray(row.words) ? row.words : [],
    classroom_id: row.classroom_id ?? null,
  };
}

export async function GET(request: NextRequest) {
  const limit = checkApiRateLimit(request, 'education-practice-lessons', {
    windowMs: 60_000,
    maxRequests: 60,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter ?? 60) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get('lessonId');

  // Validate BEFORE reaching the database, so a malformed id is a 400 rather
  // than a Postgres cast error surfacing as a 500.
  if (lessonId !== null && !UUID_RE.test(lessonId)) {
    return NextResponse.json({ error: 'Invalid lessonId' }, { status: 400 });
  }

  const admin = createAdminClient();
  // Never fail open. An unconfigured service key returning `{ lessons: [] }`
  // is indistinguishable from "you have no lessons", which is the exact silent
  // no-op this repo keeps paying for.
  if (!admin) {
    logger.error('practice/lessons: service-role client unavailable');
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  try {
    if (lessonId) {
      const { data, error } = await admin
        .from('vocabulary_lessons')
        .select(LESSON_COLUMNS)
        .eq('id', lessonId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
      }
      return NextResponse.json({ lesson: shapeLesson(data as LessonRow) });
    }

    const user = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: memberships } = await admin
      .from('classroom_memberships')
      .select('classroom_id')
      .eq('student_id', user.id);

    const classroomIds = (memberships ?? [])
      .map((m: { classroom_id: string | null }) => m.classroom_id)
      .filter((id: string | null): id is string => !!id);

    const assignments: AssignmentRow[] = classroomIds.length
      ? ((
          await admin
            .from('lesson_assignments')
            .select('lesson_id, classroom_id, due_date, created_at, practice_focus')
            .in('classroom_id', classroomIds)
        ).data ?? [])
      : [];

    const assignmentByLesson = new Map<string, AssignmentRow>();
    for (const a of assignments) {
      if (a.lesson_id) assignmentByLesson.set(a.lesson_id, a);
    }

    // Two sources, one list. The classroom query is the half that removes the
    // gate; the assignment query keeps a lesson reachable even when it was
    // assigned to a classroom whose `classroom_id` the lesson does not carry.
    const byId = new Map<string, LessonRow>();

    if (classroomIds.length) {
      const { data } = await admin
        .from('vocabulary_lessons')
        .select(LESSON_COLUMNS)
        .in('classroom_id', classroomIds);
      for (const row of (data ?? []) as LessonRow[]) byId.set(row.id, row);
    }

    const assignedIds = [...assignmentByLesson.keys()];
    if (assignedIds.length) {
      const { data } = await admin
        .from('vocabulary_lessons')
        .select(LESSON_COLUMNS)
        .in('id', assignedIds);
      for (const row of (data ?? []) as LessonRow[]) byId.set(row.id, row);
    }

    const lessons = [...byId.values()].map((row) => ({
      ...shapeLesson(row),
      // Metadata, not a gate. Null means "practise this whenever you like",
      // which is now the normal case rather than the impossible one.
      assignment: assignmentByLesson.get(row.id) ?? null,
    }));

    return NextResponse.json({ lessons });
  } catch (err) {
    logger.error('practice/lessons failed:', err);
    return NextResponse.json({ error: 'Failed to load lessons' }, { status: 500 });
  }
}
