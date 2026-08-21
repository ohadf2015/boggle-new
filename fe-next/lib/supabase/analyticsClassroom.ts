/**
 * Classroom Analytics - Student Progress & Lesson Effectiveness
 *
 * Extracted from analytics.ts to keep files under 500 lines.
 */

import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type {
  WordsAttemptedRecord,
  StudentProgressSummary,
  LessonEffectivenessData,
} from './analyticsTypes';

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
      .from('public_profiles')
      .select('id, display_name, avatar_emoji, avatar_config')
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
        avatarUrl: profile.avatar_config || profile.avatar_emoji || null, totalXp, currentLevel, vocabularyMastery,
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
      .in('student_id', studentIds);

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
