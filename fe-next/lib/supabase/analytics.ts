import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type { StudentLessonProgress } from './teacher';

// =============================================
// TYPE DEFINITIONS
// =============================================

export interface ClassroomMetrics {
  /** Count of students with overall accuracy <60% in last 7 days */
  studentsNeedingHelp: number;
  /** Mean total_xp across all classroom students */
  classAverageXp: number;
  /** Students with last_practice_date = today */
  activeStudentsToday: number;
  /** % students who practiced 3+ days in last 7 days */
  weeklyEngagement: number;
  /** Total members in classroom */
  totalStudents: number;
}

export interface CommonMistake {
  word: string;
  errorRate: number;
  studentCount: number;
}

export interface StudentProgressMetrics {
  vocabularyMastery: number;
  accuracyTrend: Array<{ date: string; accuracy: number }>;
  skillProgression: Array<{ date: string; xp: number }>;
}

export interface LessonEffectivenessData {
  lessonId: string;
  lessonName: string;
  totalStudents: number;
  averageXpGain: number;
  completionRate: number;
  averageAccuracy: number;
  avgTimeToMastery: number;
}

export interface StudentProgressSummary {
  studentId: string;
  displayName: string;
  avatarUrl: string | null;
  totalXp: number;
  currentLevel: number;
  vocabularyMastery: number;   // % words mastered
  overallAccuracy: number;     // % correct / attempts
  wordsAttempted: number;
  wordsMastered: number;
  lastPracticeDate: string | null;
  isStruggling: boolean;       // accuracy < 60%
  currentStreak: number;
}

// =============================================
// ANALYTICS QUERIES
// =============================================

/**
 * Get classroom metrics (students needing help, average XP, etc.)
 *
 * @param classroomId - Classroom ID
 * @returns Classroom metrics and error (if any)
 */
export async function getClassroomMetrics(
  classroomId: string
): Promise<{ data: ClassroomMetrics | null; error: { message: string } | null }> {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }

  try {
    // Get all students in classroom
    const { data: memberships, error: memberError } = await supabase
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', classroomId);

    if (memberError) {
      logger.error('Error fetching classroom memberships:', memberError);
      return { data: null, error: { message: memberError.message } };
    }

    if (!memberships || memberships.length === 0) {
      return {
        data: {
          studentsNeedingHelp: 0,
          classAverageXp: 0,
          activeStudentsToday: 0,
          weeklyEngagement: 0,
          totalStudents: 0,
        },
        error: null,
      };
    }

    const studentIds = memberships.map(m => m.student_id);
    const totalStudents = memberships.length;

    // Get progress for all students in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: progressData, error: progressError } = await supabase
      .from('student_lesson_progress')
      .select('student_id, total_xp, words_attempted, last_practice_date')
      .in('student_id', studentIds)
      .gte('last_practice_date', sevenDaysAgoStr);

    if (progressError) {
      logger.error('Error fetching student progress:', progressError);
      return { data: null, error: { message: progressError.message } };
    }

    // Calculate metrics
    let totalXp = 0;
    let studentsNeedingHelp = 0;
    let activeStudentsToday = 0;
    const today = new Date().toISOString().split('T')[0];

    // Track students by ID to aggregate across lessons
    const studentMetrics = new Map<string, {
      totalXp: number;
      totalCorrect: number;
      totalAttempts: number;
      lastPracticeDate: string | null;
    }>();

    if (progressData) {
      progressData.forEach((progress: StudentLessonProgress) => {
        const existing = studentMetrics.get(progress.student_id);

        // Calculate accuracy from words_attempted
        let correct = 0;
        let attempts = 0;
        if (progress.words_attempted) {
          Object.values(progress.words_attempted).forEach(word => {
            correct += word.correct || 0;
            attempts += word.attempts || 0;
          });
        }

        if (existing) {
          existing.totalXp += progress.total_xp || 0;
          existing.totalCorrect += correct;
          existing.totalAttempts += attempts;
          if (progress.last_practice_date) {
            if (!existing.lastPracticeDate || progress.last_practice_date > existing.lastPracticeDate) {
              existing.lastPracticeDate = progress.last_practice_date;
            }
          }
        } else {
          studentMetrics.set(progress.student_id, {
            totalXp: progress.total_xp || 0,
            totalCorrect: correct,
            totalAttempts: attempts,
            lastPracticeDate: progress.last_practice_date,
          });
        }
      });
    }

    // Aggregate metrics
    studentMetrics.forEach((metrics) => {
      totalXp += metrics.totalXp;

      // Check if needs help (accuracy < 60%)
      if (metrics.totalAttempts > 0) {
        const accuracy = metrics.totalCorrect / metrics.totalAttempts;
        if (accuracy < 0.6) {
          studentsNeedingHelp++;
        }
      }

      // Check if active today
      if (metrics.lastPracticeDate === today) {
        activeStudentsToday++;
      }
    });

    const classAverageXp = studentMetrics.size > 0 ? Math.round(totalXp / studentMetrics.size) : 0;

    // Weekly engagement: % students with 3+ practice days in last 7 days
    // TODO: Implement when we have daily practice tracking
    const weeklyEngagement = 0;

    return {
      data: {
        studentsNeedingHelp,
        classAverageXp,
        activeStudentsToday,
        weeklyEngagement,
        totalStudents,
      },
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getClassroomMetrics:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Get common mistakes across classroom (top N words with highest error rate)
 *
 * @param classroomId - Classroom ID
 * @param limit - Number of words to return (default: 5)
 * @returns Common mistakes and error (if any)
 */
export async function getCommonMistakes(
  classroomId: string,
  limit: number = 5
): Promise<{ data: CommonMistake[] | null; error: { message: string } | null }> {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }

  try {
    // Get all students in classroom
    const { data: memberships, error: memberError } = await supabase
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', classroomId);

    if (memberError) {
      logger.error('Error fetching classroom memberships:', memberError);
      return { data: null, error: { message: memberError.message } };
    }

    if (!memberships || memberships.length === 0) {
      return { data: [], error: null };
    }

    const studentIds = memberships.map(m => m.student_id);

    // Get progress for all students
    const { data: progressData, error: progressError } = await supabase
      .from('student_lesson_progress')
      .select('student_id, words_attempted')
      .in('student_id', studentIds);

    if (progressError) {
      logger.error('Error fetching student progress:', progressError);
      return { data: null, error: { message: progressError.message } };
    }

    // Aggregate word attempts across all students
    const wordStats = new Map<string, {
      attempts: number;
      correct: number;
      studentCount: number;
      students: Set<string>;
    }>();

    if (progressData) {
      progressData.forEach((progress: StudentLessonProgress) => {
        if (!progress.words_attempted) return;

        Object.entries(progress.words_attempted).forEach(([word, wordAttempt]) => {
          const existing = wordStats.get(word);
          if (existing) {
            existing.attempts += wordAttempt.attempts || 0;
            existing.correct += wordAttempt.correct || 0;
            if (!existing.students.has(progress.student_id)) {
              existing.students.add(progress.student_id);
              existing.studentCount++;
            }
          } else {
            wordStats.set(word, {
              attempts: wordAttempt.attempts || 0,
              correct: wordAttempt.correct || 0,
              studentCount: 1,
              students: new Set([progress.student_id]),
            });
          }
        });
      });
    }

    // Calculate error rates and filter
    const mistakes: CommonMistake[] = [];
    wordStats.forEach((stats, word) => {
      if (stats.attempts > 0) {
        const errorRate = 1 - (stats.correct / stats.attempts);
        // Only include words with >50% error rate
        if (errorRate > 0.5) {
          mistakes.push({
            word,
            errorRate,
            studentCount: stats.studentCount,
          });
        }
      }
    });

    // Sort by error rate descending and limit
    mistakes.sort((a, b) => b.errorRate - a.errorRate);
    const limited = mistakes.slice(0, limit);

    return { data: limited, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getCommonMistakes:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Get student progress metrics (vocabulary mastery, accuracy trend, skill progression)
 *
 * @param studentId - Student ID
 * @param classroomId - Classroom ID
 * @returns Student progress metrics and error (if any)
 */
export async function getStudentProgressMetrics(
  studentId: string,
  classroomId: string
): Promise<{ data: StudentProgressMetrics | null; error: { message: string } | null }> {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }

  try {
    // Get student's lesson progress
    const { data: progressData, error: progressError } = await supabase
      .from('student_lesson_progress')
      .select('lesson_id, words_mastered, words_attempted')
      .eq('student_id', studentId)
      .maybeSingle();

    if (progressError) {
      logger.error('Error fetching student progress:', progressError);
      return { data: null, error: { message: progressError.message } };
    }

    if (!progressData) {
      return {
        data: {
          vocabularyMastery: 0,
          accuracyTrend: [],
          skillProgression: [],
        },
        error: null,
      };
    }

    // Get lesson to calculate mastery percentage
    const { data: lesson, error: lessonError } = await supabase
      .from('vocabulary_lessons')
      .select('words')
      .eq('id', progressData.lesson_id)
      .single();

    if (lessonError) {
      logger.error('Error fetching lesson:', lessonError);
      return { data: null, error: { message: lessonError.message } };
    }

    // Calculate vocabulary mastery
    const totalWords = lesson.words?.length || 0;
    const masteredWords = progressData.words_mastered?.length || 0;
    const vocabularyMastery = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;

    // TODO: Implement accuracy trend (requires daily tracking)
    const accuracyTrend: Array<{ date: string; accuracy: number }> = [];

    // TODO: Implement skill progression (requires daily XP tracking)
    const skillProgression: Array<{ date: string; xp: number }> = [];

    return {
      data: {
        vocabularyMastery,
        accuracyTrend,
        skillProgression,
      },
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getStudentProgressMetrics:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Get progress summary for all students in a classroom
 *
 * @param classroomId - Classroom ID
 * @returns Array of student progress summaries and error (if any)
 */
export async function getStudentsProgressSummary(
  classroomId: string
): Promise<{ data: StudentProgressSummary[]; error: { message: string } | null }> {
  if (!supabase) {
    return { data: [], error: { message: 'Supabase not configured' } };
  }

  try {
    // Get all students in classroom
    const { data: memberships, error: memberError } = await supabase
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', classroomId);

    if (memberError) {
      logger.error('Error fetching classroom memberships:', memberError);
      return { data: [], error: { message: memberError.message } };
    }

    if (!memberships || memberships.length === 0) {
      return { data: [], error: null };
    }

    const studentIds = memberships.map(m => m.student_id);

    // Get profiles for display data
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', studentIds);

    if (profileError) {
      logger.error('Error fetching profiles:', profileError);
      return { data: [], error: { message: profileError.message } };
    }

    // Get progress for all students
    const { data: progressData, error: progressError } = await supabase
      .from('student_lesson_progress')
      .select('student_id, lesson_id, total_xp, current_level, current_streak, words_mastered, words_attempted, last_practice_date')
      .in('student_id', studentIds);

    if (progressError) {
      logger.error('Error fetching student progress:', progressError);
      return { data: [], error: { message: progressError.message } };
    }

    // Get unique lesson IDs from progress data
    const lessonIds = [...new Set(progressData?.map(p => p.lesson_id) || [])];

    // Get lesson data to calculate mastery
    const lessonWordsMap = new Map<string, number>();
    if (lessonIds.length > 0) {
      const { data: lessonsData, error: lessonError } = await supabase
        .from('vocabulary_lessons')
        .select('id, words')
        .in('id', lessonIds);

      if (!lessonError && lessonsData) {
        lessonsData.forEach(lesson => {
          lessonWordsMap.set(lesson.id, lesson.words?.length || 0);
        });
      }
    }

    // Build student summaries
    const summaries: StudentProgressSummary[] = [];

    studentIds.forEach(studentId => {
      const profile = profiles?.find(p => p.id === studentId);
      if (!profile) return;

      // Aggregate progress across all lessons for this student
      const studentProgress = progressData?.filter(p => p.student_id === studentId) || [];

      let totalXp = 0;
      let currentLevel = 1;
      let currentStreak = 0;
      let wordsMastered = 0;
      let totalLessonWords = 0;
      let wordsAttempted = 0;
      let totalCorrect = 0;
      let totalAttempts = 0;
      let lastPracticeDate: string | null = null;

      studentProgress.forEach(progress => {
        totalXp += progress.total_xp || 0;
        currentLevel = Math.max(currentLevel, progress.current_level || 1);
        currentStreak = Math.max(currentStreak, progress.current_streak || 0);
        wordsMastered += progress.words_mastered?.length || 0;

        // Add lesson words to total
        const lessonWords = lessonWordsMap.get(progress.lesson_id) || 0;
        totalLessonWords += lessonWords;

        // Calculate accuracy from words_attempted
        if (progress.words_attempted) {
          Object.values(progress.words_attempted).forEach(word => {
            const correct = word.correct || 0;
            const attempts = word.attempts || 0;
            totalCorrect += correct;
            totalAttempts += attempts;
          });
        }

        // Count unique words attempted (not total attempts)
        wordsAttempted += Object.keys(progress.words_attempted || {}).length;

        // Track most recent practice date
        if (progress.last_practice_date) {
          if (!lastPracticeDate || progress.last_practice_date > lastPracticeDate) {
            lastPracticeDate = progress.last_practice_date;
          }
        }
      });

      // Calculate overall accuracy percentage
      const overallAccuracy = totalAttempts > 0
        ? Math.round((totalCorrect / totalAttempts) * 100)
        : 0;

      // Calculate vocabulary mastery percentage (mastered / total lesson words)
      const vocabularyMastery = totalLessonWords > 0
        ? Math.round((wordsMastered / totalLessonWords) * 100)
        : 0;

      // Mark as struggling if accuracy < 60%
      const isStruggling = totalAttempts > 0 && overallAccuracy < 60;

      summaries.push({
        studentId,
        displayName: profile.display_name || 'Unknown',
        avatarUrl: profile.avatar_url,
        totalXp,
        currentLevel,
        vocabularyMastery,
        overallAccuracy,
        wordsAttempted,
        wordsMastered,
        lastPracticeDate,
        isStruggling,
        currentStreak,
      });
    });

    return { data: summaries, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getStudentsProgressSummary:', error);
    return { data: [], error: { message: error } };
  }
}

/**
 * Get lesson effectiveness metrics for a classroom
 *
 * @param classroomId - Classroom ID
 * @returns Array of lesson effectiveness data and error (if any)
 */
export async function getLessonEffectiveness(
  classroomId: string
): Promise<{ data: LessonEffectivenessData[]; error: { message: string } | null }> {
  if (!supabase) {
    return { data: [], error: { message: 'Supabase not configured' } };
  }

  try {
    // Get all lessons assigned to this classroom
    const { data: assignments, error: assignmentError } = await supabase
      .from('lesson_assignments')
      .select('lesson_id')
      .eq('classroom_id', classroomId);

    if (assignmentError) {
      logger.error('Error fetching lesson assignments:', assignmentError);
      return { data: [], error: { message: assignmentError.message } };
    }

    if (!assignments || assignments.length === 0) {
      return { data: [], error: null };
    }

    const lessonIds = assignments.map(a => a.lesson_id);

    // Get lesson names
    const { data: lessons, error: lessonError } = await supabase
      .from('vocabulary_lessons')
      .select('id, name')
      .in('id', lessonIds);

    if (lessonError) {
      logger.error('Error fetching lessons:', lessonError);
      return { data: [], error: { message: lessonError.message } };
    }

    // Get all students in classroom
    const { data: memberships, error: memberError } = await supabase
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', classroomId);

    if (memberError) {
      logger.error('Error fetching classroom memberships:', memberError);
      return { data: [], error: { message: memberError.message } };
    }

    if (!memberships || memberships.length === 0) {
      return { data: [], error: null };
    }

    const studentIds = memberships.map(m => m.student_id);

    // Get progress for all students in these lessons
    const { data: progressData, error: progressError } = await supabase
      .from('student_lesson_progress')
      .select('student_id, lesson_id, total_xp, completed_at, words_attempted')
      .in('student_id', studentIds)
      .eq('classroom_id', classroomId);

    if (progressError) {
      logger.error('Error fetching student progress:', progressError);
      return { data: [], error: { message: progressError.message } };
    }

    // Aggregate metrics per lesson
    const lessonMetrics = new Map<string, {
      students: Set<string>;
      totalXp: number;
      completed: number;
      totalCorrect: number;
      totalAttempts: number;
    }>();

    lessonIds.forEach(lessonId => {
      lessonMetrics.set(lessonId, {
        students: new Set(),
        totalXp: 0,
        completed: 0,
        totalCorrect: 0,
        totalAttempts: 0,
      });
    });

    if (progressData) {
      progressData.forEach((progress: StudentLessonProgress) => {
        const metrics = lessonMetrics.get(progress.lesson_id);
        if (!metrics) return;

        metrics.students.add(progress.student_id);
        metrics.totalXp += progress.total_xp || 0;
        if (progress.completed_at) {
          metrics.completed++;
        }

        // Calculate accuracy from words_attempted
        if (progress.words_attempted) {
          Object.values(progress.words_attempted).forEach(word => {
            metrics.totalCorrect += word.correct || 0;
            metrics.totalAttempts += word.attempts || 0;
          });
        }
      });
    }

    // Build effectiveness data
    const effectivenessData: LessonEffectivenessData[] = [];

    lessonIds.forEach(lessonId => {
      const lesson = lessons?.find(l => l.id === lessonId);
      if (!lesson) return;

      const metrics = lessonMetrics.get(lessonId);
      if (!metrics) return;

      const totalStudents = metrics.students.size;
      if (totalStudents === 0) return;

      const averageXpGain = Math.round(metrics.totalXp / totalStudents);
      const completionRate = totalStudents > 0
        ? Math.round((metrics.completed / totalStudents) * 10000) / 100
        : 0;
      const averageAccuracy = metrics.totalAttempts > 0
        ? Math.round((metrics.totalCorrect / metrics.totalAttempts) * 100)
        : 0;

      effectivenessData.push({
        lessonId,
        lessonName: lesson.name,
        totalStudents,
        averageXpGain,
        completionRate,
        averageAccuracy,
        avgTimeToMastery: 0, // TODO: Implement when we have time tracking
      });
    });

    return { data: effectivenessData, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getLessonEffectiveness:', error);
    return { data: [], error: { message: error } };
  }
}
