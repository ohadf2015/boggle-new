/**
 * Analytics Type Definitions
 *
 * Shared types for classroom analytics, progress tracking,
 * and report generation.
 */

/** Word attempt data structure from student_lesson_progress.words_attempted JSON */
export type WordAttemptData = { correct?: number; attempts?: number };

/** Record of words to their attempt data */
export type WordsAttemptedRecord = Record<string, WordAttemptData>;

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
  vocabularyMastery: number;
  overallAccuracy: number;
  wordsAttempted: number;
  wordsMastered: number;
  lastPracticeDate: string | null;
  isStruggling: boolean;
  currentStreak: number;
}

export type MasteryLevel = 'mastered' | 'practicing' | 'struggling' | 'not-started';

export interface HeatmapCell {
  studentId: string;
  studentName: string;
  word: string;
  masteryLevel: MasteryLevel;
  accuracy: number;
  attempts: number;
}

export interface VocabularyHeatmapData {
  students: Array<{ id: string; name: string }>;
  words: string[];
  cells: HeatmapCell[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface StudentReportData {
  studentId: string;
  studentName: string;
  avatarUrl: string | null;
  classroomName: string;
  dateRange: DateRange | null;
  metrics: {
    wordsLearned: number;
    totalWords: number;
    accuracy: number;
    practiceTimeMinutes: number;
    currentStreak: number;
    longestStreak: number;
    sessionsCompleted: number;
    averageScore: number;
    masteryLevel: string;
  };
  wordMastery: Array<{
    word: string;
    mastered: boolean;
    accuracy: number;
    attempts: number;
    lastPracticed: string | null;
  }>;
  practiceHistory: Array<{
    date: string;
    sessionsCount: number;
    wordsReviewed: number;
    accuracy: number;
  }>;
  recommendations: string[];
}

export interface ClassReportData {
  classroomId: string;
  classroomName: string;
  teacherName: string;
  dateRange: DateRange | null;
  metrics: {
    totalStudents: number;
    activeStudents: number;
    classAverageAccuracy: number;
    classAverageWordsLearned: number;
    completionRate: number;
    participationRate: number;
  };
  topPerformers: Array<{
    studentId: string;
    studentName: string;
    accuracy: number;
    wordsLearned: number;
  }>;
  studentsNeedingAttention: Array<{
    studentId: string;
    studentName: string;
    accuracy: number;
    lastActive: string | null;
    issue: string;
  }>;
  studentRankings: Array<{
    rank: number;
    studentId: string;
    studentName: string;
    score: number;
    accuracy: number;
    wordsLearned: number;
  }>;
}
