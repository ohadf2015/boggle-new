// Routes where the AdMob anchored banner is NOT shown.
// Gameplay routes hide the banner so it doesn't cover the play surface.
// `/adventure` is intentionally allowed — adventure layout reserves space
// via the --admob-banner-height CSS var so buttons are never covered.
// `/profile` and `/friends` allow banner (passive menu/social, safe to monetize).
// `/admin/*` is blocked — operator console, never monetized.
//
// `/multiplayer` is deliberately ABSENT: lobby and active game share one path,
// so the route gate cannot distinguish them. The passive lobby (isActive=false)
// shows the banner; active gameplay/results add `screen-fit-locked` to <body>,
// which bannerController's shouldSuppressBanner() hides at the global level.
// Do NOT re-add `/multiplayer` here — it would silently kill the lobby banner.
const GAME_ROUTES = [
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
  '/connections',
  // Word Tower is a full-bleed play surface: the anchored banner AND the
  // install promo (which gates on this same list) were drawn over the crane and
  // the landing zone mid-drop.
  '/word-tower',
];

// Hub landings that share a prefix with a GAME_ROUTES entry but are themselves
// PASSIVE menus (not gameplay). The anchored banner is allowed here and sits
// pinned to the viewport bottom — the same static placement as the home
// dashboard — instead of an in-flow slot that scrolls with the content. Matched
// EXACTLY so the gameplay sub-routes (/brain/drills, /daily/word-hunt,
// /daily/word-wheel, /daily/flow) stay blocked by GAME_ROUTES below.
const ALLOWED_HUB_ROUTES = ['/brain', '/daily', '/connections'];

const LOCALE_PREFIX = /^\/(en|he|sv|ja|es|ru)/;

/**
 * Whether the AdMob anchored banner may show on this route.
 *
 * @param pathname current pathname (may include a locale prefix)
 * @param search   optional query params — used to keep the classroom/education
 *                 multiplayer lobby (`/multiplayer?classroom=true`) ad-free, a
 *                 child-directed surface that the bare path cannot reveal.
 */
export function isAllowedAdBannerRoute(
  pathname: string | null,
  search?: URLSearchParams | null,
): boolean {
  if (!pathname) return false;
  const path = pathname.replace(LOCALE_PREFIX, '') || '/';
  // Normalise a single trailing slash so '/daily/' matches the hub exactly.
  const normalized = path.length > 1 ? path.replace(/\/$/, '') : path;
  // Hub landings win over their GAME_ROUTES prefix — exact match only.
  if (ALLOWED_HUB_ROUTES.includes(normalized)) return true;
  // Classroom multiplayer is an education (child-directed) surface — never monetize.
  if (path.startsWith('/multiplayer') && search?.get('classroom') === 'true') {
    return false;
  }
  return !GAME_ROUTES.some((r) => path.startsWith(r));
}
