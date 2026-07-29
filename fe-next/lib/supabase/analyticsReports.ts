/**
 * Analytics Report Queries
 *
 * Functions for generating student and class progress reports,
 * used for PDF report generation in the teacher dashboard.
 */

import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type {
  WordsAttemptedRecord,
  DateRange,
  StudentReportData,
  ClassReportData,
  MasteryLevel,
  HeatmapCell,
  VocabularyHeatmapData,
} from './analyticsTypes';

/**
 * Get student report data for PDF generation
 */
export async function getStudentReportData(
  studentId: string,
  classroomId: string,
  lessonId?: string,
  dateRange?: DateRange
): Promise<{ data: StudentReportData | null; error: { message: string } | null }> {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }

  try {
    // Get student profile
    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_config')
      .eq('id', studentId)
      .single();

    if (studentError) {
      logger.error('Error fetching student:', studentError);
      return { data: null, error: { message: studentError.message } };
    }

    // Get classroom info
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('id, name')
      .eq('id', classroomId)
      .single();

    if (classroomError) {
      logger.error('Error fetching classroom:', classroomError);
      return { data: null, error: { message: classroomError.message } };
    }

    // Get student's lesson progress
    let progressQuery = supabase
      .from('student_lesson_progress')
      .select('*')
      .eq('student_id', studentId);

    if (lessonId) {
      progressQuery = progressQuery.eq('lesson_id', lessonId);
    }

    const { data: progressData, error: progressError } = await progressQuery;

    if (progressError) {
      logger.error('Error fetching progress:', progressError);
      return { data: null, error: { message: progressError.message } };
    }

    // Get student's XP tracking data
    const { data: xpData, error: xpError } = await supabase
      .from('student_xp_tracking')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (xpError && xpError.code !== 'PGRST116') {
      logger.error('Error fetching XP data:', xpError);
    }

    // Calculate metrics from progress data
    let totalWordsLearned = 0;
    let totalWords = 0;
    let totalCorrect = 0;
    let totalAttempts = 0;
    const wordMasteryList: StudentReportData['wordMastery'] = [];

    progressData?.forEach((progress) => {
      const masteredWords = progress.words_mastered?.length || 0;
      const attemptedWords = progress.words_attempted as WordsAttemptedRecord || {};

      totalWordsLearned += masteredWords;

      Object.entries(attemptedWords).forEach(([word, data]) => {
        totalWords++;
        const correct = data.correct || 0;
        const attempts = data.attempts || 0;
        totalCorrect += correct;
        totalAttempts += attempts;

        wordMasteryList.push({
          word,
          mastered: (progress.words_mastered || []).includes(word),
          accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
          attempts,
          lastPracticed: progress.last_practice_date,
        });
      });
    });

    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    // Determine mastery level
    let masteryLevel = 'beginner';
    if (accuracy >= 90) masteryLevel = 'mastered';
    else if (accuracy >= 70) masteryLevel = 'proficient';
    else if (accuracy >= 50) masteryLevel = 'developing';

    // Generate recommendations
    const recommendations: string[] = [];
    if (accuracy < 60) {
      recommendations.push('Focus on reviewing words with low accuracy');
    }
    if (totalAttempts < 50) {
      recommendations.push('Increase practice frequency to improve retention');
    }
    if (wordMasteryList.filter(w => !w.mastered).length > 5) {
      recommendations.push('Work on mastering more vocabulary words');
    }

    const reportData: StudentReportData = {
      studentId,
      studentName: student.display_name || 'Unknown Student',
      avatarUrl: student.avatar_config || null,
      classroomName: classroom.name,
      dateRange: dateRange || null,
      metrics: {
        wordsLearned: totalWordsLearned,
        totalWords: totalWords || 0,
        accuracy,
        practiceTimeMinutes: xpData?.total_practice_minutes || 0,
        currentStreak: xpData?.current_streak || 0,
        longestStreak: xpData?.longest_streak || 0,
        sessionsCompleted: xpData?.total_sessions || 0,
        averageScore: accuracy,
        masteryLevel,
      },
      wordMastery: wordMasteryList,
      practiceHistory: [],
      recommendations,
    };

    return { data: reportData, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getStudentReportData:', error);
    return { data: null, error: { message: error } };
  }
}

/**
 * Get class report data for PDF generation
 */
export async function getClassReportData(
  classroomId: string,
  dateRange?: DateRange
): Promise<{ data: ClassReportData | null; error: { message: string } | null }> {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }

  try {
    // Get classroom info (teacher profile fetched separately — classrooms.teacher_id
    // references auth.users, not profiles, so PostgREST cannot embed directly)
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('id, name, teacher_id')
      .eq('id', classroomId)
      .single();

    if (classroomError) {
      logger.error('Error fetching classroom:', classroomError);
      return { data: null, error: { message: classroomError.message } };
    }

    const { data: teacherProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', classroom.teacher_id)
      .maybeSingle();

    // Get all students in classroom (profiles fetched separately — student_id
    // references auth.users, not profiles)
    const { data: memberships, error: studentsError } = await supabase
      .from('classroom_memberships')
      .select('student_id')
      .eq('classroom_id', classroomId);

    if (studentsError) {
      logger.error('Error fetching students:', studentsError);
      return { data: null, error: { message: studentsError.message } };
    }

    const studentIds = memberships?.map(m => m.student_id) || [];
    const totalStudents = studentIds.length;

    const { data: studentProfiles } = studentIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, display_name, avatar_config')
          .in('id', studentIds)
      : { data: [] as Array<{ id: string; display_name: string | null; avatar_config: Record<string, unknown> | null }> };

    const profileById = new Map(
      (studentProfiles || []).map(p => [p.id, p])
    );

    // Get progress data for all students
    const { data: progressData, error: progressError } = await supabase
      .from('student_lesson_progress')
      .select('*')
      .in('student_id', studentIds);

    if (progressError) {
      logger.error('Error fetching progress:', progressError);
    }

    // Calculate class metrics
    let totalAccuracy = 0;
    let totalWordsLearned = 0;
    let studentsWithProgress = 0;
    const studentMetrics: Array<{
      studentId: string;
      studentName: string;
      accuracy: number;
      wordsLearned: number;
      lastActive: string | null;
    }> = [];

    studentIds.forEach((studentId) => {
      const profile = profileById.get(studentId) || null;
      const studentProgress = progressData?.filter(p => p.student_id === studentId) || [];

      let studentCorrect = 0;
      let studentAttempts = 0;
      let studentWords = 0;
      let lastActive: string | null = null;

      studentProgress.forEach((progress) => {
        const attemptedWords = progress.words_attempted as WordsAttemptedRecord || {};
        studentWords += progress.words_mastered?.length || 0;

        Object.values(attemptedWords).forEach((data) => {
          studentCorrect += data.correct || 0;
          studentAttempts += data.attempts || 0;
        });

        if (!lastActive || (progress.last_practice_date && progress.last_practice_date > lastActive)) {
          lastActive = progress.last_practice_date;
        }
      });

      const studentAccuracy = studentAttempts > 0 ? Math.round((studentCorrect / studentAttempts) * 100) : 0;

      if (studentAttempts > 0) {
        totalAccuracy += studentAccuracy;
        studentsWithProgress++;
      }
      totalWordsLearned += studentWords;

      studentMetrics.push({
        studentId,
        studentName: profile?.display_name || 'Unknown',
        accuracy: studentAccuracy,
        wordsLearned: studentWords,
        lastActive,
      });
    });

    const classAverageAccuracy = studentsWithProgress > 0 ? Math.round(totalAccuracy / studentsWithProgress) : 0;
    const classAverageWordsLearned = totalStudents > 0 ? Math.round(totalWordsLearned / totalStudents) : 0;

    // Sort and get rankings
    const sortedByScore = [...studentMetrics].sort((a, b) => {
      const scoreA = a.accuracy * 0.6 + (a.wordsLearned * 2);
      const scoreB = b.accuracy * 0.6 + (b.wordsLearned * 2);
      return scoreB - scoreA;
    });

    const rankings = sortedByScore.map((s, index) => ({
      rank: index + 1,
      studentId: s.studentId,
      studentName: s.studentName,
      score: Math.round(s.accuracy * 0.6 + s.wordsLearned * 2),
      accuracy: s.accuracy,
      wordsLearned: s.wordsLearned,
    }));

    // Top performers (top 3)
    const topPerformers = rankings.slice(0, 3).map(r => ({
      studentId: r.studentId,
      studentName: r.studentName,
      accuracy: r.accuracy,
      wordsLearned: r.wordsLearned,
    }));

    // Students needing attention (accuracy < 50% or inactive > 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const studentsNeedingAttention = studentMetrics
      .filter(s => {
        const isLowAccuracy = s.accuracy < 50 && s.accuracy > 0;
        const isInactive = !s.lastActive || new Date(s.lastActive) < sevenDaysAgo;
        return isLowAccuracy || isInactive;
      })
      .map(s => ({
        studentId: s.studentId,
        studentName: s.studentName,
        accuracy: s.accuracy,
        lastActive: s.lastActive,
        issue: s.accuracy < 50 ? 'Low accuracy' : 'Inactive',
      }));

    const reportData: ClassReportData = {
      classroomId,
      classroomName: classroom.name,
      teacherName: teacherProfile?.display_name || 'Teacher',
      dateRange: dateRange || null,
      metrics: {
        totalStudents,
        activeStudents: studentsWithProgress,
        classAverageAccuracy,
        classAverageWordsLearned,
        completionRate: totalStudents > 0 ? Math.round((studentsWithProgress / totalStudents) * 100) : 0,
        participationRate: totalStudents > 0 ? Math.round((studentsWithProgress / totalStudents) * 100) : 0,
      },
      topPerformers,
      studentsNeedingAttention,
      studentRankings: rankings,
    };

    return { data: reportData, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getClassReportData:', error);
    return { data: null, error: { message: error } };
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
