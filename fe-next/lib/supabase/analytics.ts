import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type {
  WordsAttemptedRecord,
  ClassroomMetrics,
  CommonMistake,
  StudentProgressMetrics,
} from './analyticsTypes';

// Re-export all types for consumers
export type {
  ClassroomMetrics,
  CommonMistake,
  StudentProgressMetrics,
  LessonEffectivenessData,
  StudentProgressSummary,
  MasteryLevel,
  HeatmapCell,
  VocabularyHeatmapData,
  DateRange,
  StudentReportData,
  ClassReportData,
} from './analyticsTypes';

// Re-export report queries
export { getStudentReportData, getClassReportData, getVocabularyHeatmapData } from './analyticsReports';

// Re-export classroom analytics (extracted for file size)
export { getStudentsProgressSummary, getLessonEffectiveness } from './analyticsClassroom';

/**
 * Get classroom metrics (students needing help, average XP, etc.)
 */
export async function getClassroomMetrics(
  classroomId: string
): Promise<{ data: ClassroomMetrics | null; error: { message: string } | null }> {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }

  try {
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
          studentsNeedingHelp: 0, classAverageXp: 0,
          activeStudentsToday: 0, weeklyEngagement: 0, totalStudents: 0,
        },
        error: null,
      };
    }

    const studentIds = memberships.map(m => m.student_id);
    const totalStudents = memberships.length;

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

    let totalXp = 0;
    let studentsNeedingHelp = 0;
    let activeStudentsToday = 0;
    const today = new Date().toISOString().split('T')[0];

    const studentMetrics = new Map<string, {
      totalXp: number; totalCorrect: number; totalAttempts: number; lastPracticeDate: string | null;
    }>();

    if (progressData) {
      progressData.forEach((progress) => {
        const existing = studentMetrics.get(progress.student_id);
        let correct = 0;
        let attempts = 0;
        if (progress.words_attempted) {
          const wordsData = progress.words_attempted as WordsAttemptedRecord;
          Object.values(wordsData).forEach((word) => {
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
            totalXp: progress.total_xp || 0, totalCorrect: correct,
            totalAttempts: attempts, lastPracticeDate: progress.last_practice_date,
          });
        }
      });
    }

    studentMetrics.forEach((metrics) => {
      totalXp += metrics.totalXp;
      if (metrics.totalAttempts > 0 && metrics.totalCorrect / metrics.totalAttempts < 0.6) {
        studentsNeedingHelp++;
      }
      if (metrics.lastPracticeDate === today) {
        activeStudentsToday++;
      }
    });

    const classAverageXp = studentMetrics.size > 0 ? Math.round(totalXp / studentMetrics.size) : 0;

    return {
      data: { studentsNeedingHelp, classAverageXp, activeStudentsToday, weeklyEngagement: 0, totalStudents },
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
 */
export async function getCommonMistakes(
  classroomId: string,
  limit: number = 5
): Promise<{ data: CommonMistake[] | null; error: { message: string } | null }> {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }

  try {
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

    const { data: progressData, error: progressError } = await supabase
      .from('student_lesson_progress')
      .select('student_id, words_attempted')
      .in('student_id', studentIds);

    if (progressError) {
      logger.error('Error fetching student progress:', progressError);
      return { data: null, error: { message: progressError.message } };
    }

    const wordStats = new Map<string, {
      attempts: number; correct: number; studentCount: number; students: Set<string>;
    }>();

    if (progressData) {
      progressData.forEach((progress) => {
        if (!progress.words_attempted) return;
        const wordsData = progress.words_attempted as WordsAttemptedRecord;
        Object.entries(wordsData).forEach(([word, wordAttempt]) => {
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
              attempts: wordAttempt.attempts || 0, correct: wordAttempt.correct || 0,
              studentCount: 1, students: new Set([progress.student_id]),
            });
          }
        });
      });
    }

    const mistakes: CommonMistake[] = [];
    wordStats.forEach((stats, word) => {
      if (stats.attempts > 0) {
        const errorRate = 1 - (stats.correct / stats.attempts);
        if (errorRate > 0.5) {
          mistakes.push({ word, errorRate, studentCount: stats.studentCount });
        }
      }
    });

    mistakes.sort((a, b) => b.errorRate - a.errorRate);
    return { data: mistakes.slice(0, limit), error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getCommonMistakes:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Get student progress metrics (vocabulary mastery, accuracy trend, skill progression)
 */
export async function getStudentProgressMetrics(
  studentId: string,
  _classroomId: string
): Promise<{ data: StudentProgressMetrics | null; error: { message: string } | null }> {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }

  try {
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
      return { data: { vocabularyMastery: 0, accuracyTrend: [], skillProgression: [] }, error: null };
    }

    const { data: lesson, error: lessonError } = await supabase
      .from('vocabulary_lessons')
      .select('words')
      .eq('id', progressData.lesson_id)
      .single();

    if (lessonError) {
      logger.error('Error fetching lesson:', lessonError);
      return { data: null, error: { message: lessonError.message } };
    }

    const totalWords = lesson.words?.length || 0;
    const masteredWords = progressData.words_mastered?.length || 0;
    const vocabularyMastery = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;

    return {
      data: { vocabularyMastery, accuracyTrend: [], skillProgression: [] },
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getStudentProgressMetrics:', error);
    return { data: null, error: { message: error } };
  }
}


