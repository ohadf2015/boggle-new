/**
 * Shared types for Daily Word Schedule Admin components
 */

import type { Language } from '@/types';

export type WordSource = 'static' | 'wikipedia' | 'ai' | 'admin';

export interface ScheduledWord {
  id: string;
  puzzle_date: string;
  language: string;
  puzzle_number: number;
  target_word: string;
  ai_selected: boolean;
  ai_reason: string | null;
  theme_context: string | null;
  override_word: string | null;
  override_by: string | null;
  override_at: string | null;
  created_at: string;
  word_source: WordSource;
  source_article_url: string | null;
}

export interface PlayerAttempt {
  id: string;
  puzzle_date: string;
  puzzle_number: number;
  language: string;
  player_id: string | null;
  guest_fingerprint: string | null;
  display_name: string;
  avatar_emoji: string | null;
  avatar_color: string | null;
  solved: boolean;
  attempts_used: number;
  target_word: string;
  efficiency_score: number;
  completed_at: string;
}

export interface AttemptSummary {
  total: number;
  solved: number;
  failed: number;
}

export type ViewMode = 'list' | 'grid';

export type DateStatus = 'live' | 'past' | 'missing' | 'scheduled';

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
];

/** Get effective word from scheduled word (override takes precedence) */
export function getEffectiveWord(word: ScheduledWord): string {
  return word.override_word || word.target_word;
}

/** Format date for display with today/tomorrow labels */
export function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  }
  if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Get today's date as YYYY-MM-DD string */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/** Check if date string is today */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() === today.getTime();
}

/** Check if date string is in the past */
export function isPast(dateString: string): boolean {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

/** Get status for a date (missing, live, scheduled, past) */
export function getDateStatus(dateString: string, hasWord: boolean): DateStatus {
  if (isToday(dateString)) return 'live';
  if (isPast(dateString)) return 'past';
  if (!hasWord) return 'missing';
  return 'scheduled';
}

/** Generate array of date strings for a range */
export function getDateRange(daysToShow: number, dateOffset: number): string[] {
  const today = new Date();
  const dates: string[] = [];
  const startOffset = Math.min(dateOffset, 0);

  for (let i = startOffset; i < daysToShow + startOffset; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

/** Get formatted date range info for display */
export function getDateRangeInfo(daysToShow: number, dateOffset: number): { start: string; end: string } {
  const today = new Date();
  const startOffset = Math.min(dateOffset, 0);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + startOffset);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + daysToShow + startOffset - 1);

  return {
    start: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    end: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}
