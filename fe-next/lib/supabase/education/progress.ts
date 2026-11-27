import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type { StudentLessonProgress } from './types';

/**
 * Get student progress for a specific lesson or all lessons
 */
export async function getStudentProgress(
  studentId: string,
  lessonId?: string
): Promise<{ data: StudentLessonProgress[]; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

  try {
    let query = supabase
      .from('student_lesson_progress')
      .select('*')
      .eq('student_id', studentId)
      .order('started_at', { ascending: false });

    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching student progress:', error);
      return { data: [], error: { message: error.message } };
    }

    return { data: data || [], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getStudentProgress:', error);
    return { data: [], error: { message: error } };
  }
}

/**
 * Get progress for all students in a classroom for a specific lesson
 */
export async function getClassProgress(
  classroomId: string,
  lessonId: string
): Promise<{ data: StudentLessonProgress[]; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

  try {
    // Get all student IDs in the classroom
    const { data: memberships, error: memberError } = await supabase
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', classroomId);

    if (memberError) {
      logger.error('Error fetching classroom members:', memberError);
      return { data: [], error: { message: memberError.message } };
    }

    if (!memberships || memberships.length === 0) {
      return { data: [], error: null };
    }

    const studentIds = memberships.map(m => m.student_id);

    // Get progress for all students in the lesson
    const { data, error } = await supabase
      .from('student_lesson_progress')
      .select('*')
      .eq('lesson_id', lessonId)
      .in('student_id', studentIds)
      .order('started_at', { ascending: false });

    if (error) {
      logger.error('Error fetching class progress:', error);
      return { data: [], error: { message: error.message } };
    }

    return { data: data || [], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getClassProgress:', error);
    return { data: [], error: { message: error } };
  }
}

/**
 * Get all student progress records for a specific lesson (teacher analytics view)
 */
export async function getStudentProgressForLesson(
  lessonId: string
): Promise<{ data: StudentLessonProgress[]; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

  try {
    const { data, error } = await supabase
      .from('student_lesson_progress')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('started_at', { ascending: false });

    if (error) {
      logger.error('Error fetching progress for lesson:', error);
      return { data: [], error: { message: error.message } };
    }

    return { data: data || [], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getStudentProgressForLesson:', error);
    return { data: [], error: { message: error } };
  }
}

