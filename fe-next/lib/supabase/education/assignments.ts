import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type { LessonAssignment, TeacherAssignment } from './types';
import { isVocabFocus } from '@/lib/education/vocabFocus';
import { recordLessonPlays } from '@/lib/education/lessonPlayStat';
import { WORDCRAFT_FOCUS, isAssignmentFocusValue, type AssignmentFocusValue } from '@/lib/education/wordcraftAssignment';
import {
  captureTeacherActivationFunnelCompleted,
  captureTeacherActivationFunnelStep,
  type TeacherActivationFunnelProps,
} from '@/lib/education/teacherActivationFunnel';
import type { TeacherPlan } from '@/lib/education/teacherOnboardingFunnel';

/**
 * Assign a lesson to a classroom (legacy - kept for backward compatibility)
 */
export async function assignLesson(
  lessonId: string,
  classroomId: string,
  dueDate?: string
): Promise<{ data: LessonAssignment | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    const { data: assignment, error } = await supabase
      .from('lesson_assignments')
      .insert({
        lesson_id: lessonId,
        classroom_id: classroomId,
        due_date: dueDate || null
      })
      .select()
      .single();

    if (error) {
      logger.error('Error assigning lesson:', error);
      return { data: null, error: { message: error.message } };
    }

    void recordLessonPlays([lessonId]);
    return { data: assignment, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in assignLesson:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Get all lessons assigned to a student (via classroom membership)
 */
export async function getStudentAssignedLessons(
  studentId: string
): Promise<{ data: LessonAssignment[]; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

  try {
    // Get student's classroom IDs
    const { data: memberships, error: memberError } = await supabase
      .from('classroom_memberships')
      .select('classroom_id')
      .eq('student_id', studentId);

    if (memberError) {
      logger.error('Error fetching student memberships:', memberError);
      return { data: [], error: { message: memberError.message } };
    }

    if (!memberships || memberships.length === 0) {
      return { data: [], error: null };
    }

    const classroomIds = memberships.map(m => m.classroom_id);

    // Get all lesson assignments for those classrooms
    const { data: assignments, error: assignmentError } = await supabase
      .from('lesson_assignments')
      .select('*, vocabulary_lessons(*)')
      .in('classroom_id', classroomIds)
      .order('created_at', { ascending: false });

    if (assignmentError) {
      logger.error('Error fetching lesson assignments:', assignmentError);
      return { data: [], error: { message: assignmentError.message } };
    }

    return { data: assignments || [], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getStudentAssignedLessons:', error);
    return { data: [], error: { message: error } };
  }
}

// ============================================
// TEACHER ASSIGNMENTS (Phase 42)
// ============================================

/**
 * Create a new teacher assignment
 */
export async function createAssignment(data: {
  classroom_id: string;
  lesson_id: string;
  teacher_id: string;
  assignment_type?: 'practice' | 'duel';
  due_date?: string | null;
  title?: string | null;
  instructions?: string | null;
  word_count_target?: number | null;
  /**
   * Vocabulary skill to drill: definition | synonym | antonym | context |
   * multiple_meaning | roots_affixes. `any`/unset = student picks.
   * 'wordcraft' = play Word Craft.
   */
  practice_focus?: AssignmentFocusValue | null;
  /** Activation-funnel slices stamped on the first_assignment step. Unset when the caller has no entitlement read. */
  locale?: string;
  plan?: TeacherPlan;
}): Promise<{
  data: TeacherAssignment | null;
  error: { message: string; code?: string } | null;
  /** The lesson was already assigned to this classroom; its settings were updated instead. */
  alreadyAssigned?: boolean;
}> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    // Once-only funnel gate, counted BEFORE the insert so the first assignment
    // is detected exactly once. A read failure (null) only skips the funnel
    // events — the insert below runs exactly as it always has.
    const assignmentsBeforeInsert = await countTeacherLessonAssignments(data.teacher_id);

    // Only write the column when a real focus (or 'wordcraft') was chosen, so the
    // legacy insert shape is untouched: 'any'/unset stays NULL = student picks.
    const focus = isVocabFocus(data.practice_focus) || data.practice_focus === WORDCRAFT_FOCUS
      ? { practice_focus: data.practice_focus }
      : {};
    const { data: assignment, error } = await supabase
      .from('lesson_assignments')
      .insert({
        classroom_id: data.classroom_id,
        lesson_id: data.lesson_id,
        due_date: data.due_date || null,
        ...(typeof data.word_count_target === 'number' ? { word_count_target: data.word_count_target } : {}),
        ...focus,
      })
      .select()
      .single();

    if (error) {
      // lesson_assignments is unique on (lesson_id, classroom_id): the lesson is
      // already assigned to this class (re-assign, double-click, second tab).
      // Re-assigning means "this is the homework, with these settings": update
      // the existing row (same id, so student progress stays attached) and
      // report it as already assigned instead of failing.
      if (error.code === UNIQUE_VIOLATION) {
        return reassignExisting(data);
      }
      logger.error('Error creating assignment:', error);
      return { data: null, error: { message: error.message, code: error.code } };
    }

    void recordLessonPlays([data.lesson_id]);

    if (assignmentsBeforeInsert === 0) {
      // Awaited so the completed event (which needs the classroom count) has
      // fired before the caller continues. The helper swallows its own errors.
      await emitFirstAssignmentFunnel(data.teacher_id, { locale: data.locale, plan: data.plan });
    }

    return { data: assignment, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in createAssignment:', error);
    return { data: null, error: { message: error } };
  }
}

const UNIQUE_VIOLATION = '23505';

/**
 * Once-only gate for the activation funnel, counted in the DB — never in
 * localStorage: a storage flag cannot survive a second device or an incognito
 * window, and a double-fired "first" breaks the funnel's math. Null when the
 * count cannot be read; analytics must never block or alter the insert.
 */
async function countTeacherLessonAssignments(teacherId: string): Promise<number | null> {
  if (!supabase) return null;
  try {
    const { count, error } = await supabase
      .from('lesson_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacherId);
    if (error) return null;
    return typeof count === 'number' ? count : null;
  } catch {
    return null;
  }
}

async function countTeacherClassrooms(teacherId: string): Promise<number | null> {
  if (!supabase) return null;
  try {
    const { count, error } = await supabase
      .from('classrooms')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacherId);
    if (error) return null;
    return typeof count === 'number' ? count : null;
  } catch {
    return null;
  }
}

/**
 * Emit the first_assignment funnel step after the teacher's first-ever
 * assignment insert, plus the funnel's completed event when the teacher
 * already owns a classroom (the funnel's terminal state). Reached only from
 * the insert-success path — a duplicate re-assign (UNIQUE_VIOLATION) returns
 * earlier and never fires these. Never throws and never touches the result
 * the caller gets back.
 */
async function emitFirstAssignmentFunnel(
  teacherId: string,
  funnel: TeacherActivationFunnelProps
): Promise<void> {
  try {
    captureTeacherActivationFunnelStep('first_assignment', funnel);
    const classroomCount = await countTeacherClassrooms(teacherId);
    if (classroomCount !== null && classroomCount >= 1) {
      captureTeacherActivationFunnelCompleted(funnel);
    }
  } catch {
    /* analytics must never break the assignment path */
  }
}

/**
 * The settings a re-assign carries over onto the existing assignment. A field
 * the caller did not pass is left as it is.
 */
export function reassignUpdates(data: {
  due_date?: string | null;
  word_count_target?: number | null;
  practice_focus?: AssignmentFocusValue | null;
}): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (data.due_date !== undefined) updates.due_date = data.due_date || null;
  if (data.word_count_target !== undefined) {
    updates.word_count_target = typeof data.word_count_target === 'number' ? data.word_count_target : null;
  }
  if (data.practice_focus !== undefined) {
    updates.practice_focus =
      isVocabFocus(data.practice_focus) || data.practice_focus === WORDCRAFT_FOCUS ? data.practice_focus : null;
  }
  return updates;
}

async function reassignExisting(data: {
  classroom_id: string;
  lesson_id: string;
  due_date?: string | null;
  word_count_target?: number | null;
  practice_focus?: AssignmentFocusValue | null;
}): Promise<{ data: TeacherAssignment | null; error: { message: string; code?: string } | null; alreadyAssigned?: boolean }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };
  const updates = reassignUpdates(data);
  const { data: existing, error } = Object.keys(updates).length > 0
    ? await supabase
        .from('lesson_assignments')
        .update(updates)
        .eq('lesson_id', data.lesson_id)
        .eq('classroom_id', data.classroom_id)
        .select()
        .maybeSingle()
    : await supabase
        .from('lesson_assignments')
        .select()
        .eq('lesson_id', data.lesson_id)
        .eq('classroom_id', data.classroom_id)
        .maybeSingle();

  if (error || !existing) {
    logger.warn('Lesson already assigned; could not update the existing assignment', {
      lessonId: data.lesson_id,
      classroomId: data.classroom_id,
      reason: error?.message ?? 'not found',
    });
    return { data: null, error: { message: 'already_assigned', code: UNIQUE_VIOLATION }, alreadyAssigned: true };
  }
  return { data: existing as TeacherAssignment, error: null, alreadyAssigned: true };
}

/**
 * Get all assignments for a classroom with completion stats
 */
export async function getClassroomAssignments(
  classroomId: string
): Promise<{ data: TeacherAssignment[]; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

  try {
    // Fetch assignments with joined lesson data
    const { data: assignments, error } = await supabase
      .from('lesson_assignments')
      .select('*, vocabulary_lessons(*)')
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching classroom assignments:', error);
      return { data: [], error: { message: error.message } };
    }

    if (!assignments || assignments.length === 0) {
      return { data: [], error: null };
    }

    // Get student count for classroom
    const { count: studentCount } = await supabase
      .from('classroom_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('classroom_id', classroomId);

    // Get completion counts from student_lesson_progress (completed_at IS NOT NULL)
    const assignmentIds = assignments.map(a => a.id);
    const { data: completions } = await supabase
      .from('student_lesson_progress')
      .select('assignment_id')
      .in('assignment_id', assignmentIds)
      .not('completed_at', 'is', null);

    // Count completions per assignment
    const completionCounts: Record<string, number> = {};
    completions?.forEach(c => {
      if (c.assignment_id) {
        completionCounts[c.assignment_id] = (completionCounts[c.assignment_id] || 0) + 1;
      }
    });

    // Merge completion data into assignments
    const enrichedAssignments = assignments.map(assignment => ({
      ...assignment,
      completion_count: completionCounts[assignment.id] || 0,
      student_count: studentCount || 0,
    }));

    return { data: enrichedAssignments, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getClassroomAssignments:', error);
    return { data: [], error: { message: error } };
  }
}

/**
 * Get all completions for an assignment with student profiles
 */
export async function getAssignmentCompletions(
  assignmentId: string
): Promise<{ data: any[]; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

  try {
    const { data: completions, error } = await supabase
      .from('student_lesson_progress')
      // Named, not `*`: every caller (CompletionTracker, AssignmentProgressReport,
      // ClassAssignmentGrid) is listed here so this select can never silently
      // drop a column one of them starts reading. `score`/`accuracy` don't exist
      // on this table —
      // the score/accuracy shown to teachers is derived from `words_attempted`
      // + `completed_at` (see assignmentProgressReport.ts's
      // mapProgressRowToCompletion / lib/education/googleClassroomGrades.ts).
      .select('id, student_id, assignment_id, completed_at, words_attempted, words_mastered')
      .eq('assignment_id', assignmentId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false });

    if (error) {
      logger.error('Error fetching assignment completions:', error);
      return { data: [], error: { message: error.message } };
    }

    // Fetch profiles separately since FK goes to auth.users not profiles
    const studentIds = [...new Set((completions || []).map(c => c.student_id))];
    const { data: profiles } = studentIds.length > 0
      ? await supabase.from('public_profiles').select('id, display_name, avatar_emoji').in('id', studentIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const enriched = (completions || []).map(c => ({
      ...c,
      profiles: profileMap.get(c.student_id) || null,
    }));

    return { data: enriched, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getAssignmentCompletions:', error);
    return { data: [], error: { message: error } };
  }
}

/**
 * Delete a teacher assignment
 */
export async function deleteAssignment(
  assignmentId: string
): Promise<{ data: null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    const { error } = await supabase
      .from('lesson_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      logger.error('Error deleting assignment:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: null, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in deleteAssignment:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Update a teacher assignment
 */
export async function updateAssignment(
  id: string,
  updates: {
    due_date?: string | null;
    title?: string | null;
    instructions?: string | null;
    practice_focus?: AssignmentFocusValue | null;
  }
): Promise<{ data: TeacherAssignment | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    // Same guard as createAssignment: a focus the app does not know would fail
    // the table's CHECK at the database, which reads as a generic 500.
    const patch = { ...updates };
    if ('practice_focus' in patch && patch.practice_focus !== null && !isAssignmentFocusValue(patch.practice_focus)) {
      delete patch.practice_focus;
    }
    const { data: assignment, error } = await supabase
      .from('lesson_assignments')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating assignment:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: assignment, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in updateAssignment:', error);
    return { data: null, error: { message: error } };
  }
}
