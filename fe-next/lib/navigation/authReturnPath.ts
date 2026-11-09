/**
 * Where a sign-in returns to. A sign-in that started inside the classroom
 * product goes back there; one that started in the arcade keeps landing on the
 * homepage (education dashboards are manual entry only).
 */
import { locales } from '@/i18n/config';
import { eduSectionOf } from './eduSections';

const LOCALE_PREFIX = new RegExp(`^/(${locales.join('|')})(?=[/?#]|$)`);

// Pricing is the shared Pro page; a sign-in there keeps the arcade's homepage default.
export function isEduAuthOrigin(path: string | null | undefined): boolean {
  const section = eduSectionOf(path);
  return section !== null && section !== 'pricing';
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

/**
 * A sign-in that starts in edu but loses `next` on the way (email link, provider fallback)
 * returns to that edu page. Origin-based only: a bare sign-in from the arcade still lands home.
 */
export const EDU_AUTH_ORIGIN_COOKIE = 'lexi_edu_auth_origin';
const EDU_AUTH_ORIGIN_MAX_AGE_S = 60 * 60;

function validEduOrigin(path: string | null | undefined): string | null {
  if (!path || !isSafeInternalPath(path) || path.includes('/auth/callback') || !isEduAuthOrigin(path)) return null;
  return path;
}

function writeOriginCookie(value: string, lifetime: string): void {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${EDU_AUTH_ORIGIN_COOKIE}=${value}; Path=/; ${lifetime}; SameSite=Lax${secure}`;
}

export function forgetEduAuthOrigin(): void {
  if (typeof document === 'undefined' || !document.cookie.includes(`${EDU_AUTH_ORIGIN_COOKIE}=`)) return;
  writeOriginCookie('', 'Expires=Thu, 01 Jan 1970 00:00:00 GMT');
}

export function rememberAuthOrigin(path: string | null | undefined): void {
  if (!path || path.includes('/auth/callback')) return;
  const origin = validEduOrigin(path);
  if (origin) writeOriginCookie(encodeURIComponent(origin), `Max-Age=${EDU_AUTH_ORIGIN_MAX_AGE_S}`);
  else forgetEduAuthOrigin();
}

export function eduAuthOriginFromCookies(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const prefix = `${EDU_AUTH_ORIGIN_COOKIE}=`;
  const raw = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return null;
  try {
    return validEduOrigin(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

/** Only a lost `next` falls back to the marker; an explicit homepage `next` means the sign-in started in the arcade. */
export function withRememberedEduOrigin(nextParam: string | null | undefined, remembered: string | null): string | null {
  const next = nextParam ?? null;
  if (next && next !== '/' && isSafeInternalPath(next)) return next;
  return validEduOrigin(remembered) ?? next;
}
