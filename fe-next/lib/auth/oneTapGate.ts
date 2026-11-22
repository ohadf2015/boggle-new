import { isHeavyGamePath, stripLocalePrefix } from '@/lib/perf/heavyGamePath';

const GAME_PREFIXES = [
  '/quick-play', '/blast', '/word-tower', '/crossword', '/word-craft', '/connections',
  '/party', '/daily-word-wheel', '/anagram',
] as const;

/** Game pages, menus and setup screens included: sign-in is offered on results instead. */
export function isOneTapBlockedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (isHeavyGamePath(pathname)) return true;
  const path = stripLocalePrefix(pathname);
  return GAME_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** On phones Google's sheet iframe covers the cookie bar's buttons, so wait for the cookie choice. */
export function oneTapMayPrompt({ isPhone, consentDecided }: { isPhone: boolean; consentDecided: boolean }): boolean {
  return !isPhone || consentDecided;
}
