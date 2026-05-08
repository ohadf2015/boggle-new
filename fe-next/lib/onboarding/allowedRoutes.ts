import { locales } from '@/i18n/config';

const LOCALE_HOME = new RegExp(`^/(?:${locales.join('|')})?/?$`);

export function isOnboardingAllowedRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const stripped = pathname.split('?')[0].split('#')[0];
  return LOCALE_HOME.test(stripped);
}
