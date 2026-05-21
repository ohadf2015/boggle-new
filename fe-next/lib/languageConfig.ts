/**
 * Centralized Language Configuration
 * Single source of truth for language options, flags, and names
 */

import type { Language } from '@/types';

export interface LanguageOption {
  code: Language;
  flag: string;
  name: string;
  nativeName: string;
}

/**
 * Complete language configuration with flags and names
 */
export const LANGUAGE_CONFIG: Record<Language, Omit<LanguageOption, 'code'>> = {
  en: { flag: '🇺🇸', name: 'English', nativeName: 'English' },
  he: { flag: '🇮🇱', name: 'Hebrew', nativeName: 'עברית' },
  sv: { flag: '🇸🇪', name: 'Swedish', nativeName: 'Svenska' },
  ja: { flag: '🇯🇵', name: 'Japanese', nativeName: '日本語' },
  es: { flag: '🇪🇸', name: 'Spanish', nativeName: 'Español' },
  fr: { flag: '🇫🇷', name: 'French', nativeName: 'Français' },
  de: { flag: '🇩🇪', name: 'German', nativeName: 'Deutsch' },
};

/**
 * Quick lookup for language flags
 */
export const LANGUAGE_FLAGS: Record<Language, string> = {
  en: '🇺🇸',
  he: '🇮🇱',
  sv: '🇸🇪',
  ja: '🇯🇵',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
};

/**
 * Get flag for a language code, with fallback
 */
export const getLanguageFlag = (lang: Language): string => {
  return LANGUAGE_FLAGS[lang] || '🌐';
};

/**
 * Get the native name for a language
 */
export const getLanguageName = (lang: Language, native = true): string => {
  const config = LANGUAGE_CONFIG[lang];
  return native ? config.nativeName : config.name;
};

/**
 * Languages currently available for gameplay
 * (subset of all defined languages)
 */
export const SUPPORTED_GAME_LANGUAGES: Language[] = ['en', 'he', 'sv', 'ja', 'es'];

/**
 * Language options array for dropdowns and selectors
 * Uses native names by default
 */
export const LANGUAGE_OPTIONS: LanguageOption[] = SUPPORTED_GAME_LANGUAGES.map(code => ({
  code,
  ...LANGUAGE_CONFIG[code],
}));

/**
 * All languages including those in development
 */
export const ALL_LANGUAGES: Language[] = ['en', 'he', 'sv', 'ja', 'es', 'fr', 'de'];

/**
 * RTL (Right-to-Left) languages
 */
export const RTL_LANGUAGES: Language[] = ['he'];

/**
 * Check if a language is RTL
 */
export const isRtlLanguage = (lang: Language): boolean => {
  return RTL_LANGUAGES.includes(lang);
};

/**
 * Text direction for content written in a given GAME language.
 *
 * Use this for in-game word surfaces (letter tiles, the word being built,
 * found-word chips) so the board follows the language of the *words*, not the
 * UI locale. A Hebrew-UI player in an English game must still see English
 * words left-to-right. Null/undefined → 'ltr' (safe default).
 */
export const languageDir = (lang: Language | null | undefined): 'rtl' | 'ltr' => {
  return lang && isRtlLanguage(lang) ? 'rtl' : 'ltr';
};
