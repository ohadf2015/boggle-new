// Routes where the AdMob anchored banner is NOT shown.
// Gameplay routes hide the banner so it doesn't cover the play surface.
// `/adventure` is intentionally allowed — adventure layout reserves space
// via the --admob-banner-height CSS var so buttons are never covered.
// `/profile` and `/friends` allow banner (passive menu/social, safe to monetize).
// `/admin/*` is blocked — operator console, never monetized.
const GAME_ROUTES = [
  '/multiplayer',
  '/singleplayer',
  '/daily',
  '/challenge',
  '/join',
  '/brain',
  '/custom',
  '/party-screen',
  '/teacher',
  '/education',
  '/student',
  '/auth/callback',
  '/hebrew-multiplayer-word-game',
  '/admin',
];

const LOCALE_PREFIX = /^\/(en|he|sv|ja|es)/;

export function isAllowedAdBannerRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = pathname.replace(LOCALE_PREFIX, '') || '/';
  return !GAME_ROUTES.some((r) => path.startsWith(r));
}
