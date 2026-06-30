/**
 * Shared i18n configuration for next-intl.
 * Used by middleware.ts and i18n/request.ts.
 */

export const locales = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

/** RTL locales */
export const rtlLocales: Locale[] = ['he'];

export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}
