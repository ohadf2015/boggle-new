import type { MetadataRoute } from 'next';

const BASE_URL = 'https://www.lexiclash.live';
const LOCALES = ['he', 'en', 'sv', 'ja', 'es'] as const;

// Use stable dates instead of new Date() to avoid telling Google every page changed on every request.
// NEXT_PUBLIC_BUILD_TIME is set in next.config.mjs at build time, so this auto-updates on deploy.
const LAST_DEPLOYED = process.env.NEXT_PUBLIC_BUILD_TIME || '2026-03-26T00:00:00.000Z';
const BLOG_UPDATED = '2026-03-16T00:00:00.000Z';
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
  addForAllLocales(routes, '/singleplayer', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });
  addForAllLocales(routes, '/multiplayer', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });
  addForAllLocales(routes, '/daily', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.9 });
  addForAllLocales(routes, '/blast', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });
  addForAllLocales(routes, '/adventure', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.8 });
  addForAllLocales(routes, '/daily/word-hunt', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.8 });
  addForAllLocales(routes, '/daily/word-wheel', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.85 });
  addForAllLocales(routes, '/daily/archive', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.7 });

  // ─── Brain training ───
  addForAllLocales(routes, '/brain', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.8 });
  const drills = ['combo-master', 'lightning-round', 'memory-hunt', 'pattern-switcher', 'rare-gems'];
  drills.forEach((drill) => {
    addForAllLocales(routes, `/brain/drills/${drill}`, { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.7 });
  });

  // ─── Tools ───
  addForAllLocales(routes, '/tools', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.7 });
  addForAllLocales(routes, '/tools/word-solver', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });

  // ─── Community ───
  addForAllLocales(routes, '/community', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.7 });

  // ─── Education ───
  addForAllLocales(routes, '/education', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.7 });

  // ─── Content pages ───
  addForAllLocales(routes, '/how-to-play', { lastModified: GUIDES_UPDATED, changeFrequency: 'weekly', priority: 0.9 });
  addForAllLocales(routes, '/rules', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.7 });
  addForAllLocales(routes, '/word-of-the-day', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.9 });
  addForAllLocales(routes, '/leaderboard', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.8 });

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
  const seoLandings = [
    { locale: 'he', path: '/hebrew-multiplayer-word-game', img: 'he' },
    { locale: 'sv', path: '/swedish-multiplayer-word-game', img: 'sv' },
    { locale: 'ja', path: '/japanese-word-game', img: 'ja' },
    { locale: 'en', path: '/multiplayer-word-game-online', img: 'en' },
    { locale: 'en', path: '/play-boggle-online-free', img: 'en' },
    { locale: 'en', path: '/boggle-word-shake-free', img: 'en' },
    { locale: 'en', path: '/word-games-online-free', img: 'en' },
    { locale: 'en', path: '/daily-word-wheel', img: 'en' },
    { locale: 'en', path: '/online-word-games-with-friends', img: 'en' },
    { locale: 'es', path: '/juego-de-palabras-multijugador', img: 'es' },
    { locale: 'en', path: '/lexiclash-vs-wordle', img: 'en' },
    { locale: 'en', path: '/lexiclash-vs-scrabble', img: 'en' },
    { locale: 'en', path: '/best-online-word-games', img: 'en' },
    { locale: 'en', path: '/words-with-friends-alternative', img: 'en' },
    { locale: 'he', path: '/lexiclash-neged-wordle', img: 'he' },
    { locale: 'es', path: '/lexiclash-contra-wordle', img: 'es' },
  ] as const;
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
  addForAllLocales(routes, '/about/the-word-nerd', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.7 });

  // ─── Editorial policy (E-E-A-T / AdSense trust) ───
  addForAllLocales(routes, '/editorial-policy', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.6 });

  // ─── Words hub ───
  addForAllLocales(routes, '/words', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.7 });

  // ─── Programmatic SEO: N-letter word pages (30 URLs) ───
  const wordLengths = [3, 4, 5, 6, 7, 8];
  wordLengths.forEach((n) => {
    addForAllLocales(routes, `/words/${n}-letter-words`, {
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  });

  // ─── Programmatic SEO: Words starting with letter (130 URLs) ───
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  alphabet.forEach((letter) => {
    addForAllLocales(routes, `/words/starting-with/${letter}`, {
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'monthly',
      priority: 0.65,
    });
  });

  return routes;
}

// Split into chunks of 50 URLs per sitemap file to stay well under XML size limits.
// Each URL with ~20 hreflang alternates generates ~2KB of XML.
const URLS_PER_SITEMAP = 50;

export async function generateSitemaps() {
  const allRoutes = getAllRoutes();
  const count = Math.ceil(allRoutes.length / URLS_PER_SITEMAP);
  return Array.from({ length: count }, (_, i) => ({ id: i }));
}

export default function sitemap({ id }: { id: number }): MetadataRoute.Sitemap {
  const allRoutes = getAllRoutes();
  const start = id * URLS_PER_SITEMAP;
  return allRoutes.slice(start, start + URLS_PER_SITEMAP);
}
