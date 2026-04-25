// Routes where the AdMob anchored banner is NOT shown.
// Gameplay routes hide the banner so it doesn't cover the play surface.
// `/adventure` is intentionally allowed — adventure layout reserves space
// via the --admob-banner-height CSS var so buttons are never covered.
// `/profile` allows banner (passive menu, safe to monetize).
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
  '/student',
  '/auth/callback',
  '/hebrew-multiplayer-word-game',
  '/friends',
];

const LOCALE_PREFIX = /^\/(en|he|sv|ja|es)/;

export function isAllowedAdBannerRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = pathname.replace(LOCALE_PREFIX, '') || '/';
  return !GAME_ROUTES.some((r) => path.startsWith(r));
}
