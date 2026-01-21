import type { Language } from '@/types';

export interface BulkGeneratedWord {
  date: string;
  word: string;
  reason: string;
}

export interface DailyTargetWord {
  id: string;
  puzzle_date: string;
  target_word: string;
  override_word?: string;
  ai_selected: boolean;
  ai_reason?: string;
  language: string;
}

export interface BulkGenerateState {
  isLoading: boolean;
  generatedWords: BulkGeneratedWord[];
  existingWords: Array<{ date: string; word: string }>;
  excludedWords: string[];
  aiConfigured: boolean;
  stats: {
    totalDates: number;
    existingDates: number;
    generatedDates: number;
    excludedWordsCount: number;
  } | null;
  error: string | null;
}

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

export interface WordListStats {
  total: number;
  byLength: Record<number, number>;
  shortest: number;
  longest: number;
}
