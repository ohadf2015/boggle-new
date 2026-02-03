/**
 * Education Module - Centralized Type Definitions
 *
 * This file contains all types used across the education module
 * to ensure consistency and reduce duplication.
 */

// ============================================
// CORE STUDENT TYPES
// ============================================

export interface Student {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface StudentProgress {
  studentId: string;
  lessonId: string;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  totalPracticeSessions: number;
  wordsMastered: string[];
  masteryLevel: 'not_started' | 'started' | 'practicing' | 'mastered';
  completedAt: string | null;
}

export interface StudentClassroom {
  id: string;
  studentId: string;
  classroomId: string;
  joinedAt: string;
  rank?: number;
  totalXP?: number;
}

// ============================================
// CLASSROOM TYPES
// ============================================

export interface Classroom {
  id: string;
  name: string;
  teacherId: string;
  joinCode: string;
  createdAt: string;
  updatedAt: string;
  settings: ClassroomSettings;
  lessonIds: string[];
  studentCount: number;
}

export interface ClassroomSettings {
  allowStudentProgressView: boolean;
  enableCompetition: boolean;
  defaultGameDuration: number;
}

export interface ClassroomLeaderboardEntry {
  studentId: string;
  displayName: string;
  avatarUrl?: string;
  totalXP: number;
  rank: number;
  streak: number;
  lastActive: string;
}

// ============================================
// LESSON TYPES
// ============================================

export interface Lesson {
  id: string;
  name: string;
  description: string;
  teacherId: string;
  wordCount: number;
  words: LessonWord[];
  createdAt: string;
  updatedAt: string;
  settings: LessonSettings;
}

export interface LessonWord {
  word: string;
  definition?: string;
  hint?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface LessonSettings {
  gridSize: 4 | 5;
  minWordLength: number;
  timeLimit: number;
  allowDiagonal: boolean;
}

export interface StudentLessonView {
  lessonId: string;
  lesson: Lesson;
  status: 'assigned' | 'started' | 'completed';
  progress?: StudentProgress;
}

// ============================================
// ACHIEVEMENT TYPES
// ============================================

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type AchievementCategory = 'progress' | 'skill' | 'consistency' | 'exploration';

export interface Achievement {
  key: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  isSecret: boolean;
  thresholds: Record<AchievementTier, number>;
}

export interface StudentAchievement {
  achievementKey: string;
  currentTier: AchievementTier | null;
  progressValue: number;
  nextThreshold: number | null;
  percentComplete: number;
  isPinned: boolean;
  isSecret: boolean;
  category: AchievementCategory;
  icon: string;
  unlockedAt?: string;
}

export interface AchievementUnlock {
  achievementKey: string;
  tier: AchievementTier;
  timestamp: string;
}

// ============================================
// XP & STREAK TYPES
// ============================================

export interface XpProgress {
  currentXp: number;
  xpToNextLevel: number;
  totalXpForLevel: number;
  percentComplete: number;
}

export interface DailyStreak {
  currentStreak: number;
  longestStreak: number;
  streakMultiplier: number;
  lastPracticeDate: string | null;
  daysThisMonth: number;
}

export interface LevelInfo {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
}

// ============================================
// PRACTICE SESSION TYPES
// ============================================

export type PracticeType = 'flashcard' | 'solo_board' | 'lesson_completion';

export interface PracticeSession {
  id: string;
  studentId: string;
  lessonId: string;
  type: PracticeType;
  startedAt: string;
  completedAt?: string;
  xpEarned: number;
  metadata: PracticeSessionMetadata;
}

export interface PracticeSessionMetadata {
  cardsReviewed?: number;
  cardsCorrect?: number;
  accuracy?: number;
  vocabularyWordsFound?: string[];
  newWordsFound?: string[];
  timeSpentSeconds?: number;
  morningPractice?: boolean;
}

export interface PracticeStats {
  totalSessions: number;
  totalWordsMastered: number;
  averageAccuracy: number;
  totalTimeSpentMinutes: number;
  favoriteMode: PracticeType;
  bestStreak: number;
}

// ============================================
// GAME TYPES
// ============================================

export interface ClassroomGame {
  id: string;
  classroomId: string;
  teacherId: string;
  lessonIds: string[];
  status: 'waiting' | 'active' | 'completed';
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  settings: GameSettings;
}

export interface GameSettings {
  duration: number;
  minWordLength: number;
  maxPlayers: number;
  allowHints: boolean;
}

export interface GamePlayer {
  studentId: string;
  displayName: string;
  socketId: string;
  isReady: boolean;
  score: number;
  wordsFound: string[];
  joinedAt: string;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface StudentAnalytics {
  studentId: string;
  period: 'week' | 'month' | 'all_time';
  totalXp: number;
  xpChange: number;
  lessonsCompleted: number;
  practiceSessions: number;
  averageSessionLength: number;
  streakData: {
    current: number;
    longest: number;
    maintenanceRate: number;
  };
  wordMastery: {
    total: number;
    mastered: number;
    inProgress: number;
  };
  activityByDay: ActivityDay[];
}

export interface ActivityDay {
  date: string;
  xpEarned: number;
  sessionsCount: number;
  wordsMastered: number;
}

export interface ClassroomAnalytics {
  classroomId: string;
  totalStudents: number;
  activeStudents: number;
  averageXpPerStudent: number;
  lessonsCompleted: number;
  topPerformers: ClassroomLeaderboardEntry[];
  strugglingStudents: StrugglingStudent[];
}

export interface StrugglingStudent {
  studentId: string;
  displayName: string;
  lastActive: string;
  daysSincePractice: number;
  suggestedAction: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}
