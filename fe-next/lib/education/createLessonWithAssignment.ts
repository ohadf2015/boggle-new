/**
 * Create a lesson and, when the teacher picked a classroom, actually assign it
 * there.
 *
 * The Create Lesson dialog's classroom dropdown used to write only
 * `vocabulary_lessons.classroom_id`. Students read their lessons from
 * `lesson_assignments`, so a teacher who filled in the obvious, already-visible
 * field got a lesson their class could never see, with no error to explain it —
 * two paths to "this classroom has this lesson" where one silently reached
 * nothing.
 *
 * The result deliberately separates "the lesson saved" from "it reached the
 * classroom". A lesson that saves but fails to assign is NOT plain success, and
 * the caller must say so, or this fix just moves the silent failure one step
 * later.
 */
import { createAssignment } from '@/lib/supabase/education/assignments';
import type { Language, VocabularyWord } from '@/lib/supabase/education/types';
import logger from '@/utils/logger';

export interface NewLessonInput {
  name: string;
  description?: string;
  language: Language;
  words: VocabularyWord[];
  /** Empty or absent means the teacher did not pick a classroom. */
  classroomId?: string;
  isPublic?: boolean;
}

/** The `createLesson` from `useLessons()`, injected so this stays testable. */
export type CreateLessonFn = (data: {
  name: string;
  description?: string;
  language: Language;
  words: VocabularyWord[];
  classroomId?: string;
  isPublic?: boolean;
}) => Promise<{ success: boolean; data?: { id: string } | null; error?: string }>;

export interface CreateLessonAndAssignResult {
  /** The lesson itself was created. */
  success: boolean;
  lesson?: { id: string } | null;
  /** The lesson reached the chosen classroom. False whenever none was chosen. */
  assigned: boolean;
  /** Set only when a classroom WAS chosen and the assignment did not happen. */
  assignmentError?: string;
  /** Set only when the lesson itself failed to save. */
  error?: string;
}

export async function createLessonAndAssign({
  lesson,
  teacherId,
  createLesson,
}: {
  lesson: NewLessonInput;
  teacherId: string;
  createLesson: CreateLessonFn;
}): Promise<CreateLessonAndAssignResult> {
  const result = await createLesson({
    name: lesson.name,
    description: lesson.description,
    language: lesson.language,
    words: lesson.words,
    // Kept so the column and the assignment row agree with each other.
    classroomId: lesson.classroomId || undefined,
    isPublic: lesson.isPublic,
  });

  if (!result.success) {
    return { success: false, assigned: false, error: result.error };
  }

  const classroomId = lesson.classroomId?.trim();
  if (!classroomId) {
    return { success: true, lesson: result.data, assigned: false };
  }

  const lessonId = result.data?.id;
  if (!lessonId) {
    logger.error('createLessonAndAssign: lesson saved without an id, cannot assign');
    return {
      success: true,
      lesson: result.data,
      assigned: false,
      assignmentError: 'Lesson saved but returned no id, so it could not be assigned',
    };
  }

  try {
    // `lesson_assignments` (migration 056) has only lesson_id, classroom_id,
    // due_date and later practice_focus — `createAssignment` accepts teacher_id
    // and assignment_type but does not write them. So a momentarily-null user
    // must NOT block the insert: refusing here would fail an assignment the
    // database would happily have taken. due_date is nullable, so omitting it
    // is fine; the teacher sets one later from the assignment creator.
    const assignment = await createAssignment({
      classroom_id: classroomId,
      lesson_id: lessonId,
      teacher_id: teacherId,
      assignment_type: 'practice',
    });

    if (assignment.error) {
      logger.error('createLessonAndAssign: assignment failed', assignment.error);
      return {
        success: true,
        lesson: result.data,
        assigned: false,
        assignmentError: assignment.error.message,
      };
    }

    return { success: true, lesson: result.data, assigned: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('createLessonAndAssign: assignment threw', err);
    return { success: true, lesson: result.data, assigned: false, assignmentError: message };
  }
}
