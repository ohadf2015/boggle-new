/**
 * Practice Session Operations
 * DB operations for practice_sessions table
 */

import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type PracticeMode = 'matching' | 'spelling' | 'blitz' | 'flashcard' | 'board';

export interface PracticeSessionRow {
  id: string;
  student_id: string;
  lesson_id: string;
  classroom_id: string | null;
  mode: PracticeMode;
  score: number;
  accuracy: number | null;
  words_attempted: number;
  words_correct: number;
  duration_seconds: number | null;
  results: Record<string, unknown> | null;
  xp_awarded: number;
  created_at: string;
  completed_at: string | null;
}

export interface CreatePracticeSessionData {
  studentId: string;
  lessonId: string;
  classroomId?: string | null;
  mode: PracticeMode;
}

export interface CompletePracticeSessionData {
  score: number;
  accuracy?: number;
  wordsAttempted: number;
  wordsCorrect: number;
  durationSeconds?: number;
  results?: Record<string, unknown>;
  xpAwarded: number;
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create a new practice session
 * @param data - Session creation data
 * @returns Created session row or error
 */
export async function createPracticeSession(
  data: CreatePracticeSessionData
): Promise<{ data: PracticeSessionRow | null; error: { message: string } | null }> {
  try {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

const { data: session, error } = await supabase
      .from('practice_sessions')
      .insert({
        student_id: data.studentId,
        lesson_id: data.lessonId,
        classroom_id: data.classroomId || null,
        mode: data.mode,
        score: 0,
        accuracy: null,
        words_attempted: 0,
        words_correct: 0,
        duration_seconds: null,
        results: null,
        xp_awarded: 0,
        completed_at: null,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating practice session:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: session as PracticeSessionRow, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in createPracticeSession:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Complete a practice session (sets completed_at and updates stats)
 * @param sessionId - Session UUID
 * @param data - Completion data
 * @returns Updated session row or error
 */
export async function completePracticeSession(
  sessionId: string,
  data: CompletePracticeSessionData
): Promise<{ data: PracticeSessionRow | null; error: { message: string } | null }> {
  try {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

const { data: session, error } = await supabase
      .from('practice_sessions')
      .update({
        score: data.score,
        accuracy: data.accuracy ?? null,
        words_attempted: data.wordsAttempted,
        words_correct: data.wordsCorrect,
        duration_seconds: data.durationSeconds ?? null,
        results: data.results ?? null,
        xp_awarded: data.xpAwarded,
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      logger.error('Error completing practice session:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: session as PracticeSessionRow, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in completePracticeSession:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Get practice sessions with optional filters
 * @param studentId - Student UUID
 * @param lessonId - Optional lesson filter
 * @param mode - Optional mode filter
 * @returns Array of session rows or error
 */
export async function getPracticeSessions(
  studentId: string,
  lessonId?: string,
  mode?: PracticeMode
): Promise<{ data: PracticeSessionRow[]; error: { message: string } | null }> {
  try {
    if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

let query = supabase
      .from('practice_sessions')
      .select('*')
      .eq('student_id', studentId);

    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }

    if (mode) {
      query = query.eq('mode', mode);
    }

    const { data: sessions, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching practice sessions:', error);
      return { data: [], error: { message: error.message } };
    }

    return { data: (sessions || []) as PracticeSessionRow[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getPracticeSessions:', error);
    return { data: [], error: { message: error } };
  }
}

/**
 * Get all practice sessions for a specific lesson (teacher analytics view)
 * @param lessonId - Lesson UUID
 * @param classroomId - Optional classroom filter
 * @returns Array of session rows or error
 */
export async function getPracticeSessionsForLesson(
  lessonId: string,
  classroomId?: string
): Promise<{ data: PracticeSessionRow[]; error: { message: string } | null }> {
  try {
    if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

    let query = supabase
      .from('practice_sessions')
      .select('*')
      .eq('lesson_id', lessonId);

    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }

    const { data: sessions, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching sessions for lesson:', error);
      return { data: [], error: { message: error.message } };
    }

    return { data: (sessions || []) as PracticeSessionRow[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getPracticeSessionsForLesson:', error);
    return { data: [], error: { message: error } };
  }
}

/**
 * Get a single practice session by ID
 * @param sessionId - Session UUID
 * @returns Session row or error
 */
export async function getPracticeSessionById(
  sessionId: string
): Promise<{ data: PracticeSessionRow | null; error: { message: string } | null }> {
  try {
    if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

const { data: session, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      logger.error('Error fetching practice session:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: session as PracticeSessionRow, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getPracticeSessionById:', error);
    return { data: null, error: { message: error } };
  }
}
