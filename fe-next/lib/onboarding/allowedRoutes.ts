import { locales } from '@/i18n/config';

const LOCALE_HOME = new RegExp(`^/(?:${locales.join('|')})?/?$`);

/** Locale homepage only: `/`, `/en`, `/en/`, `/he`, … (query/hash ignored). */
function isLocaleHome(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const stripped = pathname.split('?')[0].split('#')[0];
  return LOCALE_HOME.test(stripped);
}

/** Routes where the FTUE short-onboarding may render (locale homepage only). */
export function isOnboardingAllowedRoute(pathname: string | null | undefined): boolean {
  return isLocaleHome(pathname);
}

const LOCALE_PREFIX = /^\/(?:en|he|sv|ja|es|ru)(?=\/|$)/;

/**
 * SEO / marketing landing-page prefixes (locale-stripped). These are public
 * "doorway" pages whose job is to convert search visitors — the full-screen
 * "pick your style" popup buries their hero and hurts CWV/SEO, so it must never
 * auto-open here. Mirrors the "SEO landings" taxonomy used by GlobalBottomNav.
 *
 * NOT included on purpose: /blog and other editorial content (a returning user
 * reading an article is fine to prompt), and every in-app/game surface
 * (/multiplayer, /daily, /practice, …) where the popup is meant to appear.
 */
const MARKETING_LANDING_PREFIXES: ReadonlyArray<string> = [
  // Education SEO section (hub + all subpages are search doorways)
  '/education',
  // Info / content doorways
  '/about',
  '/faq',
  '/how-to-play',
  '/rules',
  '/glossary',
  '/guides',
  '/contact',
  '/legal',
  '/accessibility',
  '/editorial-policy',
  '/download-word-game-android',
  // Word-game SEO doorways
  '/best-online-word-games',
  '/boggle-word-shake-free',
  '/play-boggle-online-free',
  '/word-games-online-free',
  '/brain-training-word-games',
  '/competitive-word-games',
  '/multiplayer-word-game-online',
  '/online-word-games-with-friends',
  '/words-with-friends-alternative',
  '/free-multiplayer-word-game',
  '/scrabble-alternative-online',
  '/word-craft-landing',
  // Locale-specific landings
  '/hebrew-classroom-vocabulary-games',
  '/hebrew-multiplayer-word-game',
  '/swedish-multiplayer-word-game',
  '/japanese-word-game',
  '/juego-de-palabras-multijugador',
  '/juegos-vocabulario-aula',
  // Education keyword landings
  '/vocabulary-games-for-middle-school',
  '/word-games-for-the-classroom',
  '/bell-ringer-word-games',
  '/substitute-teacher-word-games',
  // Competitor comparison landings
  '/lexiclash-vs-apalabrados',
  '/lexiclash-vs-blooket',
  '/lexiclash-vs-cabanagrams',
  '/lexiclash-vs-flocabulary',
  '/lexiclash-vs-freerice',
  '/lexiclash-vs-kahoot',
  '/lexiclash-vs-kahoot-gimkit-vocabulary',
  '/lexiclash-vs-popple',
  '/lexiclash-vs-puzzly-words',
  '/lexiclash-vs-quizlet',
  '/lexiclash-vs-scrabble',
  '/lexiclash-vs-vocabularyspellingcity',
  '/lexiclash-vs-wordfeud',
  '/lexiclash-vs-wordle',
  '/lexiclash-vs-wordwall',
  '/lexiclash-vs-wordwall-kahoot-quizlet',
  '/lexiclash-contra-wordle',
  '/lexiclash-neged-wordle',
];

/** Exact match or a `prefix + '/'` child, so '/about' never swallows '/aboutus'. */
function matchesMarketingLanding(stripped: string): boolean {
  return MARKETING_LANDING_PREFIXES.some(
    (prefix) => stripped === prefix || stripped.startsWith(prefix + '/'),
  );
}

/**
 * Marketing landing routes where the one-time "pick your style" popup must NOT
 * auto-open: the locale homepage AND every SEO/marketing doorway page (education
 * section, word-game/comparison landings, info pages). On all of these the
 * full-screen popup covers the hero and hurts CWV/SEO. Returning users get
 * prompted on their next in-app navigation instead.
 */
export function isLandingRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (isLocaleHome(pathname)) return true;
  const stripped = pathname.split('?')[0].split('#')[0].replace(LOCALE_PREFIX, '') || '/';
  return matchesMarketingLanding(stripped);
}
