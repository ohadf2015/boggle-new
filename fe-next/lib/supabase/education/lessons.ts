import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type { VocabularyLesson } from './types';

/**
 * Get all lessons for a teacher, optionally filtered by classroom
 */
export async function getLessons(
  teacherId: string,
  classroomId?: string
): Promise<{ data: VocabularyLesson[]; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

  try {
    let query = supabase
      .from('vocabulary_lessons')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching lessons:', error);
      return { data: [], error: { message: error.message } };
    }

    return { data: data || [], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getLessons:', error);
    return { data: [], error: { message: error } };
  }
}

/**
 * Get a single lesson by ID
 */
export async function getLesson(lessonId: string): Promise<{ data: VocabularyLesson | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    const { data, error } = await supabase
      .from('vocabulary_lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error) {
      // PGRST116 = no rows found — lesson doesn't exist, not an error
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      logger.error('Error fetching lesson:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getLesson:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Create a new vocabulary lesson
 */
export async function createLesson(
  data: Omit<VocabularyLesson, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: VocabularyLesson | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    const { data: lesson, error } = await supabase
      .from('vocabulary_lessons')
      .insert(data)
      .select()
      .single();

    if (error) {
      logger.error('Error creating lesson:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: lesson, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in createLesson:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Update a vocabulary lesson
 */
export async function updateLesson(
  id: string,
  updates: Partial<Omit<VocabularyLesson, 'id' | 'teacher_id' | 'created_at' | 'updated_at'>>
): Promise<{ data: VocabularyLesson | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    const { data: lesson, error } = await supabase
      .from('vocabulary_lessons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating lesson:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: lesson, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in updateLesson:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Delete a vocabulary lesson
 */
export async function deleteLesson(id: string): Promise<{ error: { message: string } | null }> {
  if (!supabase) return { error: { message: 'Supabase not configured' } };

  try {
    const { error } = await supabase
      .from('vocabulary_lessons')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting lesson:', error);
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in deleteLesson:', error);
    return { error: { message: error } };
  }
}
