import type { MetadataRoute } from 'next';
import { wordsByLocale as wotdWords } from './[locale]/word-of-the-day/content';

const BASE_URL = 'https://www.lexiclash.live';
const LOCALES = ['he', 'en', 'sv', 'ja', 'es'] as const;

// Use stable dates instead of new Date() to avoid telling Google every page changed on every request.
// NEXT_PUBLIC_BUILD_TIME is set in next.config.mjs at build time, so this auto-updates on deploy.
const LAST_DEPLOYED = process.env.NEXT_PUBLIC_BUILD_TIME || '2026-03-26T00:00:00.000Z';
const BLOG_UPDATED = '2026-05-15T00:00:00.000Z';
const LEGAL_UPDATED = '2026-02-01T00:00:00.000Z';
const GUIDES_UPDATED = '2026-03-01T00:00:00.000Z';

type SitemapOpts = {
  lastModified: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
  images?: string[];
};

// Helper: generate hreflang alternates for a given path
function langAlternates(path: string): Record<string, string> {
  const alts: Record<string, string> = { 'x-default': `${BASE_URL}/en${path}` };
  LOCALES.forEach((l) => { alts[l] = `${BASE_URL}/${l}${path}`; });
  alts['en-IL'] = `${BASE_URL}/en${path}`;
  alts['he-IL'] = `${BASE_URL}/he${path}`;
  alts['en-US'] = `${BASE_URL}/en${path}`;
  alts['es-US'] = `${BASE_URL}/es${path}`;
  alts['en-GB'] = `${BASE_URL}/en${path}`;
  alts['en-SE'] = `${BASE_URL}/en${path}`;
  alts['sv-SE'] = `${BASE_URL}/sv${path}`;
  alts['en-JP'] = `${BASE_URL}/en${path}`;
  alts['ja-JP'] = `${BASE_URL}/ja${path}`;
  alts['en-ES'] = `${BASE_URL}/en${path}`;
  alts['es-ES'] = `${BASE_URL}/es${path}`;
  alts['en-MX'] = `${BASE_URL}/en${path}`;
  alts['es-MX'] = `${BASE_URL}/es${path}`;
  alts['en-AU'] = `${BASE_URL}/en${path}`;
  alts['es-AR'] = `${BASE_URL}/es${path}`;
  alts['es-CO'] = `${BASE_URL}/es${path}`;
  return alts;
}

// Helper: add a route for all locales
function addForAllLocales(routes: MetadataRoute.Sitemap, path: string, opts: SitemapOpts) {
  LOCALES.forEach((locale) => {
    routes.push({
      url: `${BASE_URL}/${locale}${path}`,
      lastModified: opts.lastModified,
      changeFrequency: opts.changeFrequency,
      priority: opts.priority,
      alternates: { languages: langAlternates(path) },
      ...(opts.images ? { images: opts.images } : {}),
    });
  });
}

// Helper: add a route for ONE locale only (default 'en').
// Use for pages that set robots: { index: locale === '<x>' } in their metadata
// — English-only-body comparisons and thin programmatic anagram/word-list pages.
// Emitting their other-locale variants here made Google crawl ~900 URLs only to
// hit a noindex tag (GSC "Excluded by noindex tag", 2026-05-20). hreflang is a
// self-referencing single-locale cluster — never points at a noindexed sibling.
function addForLocaleOnly(
  routes: MetadataRoute.Sitemap,
  path: string,
  opts: SitemapOpts,
  locale: (typeof LOCALES)[number] = 'en',
) {
  const url = `${BASE_URL}/${locale}${path}`;
  routes.push({
    url,
    lastModified: opts.lastModified,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: { languages: { 'x-default': url, [locale]: url } },
    ...(opts.images ? { images: opts.images } : {}),
  });
}

// Build ALL routes, then chunk them for generateSitemaps/sitemap
function getAllRoutes(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = [];

  const commonImages = [
    `${BASE_URL}/og-image-en.webp`,
    `${BASE_URL}/og-image-he.webp`,
    `${BASE_URL}/favicon.ico`,
    `${BASE_URL}/icon-192.png`,
    `${BASE_URL}/icon-512.png`,
    `${BASE_URL}/apple-touch-icon.png`,
  ];

  // ─── Home pages ───
  LOCALES.forEach((locale) => {
    const priority = (locale === 'he' || locale === 'en') ? 1 : 0.9;
    routes.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'weekly',
      priority,
      alternates: { languages: langAlternates('') },
      images: [...commonImages, `${BASE_URL}/og-image-${locale === 'he' ? 'he' : 'en'}.webp`],
    });
  });

  // ─── Core game mode pages ───
  // /singleplayer omitted: bare hits 308 → /multiplayer?quickPlay=true (see app/[locale]/singleplayer/page.tsx).
  // Route still serves variants (?autoStart, ?preset, ?boardCode, ?returnTo) but those are not sitemap-worthy.
  addForAllLocales(routes, '/multiplayer', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });
  addForAllLocales(routes, '/daily', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.9 });
  addForAllLocales(routes, '/blast', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });
  addForAllLocales(routes, '/adventure', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.8 });
  addForAllLocales(routes, '/daily/word-hunt', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.8 });
  addForAllLocales(routes, '/daily/word-wheel', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.85 });
  addForAllLocales(routes, '/daily/archive', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.7 });

  // Per-date archive pages (epoch → yesterday). Each renders unique server-side
  // stats/leaderboard for one finalized puzzle. Long-tail discovery: queries
  // like "lexiclash daily challenge #N" or "<date> word hunt results".
  // Bound: archive page validates date in [DAILY_CHALLENGE_EPOCH, yesterday];
  // listing today/future would 404 and erode crawl trust.
  const DAILY_EPOCH = new Date('2025-12-30T00:00:00Z');
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  for (let d = new Date(DAILY_EPOCH); d <= yesterday; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    addForAllLocales(routes, `/daily/archive/${dateStr}`, {
      lastModified: dateStr + 'T00:00:00.000Z',
      changeFrequency: 'monthly',
      priority: 0.55,
    });
  }

  // ─── Brain training ───
  addForAllLocales(routes, '/brain', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.8 });
  const drills = ['combo-master', 'lightning-round', 'memory-hunt', 'pattern-switcher', 'rare-gems'];
  drills.forEach((drill) => {
    addForAllLocales(routes, `/brain/drills/${drill}`, { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.7 });
  });

  // ─── Practice / tutorial ───
  // Beginner-friendly stress-free mode. Hub + per-mode tutorials. Strong long-tail
  // ("how to play boggle", "word game tutorial") + AI-crawler discovery via llms.txt.
  addForAllLocales(routes, '/practice', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.7 });
  const practiceModes = ['classic', 'wordHunt', 'wheelRush'];
  practiceModes.forEach((mode) => {
    addForAllLocales(routes, `/practice/${mode}`, { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.65 });
  });

  // ─── Tools ───
  addForAllLocales(routes, '/tools', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.7 });
  addForAllLocales(routes, '/tools/word-solver', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });

  // ─── Community ───
  addForAllLocales(routes, '/community', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.7 });

  // ─── Education ───
  addForAllLocales(routes, '/education', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.7 });
  addForAllLocales(routes, '/education/access', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.8 });
  addForAllLocales(routes, '/education/duels', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.65 });
  addForAllLocales(routes, '/education/classroom-game', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.65 });

  // ─── Education SEO landings (English-only target; non-EN noindexed via robots in metadata) ───
  // Each targets a high-volume teacher/ESL keyword cluster; non-EN locales hreflang back to /education.
  const educationLandings = [
    '/education/vocabulary-games-classroom',
    '/education/esl-word-games',
    '/education/games-for-teachers',
    '/education/spelling-bee-practice',
  ];
  educationLandings.forEach((path) => {
    routes.push({
      url: `${BASE_URL}/en${path}`,
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'weekly',
      priority: 0.85,
      alternates: {
        languages: {
          'x-default': `${BASE_URL}/en${path}`,
          en: `${BASE_URL}/en${path}`,
          he: `${BASE_URL}/he/hebrew-classroom-vocabulary-games`,
          sv: `${BASE_URL}/sv/education`,
          ja: `${BASE_URL}/ja/education`,
          es: `${BASE_URL}/es/juegos-vocabulario-aula`,
          'en-US': `${BASE_URL}/en${path}`,
          'en-GB': `${BASE_URL}/en${path}`,
          'en-IL': `${BASE_URL}/en${path}`,
        },
      },
      images: [`${BASE_URL}/og-image-en.webp`],
    });
  });

  // ─── Hebrew dedicated education landing (HE primary market) ───
  routes.push({
    url: `${BASE_URL}/he/hebrew-classroom-vocabulary-games`,
    lastModified: LAST_DEPLOYED,
    changeFrequency: 'weekly',
    priority: 0.9,
    alternates: {
      languages: {
        'x-default': `${BASE_URL}/en/education/vocabulary-games-classroom`,
        en: `${BASE_URL}/en/education/vocabulary-games-classroom`,
        he: `${BASE_URL}/he/hebrew-classroom-vocabulary-games`,
        sv: `${BASE_URL}/sv/education`,
        ja: `${BASE_URL}/ja/education`,
        es: `${BASE_URL}/es/juegos-vocabulario-aula`,
        'he-IL': `${BASE_URL}/he/hebrew-classroom-vocabulary-games`,
        'en-IL': `${BASE_URL}/en/education/vocabulary-games-classroom`,
      },
    },
    images: [`${BASE_URL}/og-image-he.webp`],
  });

  // ─── Spanish dedicated education landing ───
  routes.push({
    url: `${BASE_URL}/es/juegos-vocabulario-aula`,
    lastModified: LAST_DEPLOYED,
    changeFrequency: 'weekly',
    priority: 0.85,
    alternates: {
      languages: {
        'x-default': `${BASE_URL}/en/education/vocabulary-games-classroom`,
        en: `${BASE_URL}/en/education/vocabulary-games-classroom`,
        he: `${BASE_URL}/he/hebrew-classroom-vocabulary-games`,
        sv: `${BASE_URL}/sv/education`,
        ja: `${BASE_URL}/ja/education`,
        es: `${BASE_URL}/es/juegos-vocabulario-aula`,
        'es-ES': `${BASE_URL}/es/juegos-vocabulario-aula`,
        'es-MX': `${BASE_URL}/es/juegos-vocabulario-aula`,
        'es-AR': `${BASE_URL}/es/juegos-vocabulario-aula`,
        'es-CO': `${BASE_URL}/es/juegos-vocabulario-aula`,
        'es-US': `${BASE_URL}/es/juegos-vocabulario-aula`,
      },
    },
    images: [`${BASE_URL}/og-image-es.webp`],
  });

  // ─── Content pages ───
  addForAllLocales(routes, '/how-to-play', { lastModified: GUIDES_UPDATED, changeFrequency: 'weekly', priority: 0.9 });
  addForAllLocales(routes, '/rules', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.7 });
  addForAllLocales(routes, '/word-of-the-day', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.9 });

  // Per-date Word of the Day pages — each curated word becomes a distinct indexable URL.
  // Only emit per-locale URLs where that locale actually has the word, so we don't serve
  // identical EN content under /he/.../<date> and dilute the HE corpus.
  LOCALES.forEach((locale) => {
    wotdWords[locale]?.forEach((entry) => {
      routes.push({
        url: `${BASE_URL}/${locale}/word-of-the-day/${entry.dateKey}`,
        lastModified: `${entry.dateKey}T00:00:00.000Z`,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    });
  });
  addForAllLocales(routes, '/leaderboard', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.8 });

  // ─── Comparison pages ───
  // English-only body (see e.g. app/[locale]/lexiclash-vs-wordle/page.tsx:
  // "Body is English-only"). Pages set robots: { index: locale === 'en' } and
  // hreflang each non-EN locale to its localized equivalent — so only the /en/
  // URL is indexable here. Emit EN-only; non-EN crawls would just hit noindex.
  addForLocaleOnly(routes, '/lexiclash-vs-wordle', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-scrabble', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-cabanagrams', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-puzzly-words', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-popple', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-quizlet', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-kahoot', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-wordwall', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });

  // Per-locale competitor landings — locale-specific indexing for native switcher intent
  routes.push({
    url: `${BASE_URL}/sv/lexiclash-vs-wordfeud`,
    lastModified: LAST_DEPLOYED,
    changeFrequency: 'monthly',
    priority: 0.85,
    alternates: {
      languages: {
        'x-default': `${BASE_URL}/sv/lexiclash-vs-wordfeud`,
        sv: `${BASE_URL}/sv/lexiclash-vs-wordfeud`,
        'sv-SE': `${BASE_URL}/sv/lexiclash-vs-wordfeud`,
      },
    },
  });
  routes.push({
    url: `${BASE_URL}/es/lexiclash-vs-apalabrados`,
    lastModified: LAST_DEPLOYED,
    changeFrequency: 'monthly',
    priority: 0.85,
    alternates: {
      languages: {
        'x-default': `${BASE_URL}/es/lexiclash-vs-apalabrados`,
        es: `${BASE_URL}/es/lexiclash-vs-apalabrados`,
        'es-ES': `${BASE_URL}/es/lexiclash-vs-apalabrados`,
        'es-MX': `${BASE_URL}/es/lexiclash-vs-apalabrados`,
        'es-AR': `${BASE_URL}/es/lexiclash-vs-apalabrados`,
        'es-CO': `${BASE_URL}/es/lexiclash-vs-apalabrados`,
        'es-US': `${BASE_URL}/es/lexiclash-vs-apalabrados`,
      },
    },
  });

  // ─── Guides & Glossary ───
  addForAllLocales(routes, '/guides', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.7 });
  const guideSlugs = ['classic-strategy', 'blast-strategy', 'word-hunt-strategy'];
  guideSlugs.forEach((slug) => {
    addForAllLocales(routes, `/guides/${slug}`, { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.85 });
  });
  addForAllLocales(routes, '/glossary', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.8 });

  // ─── Blog ───
  addForAllLocales(routes, '/blog', { lastModified: BLOG_UPDATED, changeFrequency: 'weekly', priority: 0.9 });
  const blogArticles = [
    '10-surprising-benefits-word-games',
    'science-behind-word-games',
    'daily-challenge-strategies',
    'multilingual-word-learning',
    'top-player-secrets',
    'improve-word-game-skills',
    'why-word-games-are-addictive',
    'best-boggle-alternatives-2026',
    'word-games-for-brain-training',
    'hebrew-word-games-guide',
    'multiplayer-word-games-social',
    'vocabulary-building-strategies',
    'word-game-history',
    'word-games-and-mental-health',
    'word-games-for-kids-education',
    'boggle-vs-wordle',
    'boggle-vs-scrabble',
    'boggle-vs-words-with-friends',
    'netflix-word-game-2026-rise',
    'most-popular-word-games-2026',
    'free-word-games-online',
    'milat-hayom-habit',
    'mishachke-milim-chinuch',
    'alternativas-a-scrabble',
    'juegos-palabras-gratis',
    'ordspel-familjer',
  ];
  blogArticles.forEach((slug) => {
    addForAllLocales(routes, `/blog/${slug}`, { lastModified: BLOG_UPDATED, changeFrequency: 'monthly', priority: 0.85 });
  });

  // ─── Info pages ───
  addForAllLocales(routes, '/faq', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.8 });
  addForAllLocales(routes, '/about', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.6 });
  addForAllLocales(routes, '/contact', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.5 });
  // /profile is noindexed — excluded from sitemap to avoid wasting crawl budget
  addForAllLocales(routes, '/accessibility', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.4 });
  addForAllLocales(routes, '/sitemap', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.4 });

  // ─── Legal pages ───
  addForAllLocales(routes, '/legal', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.4 });
  addForAllLocales(routes, '/legal/terms', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.3 });
  addForAllLocales(routes, '/legal/privacy', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.3 });
  addForAllLocales(routes, '/legal/disclaimer', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.3 });
  addForAllLocales(routes, '/legal/cookies', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.3 });

  // ─── SEO landing pages (market-specific, single locale) ───
  // English commercial-intent doorways targeting AI grounding queries like
  // "words with friends multiplayer free online". Each page has unique
  // 200+ line content (FAQs, comparison tables, FAQPage JSON-LD) and is
  // marked index:true in its generateMetadata. Hreflang points non-en
  // locales to their localized equivalent.
  const seoLandings = [
    { locale: 'en', path: '/daily-word-wheel', img: 'en' },
    { locale: 'en', path: '/words-with-friends-alternative', img: 'en' },
    { locale: 'en', path: '/online-word-games-with-friends', img: 'en' },
    { locale: 'en', path: '/multiplayer-word-game-online', img: 'en' },
    { locale: 'en', path: '/play-boggle-online-free', img: 'en' },
    { locale: 'en', path: '/word-games-online-free', img: 'en' },
    { locale: 'en', path: '/scrabble-alternative-online', img: 'en' },
    { locale: 'en', path: '/competitive-word-games', img: 'en' },
  ] as const;

  // Brain Training Word Games — native content in all 5 locales, register each
  addForAllLocales(routes, '/brain-training-word-games', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });
  seoLandings.forEach(({ locale, path, img }) => {
    routes.push({
      url: `${BASE_URL}/${locale}${path}`,
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'weekly',
      priority: 0.95,
      alternates: {
        languages: {
          'x-default': `${BASE_URL}/${locale}${path}`,
          [locale]: `${BASE_URL}/${locale}${path}`,
          'en-IL': `${BASE_URL}/en/multiplayer-word-game-online`,
          'he-IL': `${BASE_URL}/he/hebrew-multiplayer-word-game`,
          'en-US': `${BASE_URL}/en/multiplayer-word-game-online`,
          'es-US': `${BASE_URL}/es/juego-de-palabras-multijugador`,
          'en-GB': `${BASE_URL}/en/multiplayer-word-game-online`,
          'en-SE': `${BASE_URL}/en/multiplayer-word-game-online`,
          'sv-SE': `${BASE_URL}/sv/swedish-multiplayer-word-game`,
          'en-JP': `${BASE_URL}/en/multiplayer-word-game-online`,
          'ja-JP': `${BASE_URL}/ja/japanese-word-game`,
          'en-ES': `${BASE_URL}/en/multiplayer-word-game-online`,
          'es-ES': `${BASE_URL}/es/juego-de-palabras-multijugador`,
          'en-MX': `${BASE_URL}/en/multiplayer-word-game-online`,
          'es-MX': `${BASE_URL}/es/juego-de-palabras-multijugador`,
          'en-AU': `${BASE_URL}/en/multiplayer-word-game-online`,
          'es-AR': `${BASE_URL}/es/juego-de-palabras-multijugador`,
          'es-CO': `${BASE_URL}/es/juego-de-palabras-multijugador`,
        },
      },
      images: [`${BASE_URL}/og-image-${img}.webp`],
    });
  });

  // ─── Author page ───
  addForAllLocales(routes, '/about/ohad-fisher', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.7 });

  // ─── Editorial policy (E-E-A-T trust) ───
  addForAllLocales(routes, '/editorial-policy', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.6 });

  // ─── Words hub ───
  addForAllLocales(routes, '/words', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.7 });

  // ─── Programmatic SEO: N-letter word pages (EN-only: 6 URLs) ───
  // Page sets robots: { index: locale === 'en' } (English word lists). Non-EN
  // variants are noindexed → emit EN-only to keep the sitemap crawl-clean.
  const wordLengths = [3, 4, 5, 6, 7, 8];
  wordLengths.forEach((n) => {
    addForLocaleOnly(routes, `/words/${n}-letter-words`, {
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  });

  // ─── Programmatic SEO: Words starting with letter (EN-only: 26 URLs) ───
  // Same English-only-indexed pattern as the N-letter pages above.
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  alphabet.forEach((letter) => {
    addForLocaleOnly(routes, `/words/starting-with/${letter}`, {
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'monthly',
      priority: 0.65,
    });
  });

  // Anagram hub page (parent of programmatic /anagram/[letters] routes).
  // EN-only indexed (app/[locale]/anagram/page.tsx robots: { index: isEnglish }).
  addForLocaleOnly(routes, '/anagram', {
    lastModified: LAST_DEPLOYED,
    changeFrequency: 'monthly',
    priority: 0.7,
  });

  // ─── Programmatic SEO: Anagram solver (150 seed letter combos) ───
  // Top-N common letter racks from competitive word games.
  // Long tail discovered via internal links + dynamic crawling.
  const anagramSeeds = [
    // High-frequency 5-6 letter combos
    'aaeio', 'aeiourstn', 'aeiort', 'aeinort', 'aeirst', 'aelort', 'aelrst', 'aelstu',
    'aemnor', 'aenors', 'aenort', 'aenrst', 'aenrsu', 'aenstu', 'aeoprst', 'aersst', 'aerstT',
    'aerstuv', 'aertsu', 'aersty', 'aertxy', 'aeruvy', 'aesttu', 'aestxy', 'aestuv',
    // Common 4-5 letter combos
    'acre', 'aces', 'acts', 'aide', 'aids', 'ails', 'airs', 'ales', 'also', 'ante', 'ants',
    'apes', 'arms', 'arts', 'ates', 'bade', 'bags', 'bake', 'bald', 'bale', 'ball', 'band',
    'bane', 'bank', 'bare', 'bark', 'barn', 'base', 'bate', 'bats', 'bean', 'bear', 'beat',
    'beds', 'beef', 'been', 'beer', 'bees', 'bell', 'belt', 'bend', 'bent', 'best', 'beta',
    'bile', 'bind', 'bird', 'bite', 'bits', 'blow', 'blue', 'boat', 'bold', 'bolt', 'bomb',
    'bone', 'book', 'boot', 'bore', 'born', 'both', 'bowl', 'cake', 'cane', 'cans', 'cape',
    'card', 'care', 'cart', 'case', 'cast', 'cave', 'cell', 'cent', 'chin', 'cite', 'clay',
    'coat', 'code', 'cold', 'come', 'cone', 'cook', 'cool', 'cope', 'copy', 'cord', 'core',
    'corn', 'cots', 'crab', 'cute', 'dale', 'dame', 'damp', 'dare', 'dark', 'date', 'dawn',
    'days', 'dead', 'deal', 'dean', 'dear', 'deck', 'deep', 'dent', 'desk', 'dial', 'dice',
    'dies', 'dime', 'dine', 'dire', 'dirt', 'dish', 'dive', 'dock', 'does', 'dome', 'done',
    'door', 'dose', 'dove', 'down', 'draw', 'drew', 'drop', 'drug', 'dual', 'duce', 'duke',
    'dull', 'dune', 'dusk', 'east', 'easy', 'echo', 'edge', 'edit', 'else', 'emit', 'epic',
    'euro', 'ever', 'evil', 'exam', 'exit', 'face', 'fact', 'fade', 'fail', 'fair', 'fake',
    'fall', 'fame', 'fare', 'farm', 'fast', 'fate', 'fear', 'feat', 'feed', 'feel', 'feet',
    'fell', 'felt', 'fern', 'file', 'fill', 'film', 'find', 'fine', 'fire', 'firm', 'fish',
    'fist', 'five', 'flag', 'flat', 'flaw', 'flee', 'flew', 'flip', 'flow', 'foam', 'fold',
    'folk', 'fond', 'font', 'food', 'fool', 'foot', 'fore', 'fork', 'form', 'fort', 'foul',
    'four', 'free', 'from', 'fuel', 'full', 'fund', 'fury', 'game', 'gang', 'gate', 'gave',
    'gear', 'gene', 'gift', 'girl', 'give', 'glad', 'glen', 'glow', 'glue', 'goat', 'gold',
    'golf', 'gone', 'good', 'grab', 'gray', 'grew', 'grid', 'grim', 'grip', 'grow', 'gulf'
  ];

  // Normalize and dedupe
  const anagramSet = new Set(
    anagramSeeds.map(s => s.toLowerCase().split('').sort().join(''))
  );

  // EN-only indexed (app/[locale]/anagram/[letters]/page.tsx robots:
  // { index: locale === 'en' }) — thin programmatic pages, English dictionary.
  Array.from(anagramSet).forEach((letters) => {
    addForLocaleOnly(routes, `/anagram/${letters}`, {
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  });

  return routes;
}

// Single sitemap at /sitemap.xml. ~410 URLs × ~2KB hreflangs ≈ 820KB —
// well under Google's 50MB / 50k URL limit. generateSitemaps() chunks to
// /sitemap/[id].xml but does NOT auto-create an index at /sitemap.xml,
// which then collides with the [locale] catch-all and serves HTML.
export default function sitemap(): MetadataRoute.Sitemap {
  return getAllRoutes();
}
