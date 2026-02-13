import { normalizeWord, normalizeHebrewWord, sanitizeWord } from '@/shared/utils/wordNormalization';

/**
 * Detect if a string contains Hebrew characters
 * Used to ensure Hebrew normalization is applied even if language is missing
 */
export function containsHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

/**
 * Normalize a word for storage/comparison, with smart language detection
 * Falls back to Hebrew normalization if Hebrew characters are detected
 *
 * IMPORTANT: Sanitizes word first to remove niqqud/diacritics for Hebrew
 */
export function normalizeForStorage(word: string, language?: Language): string {
  // If word contains Hebrew characters, always use Hebrew normalization
  if (containsHebrew(word)) {
    // Sanitize first to remove niqqud (vowel points) and other invisible chars
    const sanitized = sanitizeWord(word, 'he');
    return normalizeHebrewWord(sanitized);
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

export type GradeLevel =
  | 'grade_1' | 'grade_2' | 'grade_3' | 'grade_4' | 'grade_5' | 'grade_6'
  | 'grade_7' | 'grade_8' | 'grade_9'
  | 'grade_10' | 'grade_11' | 'grade_12';

export type CurriculumSubject =
  | 'english' | 'hebrew' | 'science' | 'math' | 'history' | 'geography' | 'general';

export interface CurriculumWordList {
  id: string;
  name: string;
  description: string | null;
  language: Language;
  grade_level: GradeLevel;
  subject: CurriculumSubject;
  curriculum_standard: string | null;
  words: VocabularyWord[];
  word_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CurriculumWordListFilters {
  language?: Language;
  gradeLevel?: GradeLevel;
  subject?: CurriculumSubject;
  search?: string;
}
