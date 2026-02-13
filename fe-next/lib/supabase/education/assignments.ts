import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type { LessonAssignment } from './types';

/**
 * Assign a lesson to a classroom
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
