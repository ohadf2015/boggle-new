import { locales } from '@/i18n/config';

const LOCALE_HOME = new RegExp(`^/(?:${locales.join('|')})?/?$`);

/** Locale homepage only: `/`, `/en`, `/en/`, `/he`, … (query/hash ignored). */
function isLocaleHome(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const stripped = pathname.split('?')[0].split('#')[0];
  return LOCALE_HOME.test(stripped);
}

/** Routes where the FTUE short-onboarding may render (locale homepage only). */
export function isOnboardingAllowedRoute(pathname: string | null | undefined): boolean {
  return isLocaleHome(pathname);
}

/**
 * The marketing landing route (locale homepage). The one-time "pick your style"
 * popup must NOT auto-open here — it covers the marketing hero and hurts CWV/SEO.
 * Returning users get prompted on their next in-app navigation instead.
 */
export function isLandingRoute(pathname: string | null | undefined): boolean {
  return isLocaleHome(pathname);
}
