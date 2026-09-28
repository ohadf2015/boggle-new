/**
 * Routes where first paint is a fullscreen game shell. Third-party boot
 * (GSI, gtag fallback) on these paths competes with LCP/TBT — PSI unused-js
 * on /singleplayer was 76KiB GSI + 68KiB gtag with the game overlay as LCP.
 */
const HEAVY_GAME_PREFIXES = [
  '/singleplayer',
  '/multiplayer',
  '/adventure',
  '/daily',
  '/challenge',
  '/brain',
  '/custom',
] as const;

export function stripLocalePrefix(pathname: string): string {
  const stripped = pathname.replace(/^\/(en|he|sv|ja|es|ru)(?=\/|$)/, '');
  return stripped.length === 0 ? '/' : stripped;
}

export function isHeavyGamePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = stripLocalePrefix(pathname);
  return HEAVY_GAME_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
