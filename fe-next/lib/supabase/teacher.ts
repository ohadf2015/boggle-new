import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { normalizeWord, normalizeHebrewWord } from '@/shared/utils/wordNormalization';

/**
 * Detect if a string contains Hebrew characters
 * Used to ensure Hebrew normalization is applied even if language is missing
 */
function containsHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

/**
 * Normalize a word for storage/comparison, with smart language detection
 * Falls back to Hebrew normalization if Hebrew characters are detected
 */
function normalizeForStorage(word: string, language?: Language): string {
  // If word contains Hebrew characters, always use Hebrew normalization
  if (containsHebrew(word)) {
    return normalizeHebrewWord(word);
  }
  // Otherwise use the specified language or default to lowercase
  return normalizeWord(word, language || 'en');
}

// Types matching database schema from migration 056
export type Language = 'en' | 'he' | 'sv' | 'ja';

export interface Classroom {
  id: string;
  teacher_id: string;
  name: string;
  join_code: string;
  language: Language;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface VocabularyWord {
  word: string;
  definition?: string;
  canIntegrate: boolean;
}

export interface VocabularyLesson {
  id: string;
  teacher_id: string;
  classroom_id: string | null;
  name: string;
  description: string | null;
  language: Language;
  words: VocabularyWord[];
  is_public: boolean;
  source_game_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface WordAttempt {
  attempts: number;
  correct: number;
  lastAttemptAt: string;
}

export interface StudentLessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  assignment_id: string | null;
  words_attempted: Record<string, WordAttempt>;
  words_mastered: string[];
  started_at: string;
  completed_at: string | null;
  // XP tracking fields (from migration 062)
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_practice_date: string | null;
  total_practice_sessions: number;
}

export interface LessonAssignment {
  id: string;
  lesson_id: string;
  classroom_id: string;
  due_date: string | null;
  created_at: string;
  vocabulary_lessons?: VocabularyLesson;
}

export interface ClassroomWithMembers extends Classroom {
  member_count: number;
}

export interface ClassroomStudent {
  id: string;
  student_id: string;
  classroom_id: string;
  joined_at: string;
  profiles: any; // Supabase returns array, need to normalize
}

// =============================================
// CLASSROOM QUERIES
// =============================================

/**
 * Get all classrooms for a teacher
 */
export async function getClassrooms(teacherId: string): Promise<{ data: ClassroomWithMembers[]; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

  try {
    // Get classrooms with member count
    const { data: classrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (classroomsError) {
      logger.error('Error fetching classrooms:', classroomsError);
      return { data: [], error: { message: classroomsError.message } };
    }

    if (!classrooms || classrooms.length === 0) {
      return { data: [], error: null };
    }

    // Get member counts for all classrooms in one query
    const { data: memberships, error: membershipsError } = await supabase
      .from('classroom_memberships')
      .select('classroom_id')
      .in('classroom_id', classrooms.map(c => c.id));

    if (membershipsError) {
      logger.error('Error fetching memberships:', membershipsError);
      // Return classrooms without member counts rather than failing
      return {
        data: classrooms.map(c => ({ ...c, member_count: 0 })),
        error: null
      };
    }

    // Count members per classroom
    const memberCounts = (memberships || []).reduce((acc, m) => {
      acc[m.classroom_id] = (acc[m.classroom_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Attach member counts
    const classroomsWithCounts = classrooms.map(classroom => ({
      ...classroom,
      member_count: memberCounts[classroom.id] || 0
    }));

    return { data: classroomsWithCounts, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getClassrooms:', error);
    return { data: [], error: { message: error } };
  }
}

/**
 * Get a single classroom by ID
 */
export async function getClassroom(classroomId: string): Promise<{ data: ClassroomWithMembers | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', classroomId)
      .single();

    if (classroomError) {
      logger.error('Error fetching classroom:', classroomError);
      return { data: null, error: { message: classroomError.message } };
    }

    // Get member count
    const { count, error: countError } = await supabase
      .from('classroom_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('classroom_id', classroomId);

    if (countError) {
      logger.error('Error counting members:', countError);
      return { data: { ...classroom, member_count: 0 }, error: null };
    }

    return { data: { ...classroom, member_count: count || 0 }, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getClassroom:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Create a new classroom (join_code auto-generated by trigger)
 */
export async function createClassroom(
  data: Omit<Classroom, 'id' | 'join_code' | 'created_at' | 'updated_at' | 'member_count'>
): Promise<{ data: Classroom | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    const { data: classroom, error } = await supabase
      .from('classrooms')
      .insert(data)
      .select()
      .single();

    if (error) {
      logger.error('Error creating classroom:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: classroom, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in createClassroom:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Update a classroom
 */
export async function updateClassroom(
  id: string,
  updates: Partial<Pick<Classroom, 'name' | 'language'>>
): Promise<{ data: Classroom | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    const { data: classroom, error } = await supabase
      .from('classrooms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating classroom:', error);
      return { data: null, error: { message: error.message } };
    }

    return { data: classroom, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in updateClassroom:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Delete a classroom (cascades to memberships via foreign key)
 */
export async function deleteClassroom(id: string): Promise<{ error: { message: string } | null }> {
  if (!supabase) return { error: { message: 'Supabase not configured' } };

  try {
    const { error } = await supabase
      .from('classrooms')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting classroom:', error);
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in deleteClassroom:', error);
    return { error: { message: error } };
  }
}

/**
 * Join a classroom using join code
 */
export async function joinClassroom(
  joinCode: string,
  studentId: string
): Promise<{ data: { classroom_id: string } | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    // Normalize the join code (trim whitespace and uppercase)
    const normalizedCode = joinCode.trim().toUpperCase();

    // Validate code format BEFORE database query (fail fast)
    if (!normalizedCode || normalizedCode.length !== 6) {
      return { data: null, error: { message: 'Invalid join code format (must be 6 characters)' } };
    }

    if (!/^[A-Z0-9]+$/.test(normalizedCode)) {
      return { data: null, error: { message: 'Invalid join code format (letters and numbers only)' } };
    }

    // Find classroom by join code using secure RPC function
    // This prevents enumeration of all classrooms (security fix)
    const { data: classroomResult, error: classroomError } = await supabase
      .rpc('lookup_classroom_by_join_code', { p_join_code: normalizedCode });

    if (classroomError) {
      logger.error('Error querying classroom:', classroomError);
      return { data: null, error: { message: classroomError.message } };
    }

    // RPC returns an array, get the first result
    const classroom = Array.isArray(classroomResult) ? classroomResult[0] : classroomResult;

    if (!classroom) {
      // Classroom not found - clearer error message
      return { data: null, error: { message: 'Classroom not found. Please check the code with your teacher.' } };
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('classroom_memberships')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing) {
      // Already a member - return success with classroom_id
      return { data: { classroom_id: classroom.id }, error: null };
    }

    // Add membership
    const { error: membershipError } = await supabase
      .from('classroom_memberships')
      .insert({
        classroom_id: classroom.id,
        student_id: studentId
      });

    if (membershipError) {
      logger.error('Error joining classroom:', membershipError);
      return { data: null, error: { message: membershipError.message } };
    }

    return { data: { classroom_id: classroom.id }, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in joinClassroom:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Get student's classroom from their membership
 *
 * Returns the classroom the student is a member of, or null if not a member of any.
 * If a student is a member of multiple classrooms, returns the most recently joined.
 */
export async function getStudentClassroom(
  studentId: string
): Promise<{ data: Classroom | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    // Query membership with joined classroom info, ordered by join date (most recent first)
    const { data: membership, error: membershipError } = await supabase
      .from('classroom_memberships')
      .select(`
        id,
        classroom_id,
        joined_at,
        classrooms (
          id,
          teacher_id,
          name,
          join_code,
          language,
          created_at,
          updated_at
        )
      `)
      .eq('student_id', studentId)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      logger.error('Error fetching student classroom:', membershipError);
      return { data: null, error: { message: membershipError.message } };
    }

    if (!membership || !membership.classrooms) {
      return { data: null, error: null };
    }

    // Extract classroom from the nested structure
    const classroom = membership.classrooms as unknown as Classroom;

    return { data: classroom, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getStudentClassroom:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Get all students in a classroom with their profile information
 */
export async function getClassroomStudents(
  classroomId: string
): Promise<{ data: ClassroomStudent[]; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

  try {
    // First, get all memberships for this classroom
    const { data: memberships, error: membershipError } = await supabase
      .from('classroom_memberships')
      .select('id, student_id, classroom_id, joined_at')
      .eq('classroom_id', classroomId)
      .order('joined_at', { ascending: true });

    if (membershipError) {
      logger.error('Error fetching classroom memberships:', membershipError);
      return { data: [], error: { message: membershipError.message } };
    }

    if (!memberships || memberships.length === 0) {
      return { data: [], error: null };
    }

    // Then, fetch profiles for all student_ids
    // profiles.id = auth.users.id = classroom_memberships.student_id
    const studentIds = memberships.map(m => m.student_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_emoji, avatar_color, profile_picture_url')
      .in('id', studentIds);

    if (profilesError) {
      logger.error('Error fetching student profiles:', profilesError);
      // Return memberships without profile data rather than failing completely
    }

    // Create a map of profiles by id for quick lookup
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Combine memberships with their profiles
    const studentsWithProfiles = memberships.map(membership => ({
      ...membership,
      profiles: profileMap.get(membership.student_id) || null,
    }));

    return { data: studentsWithProfiles as ClassroomStudent[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getClassroomStudents:', error);
    return { data: [], error: { message: error } };
  }
}

// =============================================
// LESSON QUERIES
// =============================================

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

// =============================================
// PROGRESS QUERIES
// =============================================

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

// =============================================
// LESSON ASSIGNMENT QUERIES
// =============================================

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

// =============================================
// LEADERBOARD QUERIES
// =============================================

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalXp: number;
  currentLevel: number;
  rank: number;
  isCurrentUser: boolean;
  isInactive: boolean; // 7+ days since last practice
}

export interface ClassroomLeaderboardData {
  topThree: LeaderboardEntry[];
  currentUserRank: LeaderboardEntry | null;
  totalStudents: number;
}

/**
 * Get classroom leaderboard (top 3 students + current user rank)
 *
 * @param classroomId - Classroom ID
 * @param currentUserId - Current student's ID (to mark isCurrentUser)
 * @param timeScope - 'all-time' (default) or 'weekly'
 */
export async function getClassroomLeaderboard(
  classroomId: string,
  currentUserId: string,
  timeScope: 'weekly' | 'all-time' = 'all-time'
): Promise<{ data: ClassroomLeaderboardData; error: { message: string } | null }> {
  if (!supabase) {
    return {
      data: { topThree: [], currentUserRank: null, totalStudents: 0 },
      error: { message: 'Supabase not configured' },
    };
  }

  try {
    // Get all students in classroom (student_id only)
    const { data: memberships, error: memberError } = await supabase
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', classroomId);

    if (memberError) {
      logger.error('Error fetching classroom memberships:', memberError);
      return {
        data: { topThree: [], currentUserRank: null, totalStudents: 0 },
        error: { message: memberError.message },
      };
    }

    if (!memberships || memberships.length === 0) {
      return {
        data: { topThree: [], currentUserRank: null, totalStudents: 0 },
        error: null,
      };
    }

    const studentIds = memberships.map(m => m.student_id);

    // Fetch profiles for all student_ids separately (profiles.id = auth.users.id = student_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_emoji, avatar_color')
      .in('id', studentIds);

    if (profilesError) {
      logger.error('Error fetching student profiles:', profilesError);
      // Continue without profile data rather than failing completely
    }

    // Create a map of profiles by id for quick lookup
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Get progress for all students in this classroom
    // For weekly scope: filter by last_practice_date within last 7 days
    let query = supabase
      .from('student_lesson_progress')
      .select('student_id, total_xp, current_level, last_practice_date')
      .in('student_id', studentIds);

    if (timeScope === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('last_practice_date', weekAgo.toISOString().split('T')[0]);
    }

    const { data: progressData, error: progressError } = await query;

    if (progressError) {
      logger.error('Error fetching student progress:', progressError);
      return {
        data: { topThree: [], currentUserRank: null, totalStudents: 0 },
        error: { message: progressError.message },
      };
    }

    // Aggregate XP by student (sum across all lessons)
    const studentXpMap = new Map<string, {
      totalXp: number;
      currentLevel: number;
      lastPracticeDate: string | null;
    }>();

    if (progressData) {
      progressData.forEach(p => {
        const existing = studentXpMap.get(p.student_id);
        if (existing) {
          existing.totalXp += p.total_xp;
          // Use highest level and most recent practice date
          existing.currentLevel = Math.max(existing.currentLevel, p.current_level);
          if (p.last_practice_date) {
            if (!existing.lastPracticeDate || p.last_practice_date > existing.lastPracticeDate) {
              existing.lastPracticeDate = p.last_practice_date;
            }
          }
        } else {
          studentXpMap.set(p.student_id, {
            totalXp: p.total_xp,
            currentLevel: p.current_level,
            lastPracticeDate: p.last_practice_date,
          });
        }
      });
    }

    // Build leaderboard entries
    const entries: LeaderboardEntry[] = memberships.map(m => {
      const profile = profileMap.get(m.student_id);
      const xpData = studentXpMap.get(m.student_id);
      const totalXp = xpData?.totalXp || 0;
      const currentLevel = xpData?.currentLevel || 1;
      const lastPracticeDate = xpData?.lastPracticeDate;

      // Check if inactive (7+ days since last practice)
      let isInactive = false;
      if (lastPracticeDate) {
        const lastPractice = new Date(lastPracticeDate);
        const daysSince = Math.floor((Date.now() - lastPractice.getTime()) / (1000 * 60 * 60 * 24));
        isInactive = daysSince >= 7;
      }

      // Avatar URL construction (using emoji + color)
      const avatarUrl = profile?.avatar_emoji
        ? `data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="50" fill="${profile.avatar_color || '#4F46E5'}"/><text x="50" y="50" font-size="50" text-anchor="middle" dominant-baseline="central">${profile.avatar_emoji}</text></svg>`
          )}`
        : null;

      return {
        userId: m.student_id,
        displayName: profile?.display_name || 'Unknown Student',
        avatarUrl,
        totalXp,
        currentLevel,
        rank: 0, // Will be set below
        isCurrentUser: m.student_id === currentUserId,
        isInactive,
      };
    });

    // Sort by XP descending
    entries.sort((a, b) => b.totalXp - a.totalXp);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Get top 3
    const topThree = entries.slice(0, 3);

    // Get current user rank (if not in top 3)
    const currentUserInTopThree = topThree.some(e => e.isCurrentUser);
    const currentUserRank = currentUserInTopThree
      ? null
      : entries.find(e => e.isCurrentUser) || null;

    return {
      data: {
        topThree,
        currentUserRank,
        totalStudents: memberships.length,
      },
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getClassroomLeaderboard:', error);
    return {
      data: { topThree: [], currentUserRank: null, totalStudents: 0 },
      error: { message: error },
    };
  }
}
