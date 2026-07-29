/**
 * Types for Wikipedia Words Admin Panel
 */

import type { Language } from '@/types';

export interface WikipediaWordCandidate {
  id: string;
  language: Language;
  fetch_date: string;
  word: string;
  source_article_title: string | null;
  source_article_url: string | null;
  interestingness_score: number;
  validation_status: 'pending' | 'valid' | 'invalid';
  created_at: string;
}

export interface WikipediaWordsFilters {
  language: Language;
  status: 'all' | 'pending' | 'valid' | 'invalid';
  dateRange: {
    start: string;
    end: string;
  };
  searchQuery: string;
}

export interface WikipediaWordsStats {
  total: number;
  pending: number;
  valid: number;
  invalid: number;
}

export type ValidationStatus = 'pending' | 'valid' | 'invalid';

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
];

/** Get default date range (last 7 days) */
export function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/** Format date for display */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
