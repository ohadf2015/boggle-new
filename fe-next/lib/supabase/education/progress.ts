import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { normalizeForStorage, type StudentLessonProgress, type WordAttempt } from './types';

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
 * Update student progress for a word attempt
 */
export async function updateProgress(
  studentId: string,
  lessonId: string,
  wordAttempt: { word: string; correct: boolean }
): Promise<{ data: StudentLessonProgress | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    // Get existing progress or create new
    const { data: existing, error: fetchError } = await supabase
      .from('student_lesson_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (fetchError) {
      logger.error('Error fetching progress:', fetchError);
      return { data: null, error: { message: fetchError.message } };
    }

    const now = new Date().toISOString();
    const { word: rawWord, correct } = wordAttempt;

    // Normalize word for consistent storage (handles Hebrew final letters, case, etc.)
    // This ensures "שלומ" and "שלום" are stored under the same key
    const word = normalizeForStorage(rawWord);

    if (existing) {
      // Update existing progress
      const wordsAttempted = existing.words_attempted || {};
      const currentAttempt = wordsAttempted[word] || { attempts: 0, correct: 0, lastAttemptAt: now };

      // If incorrect, reset the "correct" streak counter (3 correct IN A ROW)
      const updatedAttempt: WordAttempt = {
        attempts: currentAttempt.attempts + 1,
        correct: correct ? currentAttempt.correct + 1 : 0,  // Reset on incorrect
        lastAttemptAt: now
      };

      wordsAttempted[word] = updatedAttempt;

      // Check if word should be marked as mastered (3 correct IN A ROW)
      const wordsMastered = existing.words_mastered || [];
      // Normalize existing mastered words for comparison (handles legacy data with different forms)
      const normalizedMastered = wordsMastered.map((w: string) => normalizeForStorage(w));
      if (correct && updatedAttempt.correct >= 3 && !normalizedMastered.includes(word)) {
        wordsMastered.push(word);
      }

      const { data: updated, error: updateError } = await supabase
        .from('student_lesson_progress')
        .update({
          words_attempted: wordsAttempted,
          words_mastered: wordsMastered
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        logger.error('Error updating progress:', updateError);
        return { data: null, error: { message: updateError.message } };
      }

      return { data: updated, error: null };
    } else {
      // Create new progress record
      const wordsAttempted: Record<string, WordAttempt> = {
        [word]: {
          attempts: 1,
          correct: correct ? 1 : 0,
          lastAttemptAt: now
        }
      };

      const wordsMastered: string[] = []; // Need 3 correct IN A ROW for mastery

      const { data: created, error: createError } = await supabase
        .from('student_lesson_progress')
        .insert({
          student_id: studentId,
          lesson_id: lessonId,
          words_attempted: wordsAttempted,
          words_mastered: wordsMastered,
          started_at: now
        })
        .select()
        .single();

      if (createError) {
        logger.error('Error creating progress:', createError);
        return { data: null, error: { message: createError.message } };
      }

      return { data: created, error: null };
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in updateProgress:', error);
    return { data: null, error: { message: error } };
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

// ============================================
// SPACED REPETITION EXTENSION
// ============================================

export interface WordAttemptWithSR extends WordAttempt {
  intervalDays?: number;
  easinessFactor?: number;
  repetitions?: number;
  nextReviewDate?: string;
}

/**
 * Update spaced repetition scheduling data for a specific word in a student's progress.
 * Merges SR fields into the existing word attempt data.
 */
export async function updateWordSpacedRepetition(
  studentId: string,
  lessonId: string,
  word: string,
  srData: {
    intervalDays: number;
    easinessFactor: number;
    repetitions: number;
    nextReviewDate: string;
  }
): Promise<{ data: StudentLessonProgress | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    // Fetch existing progress
    const { data: existing, error: fetchError } = await supabase
      .from('student_lesson_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (fetchError) {
      logger.error('Error fetching progress for SR update:', fetchError);
      return { data: null, error: { message: fetchError.message } };
    }

    if (!existing) {
      return { data: null, error: { message: `Progress not found for student ${studentId} in lesson ${lessonId}` } };
    }

    // Merge SR data into the word's attempt entry
    const wordsAttempted = existing.words_attempted || {};
    const currentWordData: WordAttemptWithSR = wordsAttempted[word] || {
      attempts: 0,
      correct: 0,
      lastAttemptAt: new Date().toISOString(),
    };

    const updatedWordData: WordAttemptWithSR = {
      ...currentWordData,
      ...srData,
    };

    const updatedWordsAttempted = {
      ...wordsAttempted,
      [word]: updatedWordData,
    };

    const { data: updated, error: updateError } = await supabase
      .from('student_lesson_progress')
      .update({ words_attempted: updatedWordsAttempted })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating SR data:', updateError);
      return { data: null, error: { message: updateError.message } };
    }

    return { data: updated, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in updateWordSpacedRepetition:', error);
    return { data: null, error: { message: error } };
  }
}
