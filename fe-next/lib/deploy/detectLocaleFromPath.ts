/**
 * Extract locale from a pathname or fallback to 'en'.
 *
 * Used by error boundaries to preserve the user's locale through recovery
 * navigation, avoiding navigation that drops the locale prefix.
 *
 * Example: '/ru/teacher/classroom/abc?code=XYZ' → 'ru'
 *          '/en/' → 'en'
 *          '/xyz' → 'en' (fallback)
 *
 * Supports all 6 live locales: en, he, sv, ja, es, ru
 */

import { locales as LOCALES } from '@/lib/i18n';

export function detectLocaleFromPath(pathname: string): string {
  if (!pathname) return 'en';

  try {
    // Strip query params and hash before parsing
    const pathOnly = pathname.split('?')[0].split('#')[0];
    const segs = pathOnly.split('/').filter(Boolean);

    // Locale must be the first segment (after the leading slash)
    if (segs.length > 0 && LOCALES.includes(segs[0])) {
      return segs[0];
    }
    return 'en';
  } catch {
    return 'en';
  }
}

export default detectLocaleFromPath;
