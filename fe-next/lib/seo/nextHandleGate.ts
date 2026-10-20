/**
 * Decide whether a request should reach Next's App Router.
 *
 * Idle old-space growth at games=0 is Next handle() SSR of the 718-line
 * [locale] layout. proxy.ts used to *rewrite* unlocalized bot hits into
 * /{locale}/… to save crawl-budget redirects — which also injected every
 * scanner slug into the locale tree (unique overflow ~5/min, old-space
 * +0.14 GB/h). Drop those before handle() so the router LRU / RSC path
 * never sees them.
 */
export const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];

const LOCALE_SET = new Set<string>(LOCALES);

/**
 * First URL segment under `app/[locale]/` (route groups like `(home)` omitted).
 * Keep in sync with that directory — `nextHandleGate.test.ts` asserts it.
 */
export const KNOWN_APP_ROOT_SEGMENTS: ReadonlySet<string> = new Set([
  'about',
  'accessibility',
  'account',
  'admin',
  'adventure',
  'ai-fanfare-demo',
  'anagram',
  'auth',
  'avatar-test',
  'balda-onlayn',
  'bell-ringer-word-games',
  'best-online-word-games',
  'blast',
  'blog',
  'boggle-word-shake-free',
  'brag',
  'brain',
  'brain-training-word-games',
  'challenge',
  'comeback-test',
  'community',
  'competitive-word-games',
  'connections',
  'contact',
  'create',
  'crossword',
  'curator',
  'custom',
  'daily',
  'daily-word-wheel',
  'dev',
  'download-word-game-android',
  'editorial-policy',
  'education',
  'embed',
  'erudit-onlayn',
  'faq',
  'filvordy-onlayn',
  'free-multiplayer-word-game',
  'friend-challenge',
  'friends',
  'glossary',
  'guides',
  'hamila-hayomit',
  'hebrew-classroom-vocabulary-games',
  'hebrew-multiplayer-word-game',
  'how-to-play',
  'igra-v-assotsiatsii-onlayn',
  'igry-v-slova-onlayn',
  'japanese-word-game',
  'join',
  'juego-de-palabras-multijugador',
  'juegos-vocabulario-aula',
  'leaderboard',
  'legal',
  'lexiclash-contra-wordle',
  'lexiclash-neged-wordle',
  'lexiclash-vs-apalabrados',
  'lexiclash-vs-blooket',
  'lexiclash-vs-cabanagrams',
  'lexiclash-vs-classpoint',
  'lexiclash-vs-flocabulary',
  'lexiclash-vs-freerice',
  'lexiclash-vs-gimkit',
  'lexiclash-vs-kahoot',
  'lexiclash-vs-kahoot-gimkit-vocabulary',
  'lexiclash-vs-mentimeter',
  'lexiclash-vs-nearpod',
  'lexiclash-vs-padlet',
  'lexiclash-vs-peardeck',
  'lexiclash-vs-popple',
  'lexiclash-vs-puzzly-words',
  'lexiclash-vs-quizlet',
  'lexiclash-vs-scrabble',
  'lexiclash-vs-socrative',
  'lexiclash-vs-vocabularyspellingcity',
  'lexiclash-vs-wayground',
  'lexiclash-vs-wooclap',
  'lexiclash-vs-wordfeud',
  'lexiclash-vs-wordle',
  'lexiclash-vs-wordwall',
  'lexiclash-vs-wordwall-kahoot-quizlet',
  'llms.txt',
  'multiplayer',
  'multiplayer-word-game-online',
  'online-word-games-with-friends',
  'party',
  'play-boggle-online-free',
  'player',
  'pricing',
  'profile',
  'quests',
  'quick-play',
  'referrals',
  'report',
  'rules',
  'scrabble-alternative-online',
  'settings',
  'singleplayer',
  'sitemap',
  'slovo-dnya',
  'sostav-slova-iz-bukv',
  'student',
  'substitute-teacher-word-games',
  'swedish-multiplayer-word-game',
  'teacher',
  'tools',
  'u',
  'unsubscribe',
  'vocabulary-games-for-middle-school',
  'word-blast-game',
  'word-craft',
  'word-craft-game',
  'word-craft-landing',
  'word-games-for-the-classroom',
  'word-games-online-free',
  'word-of-the-day',
  'word-tower',
  'words',
  'words-with-friends-alternative',
]);

/**
 * Segments that exist only as next.config redirect sources. Next applies those
 * redirects inside handle(), so the gate must pass them or they answer 404.
 * `nextHandleGate.test.ts` asserts every static redirect source passes.
 */
export const REDIRECT_ONLY_SEGMENTS: ReadonlySet<string> = new Set([
  'cookies',
  'for-schools',
  'play',
  'practice',
  'privacy',
  'privacy-policy',
  'room',
  'schools',
  'scrabble',
  'scrabble-multijugador-online',
  'scrabble-online-en-espanol',
  'scrabble-online-multijugador',
  'terms',
  'terms-of-service',
  'word-tower-v2',
]);

/**
 * Top-level directories under `public/`. Files inside them are static assets
 * that Next serves from disk. Keep in sync — `nextHandleGate.test.ts` asserts it.
 */
export const PUBLIC_DIRS: ReadonlySet<string> = new Set([
  '.well-known',
  'adventure-v2',
  'archetypes',
  'assets',
  'audio',
  'avatars',
  'badges',
  'blast',
  'brain-drills',
  'collectibles',
  'daily',
  'email',
  'email-assets',
  'fonts',
  'ftue',
  'gifs',
  'home',
  'images',
  'landing',
  'logos',
  'marketing',
  'mascot',
  'mascot-new',
  'mascots',
  'modes',
  'multiplayer',
  'music',
  'og',
  'onboarding',
  'practice',
  'screenshots',
  'seasons',
  'showcase3d',
  'sounds',
  'textures',
  'themes',
  'vendor',
  'videos',
  'word-craft',
]);

/** Scanner/secret probes. Same family as proxy.ts PROBE_RE. */
export const PROBE_RE =
  /^\/(?:\.(?:env|git|aws|ssh|DS_Store)|wp-admin|wp-login|wp-includes|wp-content|phpmyadmin|phpinfo|xmlrpc\.php|config\.json|credentials|secrets\.json|backup\.zip|admin\.php|\.well-known\/security\.txt)/i;

const SEO_BOT_RE =
  /googlebot|bingbot|yandexbot|duckduckbot|baiduspider|sogou|ahrefsbot|semrushbot|mj12bot|dotbot|bytespider|gptbot|claudebot|anthropic-ai|ccbot|applebot|petalbot|google-inspectiontool|google-extended/i;

const SOCIAL_UNFURL_RE =
  /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|pinterest|redditbot/i;

/** noindex room/code URLs — unique per invite, not for SEO crawlers. Social unfurlers still pass. */
const HIGH_CARDINALITY_NOINDEX_RE =
  /^\/(?:en|he|sv|ja|es|ru)\/(?:join|challenge|brag|friend-challenge|custom)\/[^/]+\/?$/i;

export type NextHandleDropReason = 'probe' | 'unknown-segment' | 'cardinality' | 'too-long';

export type NextHandleDecision =
  | { action: 'pass' }
  | { action: 'drop'; reason: NextHandleDropReason };

const MAX_PATH = 512;

export function pathSegments(pathname: string): string[] {
  const cut = (pathname.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  if (cut === '/') return [];
  return cut.split('/').filter(Boolean);
}

export function isSeoCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  if (SOCIAL_UNFURL_RE.test(userAgent)) return false;
  return SEO_BOT_RE.test(userAgent);
}

export function decideNextHandle(
  pathname: string,
  userAgent?: string | null,
): NextHandleDecision {
  const raw = pathname.split('?')[0] || '/';
  if (raw.length > MAX_PATH) return { action: 'drop', reason: 'too-long' };
  if (PROBE_RE.test(raw)) return { action: 'drop', reason: 'probe' };

  const parts = pathSegments(raw);
  if (parts.length === 0) return { action: 'pass' };

  const first = parts[0];
  if (first === '_next' || first === 'static' || first === 'api') return { action: 'pass' };
  if (first.includes('.')) return { action: 'pass' }; // public files: favicon.ico, ads.txt, …
  // Static files in public/ subdirectories (/mascot/winner.webp,
  // /mascots/styles/arcade.png, /home/daily-streak.webp …). These never hit the
  // locale layout SSR, so the leak gate must not 404 them — it did, which broke
  // every mascot (incl. the homepage loader) in production.
  if (PUBLIC_DIRS.has(first) && /\.[a-z0-9]{1,8}$/i.test(parts[parts.length - 1])) {
    return { action: 'pass' };
  }

  if (LOCALE_SET.has(first)) {
    if (parts.length === 1) return { action: 'pass' };
    const second = parts[1];
    if (!KNOWN_APP_ROOT_SEGMENTS.has(second) && !REDIRECT_ONLY_SEGMENTS.has(second)) {
      return { action: 'drop', reason: 'unknown-segment' };
    }
    if (isSeoCrawler(userAgent) && HIGH_CARDINALITY_NOINDEX_RE.test(raw)) {
      return { action: 'drop', reason: 'cardinality' };
    }
    return { action: 'pass' };
  }

  if (KNOWN_APP_ROOT_SEGMENTS.has(first) || REDIRECT_ONLY_SEGMENTS.has(first)) return { action: 'pass' };
  return { action: 'drop', reason: 'unknown-segment' };
}
