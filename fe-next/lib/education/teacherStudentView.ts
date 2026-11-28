import type { StudentLesson } from '@/hooks/useStudentProgress';
import type { TeacherAssignment } from '@/lib/supabase/education/types';

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
