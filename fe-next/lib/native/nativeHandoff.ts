/** Native app recognition and the pages it must not show (paid-plan UI lives on the website only). */
export const NATIVE_APP_UA_MARKER = 'LexiClashApp';

export const isNativeAppUserAgent = (ua: string | null | undefined): boolean =>
  !!ua && ua.includes(NATIVE_APP_UA_MARKER);

const PLAN_PAGE_RE = /^\/(?:([a-z]{2})\/)?(?:pricing|teacher\/upgrade)\/?$/;

/** Handoff route for a plan/pricing path, or null for any other path. */
export function nativeHandoffRoute(pathname: string, fallbackLocale: string): string | null {
  const m = PLAN_PAGE_RE.exec(pathname);
  return m ? `/${m[1] ?? fallbackLocale}/web-handoff` : null;
}
