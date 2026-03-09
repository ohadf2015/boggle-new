import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type {
  WordsAttemptedRecord,
  ClassroomMetrics,
  CommonMistake,
  StudentProgressMetrics,
  StudentProgressSummary,
  LessonEffectivenessData,
  MasteryLevel,
  HeatmapCell,
  VocabularyHeatmapData,
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
export { getStudentReportData, getClassReportData } from './analyticsReports';

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
  classroomId: string
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

/**
 * Get progress summary for all students in a classroom
 */
export async function getStudentsProgressSummary(
  classroomId: string
): Promise<{ data: StudentProgressSummary[]; error: { message: string } | null }> {
  if (!supabase) {
    return { data: [], error: { message: 'Supabase not configured' } };
  }

  try {
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

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', studentIds);

    if (profileError) {
      logger.error('Error fetching profiles:', profileError);
      return { data: [], error: { message: profileError.message } };
    }

    const { data: progressData, error: progressError } = await supabase
      .from('student_lesson_progress')
      .select('student_id, lesson_id, total_xp, current_level, current_streak, words_mastered, words_attempted, last_practice_date')
      .in('student_id', studentIds);

    if (progressError) {
      logger.error('Error fetching student progress:', progressError);
      return { data: [], error: { message: progressError.message } };
    }

    const lessonIds = [...new Set(progressData?.map(p => p.lesson_id) || [])];
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

    const summaries: StudentProgressSummary[] = [];

    studentIds.forEach(studentId => {
      const profile = profiles?.find(p => p.id === studentId);
      if (!profile) return;

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
        totalLessonWords += lessonWordsMap.get(progress.lesson_id) || 0;

        if (progress.words_attempted) {
          const wordsData = progress.words_attempted as WordsAttemptedRecord;
          Object.values(wordsData).forEach(word => {
            totalCorrect += word.correct || 0;
            totalAttempts += word.attempts || 0;
            wordsAttempted += word.attempts || 0;
          });
        }

        if (progress.last_practice_date) {
          if (!lastPracticeDate || progress.last_practice_date > lastPracticeDate) {
            lastPracticeDate = progress.last_practice_date;
          }
        }
      });

      const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
      const vocabularyMastery = totalLessonWords > 0 ? Math.round((wordsMastered / totalLessonWords) * 100) : 0;
      const isStruggling = totalAttempts > 0 && overallAccuracy < 60;

      summaries.push({
        studentId, displayName: profile.display_name || 'Unknown',
        avatarUrl: profile.avatar_url, totalXp, currentLevel, vocabularyMastery,
        overallAccuracy, wordsAttempted, wordsMastered, lastPracticeDate,
        isStruggling, currentStreak,
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
 */
export async function getLessonEffectiveness(
  classroomId: string
): Promise<{ data: LessonEffectivenessData[]; error: { message: string } | null }> {
  if (!supabase) {
    return { data: [], error: { message: 'Supabase not configured' } };
  }

  try {
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

    const { data: lessons, error: lessonError } = await supabase
      .from('vocabulary_lessons')
      .select('id, name')
      .in('id', lessonIds);

    if (lessonError) {
      logger.error('Error fetching lessons:', lessonError);
      return { data: [], error: { message: lessonError.message } };
    }

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

    const { data: progressData, error: progressError } = await supabase
      .from('student_lesson_progress')
      .select('student_id, lesson_id, total_xp, completed_at, words_attempted')
      .in('student_id', studentIds)
      .eq('classroom_id', classroomId);

    if (progressError) {
      logger.error('Error fetching student progress:', progressError);
      return { data: [], error: { message: progressError.message } };
    }

    const lessonMetrics = new Map<string, {
      students: Set<string>; totalXp: number; completed: number; totalCorrect: number; totalAttempts: number;
    }>();

    lessonIds.forEach(lessonId => {
      lessonMetrics.set(lessonId, { students: new Set(), totalXp: 0, completed: 0, totalCorrect: 0, totalAttempts: 0 });
    });

    if (progressData) {
      progressData.forEach((progress) => {
        const metrics = lessonMetrics.get(progress.lesson_id);
        if (!metrics) return;

        metrics.students.add(progress.student_id);
        metrics.totalXp += progress.total_xp || 0;
        if (progress.completed_at) metrics.completed++;

        if (progress.words_attempted) {
          const wordsData = progress.words_attempted as WordsAttemptedRecord;
          Object.values(wordsData).forEach(word => {
            metrics.totalCorrect += word.correct || 0;
            metrics.totalAttempts += word.attempts || 0;
          });
        }
      });
    }

    const effectivenessData: LessonEffectivenessData[] = [];

    lessonIds.forEach(lessonId => {
      const lesson = lessons?.find(l => l.id === lessonId);
      if (!lesson) return;
      const metrics = lessonMetrics.get(lessonId);
      if (!metrics) return;
      const totalStudents = metrics.students.size;
      if (totalStudents === 0) return;

      effectivenessData.push({
        lessonId,
        lessonName: lesson.name,
        totalStudents,
        averageXpGain: Math.round(metrics.totalXp / totalStudents),
        completionRate: Math.round((metrics.completed / totalStudents) * 10000) / 100,
        averageAccuracy: metrics.totalAttempts > 0 ? Math.round((metrics.totalCorrect / metrics.totalAttempts) * 100) : 0,
        avgTimeToMastery: 0,
      });
    });

    return { data: effectivenessData, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getLessonEffectiveness:', error);
    return { data: [], error: { message: error } };
  }
}

/**
 * Get vocabulary mastery heatmap data (student x word grid)
 */
export async function getVocabularyHeatmapData(
  classroomId: string,
  lessonId?: string
): Promise<{ data: VocabularyHeatmapData; error: { message: string } | null }> {
  const emptyData = { students: [], words: [], cells: [] };

  if (!supabase) {
    return { data: emptyData, error: { message: 'Supabase not configured' } };
  }

  try {
    const { data: memberships, error: memberError } = await supabase
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', classroomId);

    if (memberError) {
      logger.error('Error fetching classroom memberships:', memberError);
      return { data: emptyData, error: { message: memberError.message } };
    }

    if (!memberships || memberships.length === 0) {
      return { data: emptyData, error: null };
    }

    const studentIds = memberships.map(m => m.student_id);

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', studentIds);

    if (profileError) {
      logger.error('Error fetching profiles:', profileError);
      return { data: emptyData, error: { message: profileError.message } };
    }

    const students = (profiles || []).map(p => ({ id: p.id, name: p.display_name || 'Unknown' }));

    let query = supabase
      .from('student_lesson_progress')
      .select('student_id, lesson_id, words_attempted')
      .in('student_id', studentIds);

    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }

    const { data: progressData, error: progressError } = await query;

    if (progressError) {
      logger.error('Error fetching progress:', progressError);
      return { data: emptyData, error: { message: progressError.message } };
    }

    const wordsSet = new Set<string>();
    if (progressData) {
      progressData.forEach((progress) => {
        if (progress.words_attempted) {
          Object.keys(progress.words_attempted).forEach(word => wordsSet.add(word));
        }
      });
    }

    const words = Array.from(wordsSet);
    const cells: HeatmapCell[] = [];

    students.forEach(student => {
      words.forEach(word => {
        let totalAttempts = 0;
        let totalCorrect = 0;

        if (progressData) {
          progressData.forEach((progress) => {
            const wordsData = progress.words_attempted as WordsAttemptedRecord | null;
            if (progress.student_id === student.id && wordsData?.[word]) {
              totalAttempts += wordsData[word].attempts || 0;
              totalCorrect += wordsData[word].correct || 0;
            }
          });
        }

        let masteryLevel: MasteryLevel = 'not-started';
        let accuracy = 0;

        if (totalAttempts > 0) {
          accuracy = Math.round((totalCorrect / totalAttempts) * 100);
          if (accuracy >= 80 && totalAttempts >= 3) {
            masteryLevel = 'mastered';
          } else if (accuracy >= 50) {
            masteryLevel = 'practicing';
          } else {
            masteryLevel = 'struggling';
          }
        }

        cells.push({
          studentId: student.id, studentName: student.name,
          word, masteryLevel, accuracy, attempts: totalAttempts,
        });
      });
    });

    return { data: { students, words, cells }, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getVocabularyHeatmapData:', error);
    return { data: emptyData, error: { message: error } };
  }
}
