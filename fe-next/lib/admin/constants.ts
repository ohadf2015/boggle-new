/**
 * Shared Admin Constants
 * Centralizes all constants used across admin dashboard components
 */

import type { Language } from '@/types';
import type { LanguageOption } from './types';

// ==================== Languages ====================

/**
 * Supported languages for the admin dashboard
 * Used in: DailyWordManager, CommunityWordsManager, WikipediaWordsPanel
 */
export const ADMIN_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
] as const;

/**
 * Core languages (original 4 languages)
 * Used when full language list isn't needed
 */
export const CORE_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
] as const;

// ==================== Word Length ====================

/**
 * Minimum word length by language
 * Hebrew uses 2 due to word structure, others use 3
 */
export const MIN_WORD_LENGTH: Record<Language, number> = {
  en: 3,
  he: 2,
  sv: 3,
  ja: 2,
  es: 3,
  fr: 3,
  de: 3,
  ru: 3,
};

/**
 * Word length range for validation
 */
export const WORD_LENGTH_RANGE = {
  min: 2,
  max: 15,
} as const;

// ==================== Validation Status ====================

/**
 * Validation status options for admin word management
 */
export const VALIDATION_STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'valid', label: 'Valid' },
  { value: 'invalid', label: 'Invalid' },
] as const;

// ==================== API Timeouts ====================

/**
 * Client-side timeout for admin API requests (ms)
 * Should be slightly longer than server maxDuration
 */
export const ADMIN_API_TIMEOUT = 95000; // 95 seconds

/**
 * Default page size for admin data lists
 */
export const ADMIN_PAGE_SIZE = 50;

// ==================== Date Utilities ====================

/**
 * Default date range (days to show)
 */
export const DEFAULT_DATE_RANGE_DAYS = 7;

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get default date range (last N days)
 */
export function getDefaultDateRange(days: number = DEFAULT_DATE_RANGE_DAYS): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Format date for display (short format)
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with today/tomorrow labels
 */
export function formatDateWithLabel(dateString: string): string {
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

/**
 * Check if date string is today
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() === today.getTime();
}

/**
 * Check if date string is in the past
 */
export function isPastDate(dateString: string): boolean {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

// ==================== Helper Functions ====================

/**
 * Get language info by code
 */
export function getLanguageByCode(code: Language): LanguageOption | undefined {
  return ADMIN_LANGUAGES.find((lang) => lang.code === code);
}

/**
 * Get language flag by code
 */
export function getLanguageFlag(code: Language): string {
  return getLanguageByCode(code)?.flag ?? '';
}

/**
 * Get language name by code
 */
export function getLanguageName(code: Language): string {
  return getLanguageByCode(code)?.name ?? code.toUpperCase();
}
