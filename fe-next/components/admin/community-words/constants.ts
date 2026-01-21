import type { LanguageOption } from './types';

// Supported languages for community words
export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
];

// Default number of words to fetch
export const DEFAULT_LIMIT = 50;

// Default filter values
export const DEFAULT_STATUS_FILTER = 'pending_review';
export const DEFAULT_LANG_FILTER = 'all';
export const DEFAULT_SORT_BY = 'net_score';

/**
 * Get language display info by code
 */
export function getLanguageInfo(code: string): LanguageOption | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

/**
 * Create a unique key for a word
 */
export function createWordKey(word: string, language: string): string {
  return `${word}-${language}`;
}
