import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type { CurriculumWordList, CurriculumWordListFilters, VocabularyLesson } from './types';

/**
 * Get curriculum word lists with optional filters
 */
export async function getCurriculumWordLists(
  filters?: CurriculumWordListFilters
): Promise<{ data: CurriculumWordList[]; error: { message: string } | null }> {
  if (!supabase) {
    return { data: [], error: { message: 'Supabase not configured' } };
  }

  try {
    let query = supabase
      .from('curriculum_word_lists')
      .select('*')
      .eq('is_active', true)
      .order('grade_level', { ascending: true })
      .order('name', { ascending: true });

    // Apply filters
    if (filters?.language) {
      query = query.eq('language', filters.language);
    }
    if (filters?.gradeLevel) {
      query = query.eq('grade_level', filters.gradeLevel);
    }
    if (filters?.subject) {
      query = query.eq('subject', filters.subject);
    }
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching curriculum word lists:', error);
      return { data: [], error: { message: error.message } };
    }

    return { data: data || [], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getCurriculumWordLists:', error);
    return { data: [], error: { message: error } };
  }
}

/**
 * Get a single curriculum word list by ID
 */
export async function getCurriculumWordList(
  id: string
): Promise<{ data: CurriculumWordList | null; error: { message: string } | null }> {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }

  try {
    const { data, error } = await supabase
      .from('curriculum_word_lists')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Error fetching curriculum word list:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getCurriculumWordList:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Import a curriculum word list into a new vocabulary lesson
 */
export async function importCurriculumToLesson(
  curriculumListId: string,
  teacherId: string,
  classroomId?: string
): Promise<{ data: VocabularyLesson | null; error: { message: string } | null }> {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }

  try {
    // First get the curriculum word list
    const { data: curriculumList, error: fetchError } = await supabase
      .from('curriculum_word_lists')
      .select('*')
      .eq('id', curriculumListId)
      .eq('is_active', true)
      .single();

    if (fetchError || !curriculumList) {
      logger.error('Error fetching curriculum list for import:', fetchError);
      return { data: null, error: { message: fetchError?.message || 'Curriculum list not found' } };
    }

    // Create a new vocabulary lesson from the curriculum list
    const { data: lesson, error: createError } = await supabase
      .from('vocabulary_lessons')
      .insert({
        teacher_id: teacherId,
        classroom_id: classroomId || null,
        name: curriculumList.name,
        description: curriculumList.description,
        language: curriculumList.language,
        words: curriculumList.words,
        is_public: false,
        source_game_code: null,
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating lesson from curriculum:', createError);
      return { data: null, error: { message: createError.message } };
    }

    return { data: lesson, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in importCurriculumToLesson:', error);
    return { data: null, error: { message: error } };
  }
}
