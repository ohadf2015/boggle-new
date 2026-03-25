import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type { LessonAssignment, TeacherAssignment } from './types';

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
}): Promise<{ data: TeacherAssignment | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    const { data: assignment, error } = await supabase
      .from('lesson_assignments')
      .insert({
        classroom_id: data.classroom_id,
        lesson_id: data.lesson_id,
        due_date: data.due_date || null,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating assignment:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: assignment, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in createAssignment:', error);
    return { data: null, error: { message: error } };
  }
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

    // Get completion counts for each assignment
    const assignmentIds = assignments.map(a => a.id);
    const { data: completions } = await supabase
      .from('assignment_completions')
      .select('assignment_id')
      .in('assignment_id', assignmentIds);

    // Count completions per assignment
    const completionCounts: Record<string, number> = {};
    completions?.forEach(c => {
      completionCounts[c.assignment_id] = (completionCounts[c.assignment_id] || 0) + 1;
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
      .from('assignment_completions')
      .select('*, profiles(display_name, avatar_emoji)')
      .eq('assignment_id', assignmentId)
      .order('completed_at', { ascending: false });

    if (error) {
      logger.error('Error fetching assignment completions:', error);
      return { data: [], error: { message: error.message } };
    }

    return { data: completions || [], error: null };
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
  }
): Promise<{ data: TeacherAssignment | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    const { data: assignment, error } = await supabase
      .from('lesson_assignments')
      .update(updates)
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
