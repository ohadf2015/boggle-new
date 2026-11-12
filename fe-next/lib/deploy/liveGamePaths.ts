import { locales } from '@/lib/i18n';
import { isBrowserOffline } from './staleDeployReload';

/** Route segments (after the locale) where a reload would drop a running socket game. */
export const LIVE_GAME_SURFACES = ['multiplayer', 'education/live', 'education/duels'] as const;

export function isLiveGamePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const segs = pathname.split(/[?#]/)[0].split('/').filter(Boolean);
  if (segs.length > 0 && (locales as readonly string[]).includes(segs[0])) segs.shift();
  const route = segs.join('/');
  return LIVE_GAME_SURFACES.some((surface) => route === surface || route.startsWith(`${surface}/`));
}

/** Current page path, or null outside a browser. */
export function currentPathname(): string | null {
  try {
    return typeof window === 'undefined' ? null : window.location.pathname ?? null;
  } catch {
    return null;
  }
}

/** True where an automatic stale-chunk reload must not run: offline, or a page holding a live game. */
export function autoReloadHeldBack(): boolean {
  return isBrowserOffline() || isLiveGamePath(currentPathname());
}
