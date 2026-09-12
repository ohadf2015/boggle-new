/**
 * Which lessons a duel can be played on, seen from the STUDENT's side.
 *
 * The obvious query is the broken one. `vocabulary_lessons` is keyed by
 * teacher_id, and the only SELECT policy a student passes is
 * `has_lesson_access(id, auth.uid())` (migration 057), which resolves through
 * `lesson_assignments`. So:
 *   - filtering by the student's id matches nothing (students own no lessons);
 *   - filtering by the teacher's id matches nothing (RLS hides the rows);
 *   - not filtering at all matches nothing either, unless a teacher happened to
 *     create an assignment row.
 * Every one of those comes back as ZERO rows with `error: null`, which reads
 * exactly like "this class has no lessons" (recurring-pitfalls Class 4). The
 * duel challenge dialog's lesson picker was empty for that reason, and SEND
 * CHALLENGE could never enable — a student could not start a duel at all.
 *
 * `/api/education/practice/lessons` already solved this for solo practice: it
 * reads with the service-role client and applies the authorization the product
 * actually wants — "a lesson in my classroom is mine to play" — with
 * assignments demoted to optional metadata. Duels use the same source rather
 * than inventing a second answer to the same question.
 */

import logger from '@/utils/logger';

export interface DuelLessonOption {
  id: string;
  name: string;
}

interface PracticeLessonsResponse {
  lessons?: Array<{ id?: string; name?: string }>;
}

export async function getDuelLessons(): Promise<DuelLessonOption[]> {
  try {
    const response = await fetch('/api/education/practice/lessons', {
      credentials: 'include',
    });

    if (!response.ok) {
      logger.error('[getDuelLessons] Lesson lookup failed:', String(response.status));
      return [];
    }

    const payload = (await response.json()) as PracticeLessonsResponse;

    return (payload.lessons ?? [])
      .filter((lesson): lesson is { id: string; name?: string } => Boolean(lesson?.id))
      .map((lesson) => ({ id: lesson.id, name: lesson.name || '' }));
  } catch (err) {
    logger.error(
      '[getDuelLessons] Exception loading duel lessons:',
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}
