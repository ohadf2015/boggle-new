import { locales } from '@/i18n/config';

/** usePathname() has no query string, so a switch must re-attach it or a student mid-join loses ?room=. */
export function localeSwitchPath(pathname: string | null | undefined, newLang: string, search: string | null | undefined): string {
  const segments = (pathname ?? '').split('/');
  const query = search && search !== '?' ? (search.startsWith('?') ? search : `?${search}`) : '';
  if ((locales as readonly string[]).includes(segments[1])) {
    segments[1] = newLang;
    return `${segments.join('/') || `/${newLang}`}${query}`;
  }
  const rest = pathname && pathname !== '/' ? pathname : '';
  return `/${newLang}${rest}${query}`;
}
