/**
 * Utility for generating random default player names
 * Names are localized based on UI language
 */

import { translations } from '@/translations';

type SupportedLanguage = 'en' | 'he' | 'sv' | 'ja';

/**
 * Get a random default player name from the translations
 * @param language - The UI language (en, he, sv, ja)
 * @returns A random funny player name
 */
export function getRandomDefaultName(language: string = 'en'): string {
  const lang = (language as SupportedLanguage) || 'en';
  const langTranslations = translations[lang] || translations.en;
  const defaultNames = langTranslations?.joinView?.defaultPlayerNames;

  if (!defaultNames || !Array.isArray(defaultNames) || defaultNames.length === 0) {
    // Fallback to English if no names available for the language
    const fallbackNames = translations.en?.joinView?.defaultPlayerNames;
    if (!fallbackNames || !Array.isArray(fallbackNames) || fallbackNames.length === 0) {
      return 'Player';
    }
    return fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
  }

  return defaultNames[Math.floor(Math.random() * defaultNames.length)];
}

/**
 * Get a random default player name, ensuring it's unique from existing names
 * @param language - The UI language
 * @param existingNames - Array of names already in use
 * @param maxAttempts - Maximum attempts to find a unique name
 * @returns A random unique funny player name
 */
export function getUniqueRandomDefaultName(
  language: string = 'en',
  existingNames: string[] = [],
  maxAttempts: number = 10
): string {
  const lang = (language as SupportedLanguage) || 'en';
  const langTranslations = translations[lang] || translations.en;
  const defaultNames = langTranslations?.joinView?.defaultPlayerNames || translations.en?.joinView?.defaultPlayerNames || [];

  if (!Array.isArray(defaultNames) || defaultNames.length === 0) {
    return 'Player';
  }

  const lowerExisting = existingNames.map(n => n.toLowerCase());

  // Try to find a unique name
  for (let i = 0; i < maxAttempts; i++) {
    const name = defaultNames[Math.floor(Math.random() * defaultNames.length)];
    if (!lowerExisting.includes(name.toLowerCase())) {
      return name;
    }
  }

  // If we couldn't find a unique name, append a number
  const baseName = defaultNames[Math.floor(Math.random() * defaultNames.length)];
  const suffix = Math.floor(Math.random() * 99) + 1;
  return `${baseName} ${suffix}`;
}
