import type { StudentLesson } from '@/hooks/useStudentProgress';
import type { PracticeLesson } from '@/hooks/usePracticeLessons';
import type { StudentLessonProgress, TeacherAssignment } from '@/lib/supabase/education/types';

/** The class's assignments as a brand-new student of that class would get them: newest first, one per lesson, no progress. */
export function assignmentsToStudentLessons(assignments: readonly TeacherAssignment[], classroomId: string): StudentLesson[] {
  const seen = new Set<string>();
  return [...assignments]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .flatMap((a): StudentLesson[] => {
      if (!a.vocabulary_lessons || seen.has(a.lesson_id)) return [];
      seen.add(a.lesson_id);
      return [{
        lessonId: a.lesson_id,
        status: 'assigned',
        classroomId,
        dueDate: a.due_date,
        assignedAt: a.created_at,
        assignment: a as unknown as StudentLesson['assignment'],
        lesson: a.vocabulary_lessons,
        progress: { words_mastered: [] } as unknown as StudentLesson['progress'],
      }];
    });
}

/**
 * The teacher's own progress rows on the class's lessons; the class list stays the source of which lessons show.
 * A lesson owner's round never stamps `completed_at`, so a finished round (a session the XP RPC counted) is "done".
 */
export function withOwnProgress(lessons: readonly StudentLesson[], progress: readonly StudentLessonProgress[]): StudentLesson[] {
  const byLesson = new Map(progress.map((p) => [p.lesson_id, p]));
  return lessons.map((l) => {
    const own = byLesson.get(l.lessonId);
    if (!own) return l;
    const done = !!own.completed_at || (own.total_practice_sessions ?? 0) > 0;
    return { ...l, progress: own, status: done ? 'completed' : 'started' };
  });
}

export function studentLessonsToPracticeLessons(lessons: readonly StudentLesson[]): PracticeLesson[] {
  return lessons.flatMap((l): PracticeLesson[] => {
    if (!l.lesson) return [];
    const a = l.assignment as (StudentLesson['assignment'] & { practice_focus?: string | null }) | undefined;
    return [{
      id: l.lessonId,
      name: l.lesson.name,
      description: l.lesson.description ?? null,
      language: l.lesson.language,
      words: l.lesson.words ?? [],
      classroom_id: l.classroomId ?? null,
      assignment: a
        ? { lesson_id: a.lesson_id, classroom_id: a.classroom_id, due_date: a.due_date, created_at: a.created_at, practice_focus: a.practice_focus ?? null }
        : null,
    }];
  });
}
