/**
 * Where a sign-in returns to. A sign-in that started inside the classroom
 * product goes back there; one that started in the arcade keeps landing on the
 * homepage (education dashboards are manual entry only).
 */
import { locales } from '@/i18n/config';

const EDU_SECTIONS = new Set(['teacher', 'student', 'join', 'education']);
const LOCALE_PREFIX = new RegExp(`^/(${locales.join('|')})(?=[/?#]|$)`);

export function isEduAuthOrigin(path: string | null | undefined): boolean {
  if (!path) return false;
  const segments = path.split(/[?#]/)[0].split('/').filter(Boolean);
  const rest = segments.length > 0 && (locales as readonly string[]).includes(segments[0]) ? segments.slice(1) : segments;
  return !!rest[0] && EDU_SECTIONS.has(rest[0]);
}

/** Native in-app sign-in carries a return path only from edu; Supabase falls back to the Site URL otherwise anyway. */
export function nativeOAuthNext(pathname: string | null | undefined, search: string | null | undefined): string | null {
  if (!pathname || pathname.includes('/auth/callback') || !isEduAuthOrigin(pathname)) return null;
  return pathname + (search || '');
}

export function nativeOAuthRedirectUrl(platform: string, locale: string, next: string | null): string {
  const nextQuery = next ? `&next=${encodeURIComponent(next)}` : '';
  if (platform === 'android') {
    return `https://www.lexiclash.live/${locale}/auth/callback?from_app=true${nextQuery}`;
  }
  return `lexiclash://auth/callback?locale=${locale}${nextQuery}`;
}

function isSafeInternalPath(next: string): boolean {
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\');
}

/**
 * Keeps next's own locale (the language the sign-in started in). `isDefault` means no real
 * destination was asked for, so the caller applies the homepage policy.
 */
export function resolveAuthNext(nextParam: string | null | undefined, locale: string): { url: string; isDefault: boolean } {
  const home = `/${locale}`;
  if (!nextParam || !isSafeInternalPath(nextParam)) return { url: home, isDefault: true };
  const ownLocale = LOCALE_PREFIX.exec(nextParam)?.[1];
  const rest = nextParam.replace(LOCALE_PREFIX, '');
  if (rest === '' || rest === '/' || rest.startsWith('?') || rest.startsWith('#')) return { url: home, isDefault: true };
  return { url: `/${ownLocale ?? locale}${rest}`, isDefault: false };
}

/** A failed or abandoned sign-in from edu goes back to its edu entry, not to the arcade. */
export function authFailureHref(locale: string, nextParam: string | null | undefined, reason?: string): string {
  const { url, isDefault } = resolveAuthNext(nextParam, locale);
  const base = !isDefault && isEduAuthOrigin(url) ? url : `/${locale}`;
  const [path, query = ''] = base.split('?');
  const params = new URLSearchParams(query);
  params.delete('auth_error');
  params.delete('reason');
  params.set('auth_error', 'true');
  if (reason) params.set('reason', reason);
  return `${path}?${params.toString()}`;
}
