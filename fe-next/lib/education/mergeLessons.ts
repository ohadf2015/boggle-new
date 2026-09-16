import type { StudentLesson } from '@/hooks/useStudentProgress';
import type { PracticeLesson } from '@/hooks/usePracticeLessons';

/**
 * Merge a student's assigned/in-progress lessons (`useStudentProgress`) with the
 * wider "anything I can practise" set (`usePracticeLessons`), de-duplicated by
 * lesson id.
 *
 * Mirrors the merge rule already used by StudentLessonView (the /student/lessons
 * list): a lesson present in both sources is ONE entry, and the assignment/
 * progress-bearing entry wins — it carries the real deadline and mastery data
 * that a synthesized practisable-only entry does not. A practisable-only lesson
 * is added as a plain 'started' entry (not 'assigned' — nothing was actually
 * assigned).
 *
 * Keep this the single source of that rule: any screen that needs "lessons this
 * student may see" should call this instead of re-deriving its own merge, so the
 * three screens (lessons list, hub, profile) can never drift apart on it.
 */
export function mergeStudentLessons(
  assigned: StudentLesson[],
  practisable: PracticeLesson[]
): StudentLesson[] {
  const byId = new Map<string, StudentLesson>();
  for (const entry of assigned) byId.set(entry.lessonId, entry);
  for (const open of practisable) {
    if (byId.has(open.id)) continue;
    byId.set(open.id, {
      lessonId: open.id,
      status: 'started',
      lesson: {
        id: open.id,
        name: open.name,
        description: open.description,
        language: open.language,
        words: open.words,
        classroom_id: open.classroom_id,
      } as StudentLesson['lesson'],
      ...(open.assignment ? { assignment: open.assignment as StudentLesson['assignment'] } : {}),
    });
  }
  return [...byId.values()];
}
