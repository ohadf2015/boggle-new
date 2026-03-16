export default function sitemap() {
  const baseUrl = 'https://www.lexiclash.live';
  const locales = ['he', 'en', 'sv', 'ja', 'es'];

  // Use stable dates instead of new Date() to avoid telling Google every page changed on every request.
  // Update these dates when actual content changes are deployed.
  const LAST_DEPLOYED = '2026-03-16T00:00:00.000Z';
  const BLOG_UPDATED = '2026-03-10T00:00:00.000Z';
  const LEGAL_UPDATED = '2026-02-01T00:00:00.000Z';
  const GUIDES_UPDATED = '2026-03-01T00:00:00.000Z';

  const routes = [];

  // Helper: generate hreflang alternates for a given path
  function langAlternates(path) {
    const alts = { 'x-default': `${baseUrl}/en${path}` };
    locales.forEach((l) => { alts[l] = `${baseUrl}/${l}${path}`; });
    return alts;
  }

  // Helper: add a route for all locales
  function addForAllLocales(path, opts) {
    locales.forEach((locale) => {
      routes.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: opts.lastModified,
        changeFrequency: opts.changeFrequency,
        priority: opts.priority,
        alternates: { languages: langAlternates(path) },
        ...(opts.images ? { images: opts.images } : {}),
      });
    });
  }

  // Common images for home pages
  const commonImages = [
    `${baseUrl}/og-image.jpg`,
    `${baseUrl}/og-image-en.jpg`,
    `${baseUrl}/og-image-he.jpg`,
    `${baseUrl}/favicon.ico`,
    `${baseUrl}/icon-192.png`,
    `${baseUrl}/icon-512.png`,
    `${baseUrl}/apple-touch-icon.png`,
  ];

  // ─── Home pages ───
  locales.forEach((locale) => {
    const priority = (locale === 'he' || locale === 'en') ? 1 : 0.9;
    routes.push({
      url: `${baseUrl}/${locale}`,
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'weekly',
      priority,
      alternates: { languages: langAlternates('') },
      images: [...commonImages, `${baseUrl}/og-image-${locale === 'he' ? 'he' : 'en'}.jpg`],
    });
  });

  // ─── Core game mode pages ───
  addForAllLocales('/singleplayer', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });
  addForAllLocales('/multiplayer', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });
  addForAllLocales('/daily', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.9 });
  addForAllLocales('/blast', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });
  addForAllLocales('/adventure', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.8 });
  addForAllLocales('/daily/word-hunt', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.8 });

  // ─── Brain training ───
  addForAllLocales('/brain', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.8 });
  const drills = ['combo-master', 'lightning-round', 'memory-hunt', 'pattern-switcher', 'rare-gems'];
  drills.forEach((drill) => {
    addForAllLocales(`/brain/drills/${drill}`, { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.7 });
  });

  // ─── Tools ───
  addForAllLocales('/tools', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.7 });
  addForAllLocales('/tools/word-solver', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });

  // ─── Community ───
  addForAllLocales('/community', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.7 });

  // ─── Education ───
  addForAllLocales('/education', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.7 });

  // ─── Content pages ───
  addForAllLocales('/how-to-play', { lastModified: GUIDES_UPDATED, changeFrequency: 'weekly', priority: 0.9 });
  addForAllLocales('/rules', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.7 });
  addForAllLocales('/word-of-the-day', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.9 });
  addForAllLocales('/leaderboard', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.8 });

  // ─── Guides & Glossary ───
  addForAllLocales('/guides', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.7 });
  const guideSlugs = ['classic-strategy', 'blast-strategy', 'word-hunt-strategy'];
  guideSlugs.forEach((slug) => {
    addForAllLocales(`/guides/${slug}`, { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.85 });
  });
  addForAllLocales('/glossary', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.8 });

  // ─── Blog ───
  addForAllLocales('/blog', { lastModified: BLOG_UPDATED, changeFrequency: 'weekly', priority: 0.8 });
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
    // Previously missing from sitemap:
    'hebrew-word-games-guide',
    'multiplayer-word-games-social',
    'vocabulary-building-strategies',
    'word-game-history',
    'word-games-and-mental-health',
    'word-games-for-kids-education',
  ];
  blogArticles.forEach((slug) => {
    addForAllLocales(`/blog/${slug}`, { lastModified: BLOG_UPDATED, changeFrequency: 'monthly', priority: 0.7 });
  });

  // ─── Info pages ───
  addForAllLocales('/faq', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.8 });
  addForAllLocales('/about', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.6 });
  addForAllLocales('/contact', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.5 });
  addForAllLocales('/profile', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.6 });
  addForAllLocales('/accessibility', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.4 });

  // ─── Legal pages ───
  addForAllLocales('/legal', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.4 });
  addForAllLocales('/legal/terms', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.3 });
  addForAllLocales('/legal/privacy', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.3 });
  addForAllLocales('/legal/disclaimer', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.3 });
  addForAllLocales('/legal/cookies', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.3 });

  // ─── SEO landing pages (market-specific, single locale) ───
  const seoLandings = [
    { locale: 'he', path: '/hebrew-multiplayer-word-game', img: 'he' },
    { locale: 'sv', path: '/swedish-multiplayer-word-game', img: 'sv' },
    { locale: 'ja', path: '/japanese-word-game', img: 'ja' },
    { locale: 'en', path: '/multiplayer-word-game-online', img: 'en' },
    { locale: 'es', path: '/juego-de-palabras-multijugador', img: 'es' },
  ];
  seoLandings.forEach(({ locale, path, img }) => {
    routes.push({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'weekly',
      priority: 0.95,
      alternates: {
        languages: {
          'x-default': `${baseUrl}/${locale}${path}`,
          [locale]: `${baseUrl}/${locale}${path}`,
        },
      },
      images: [`${baseUrl}/og-image-${img}.jpg`],
    });
  });

  // ─── Programmatic SEO: N-letter word pages (30 URLs) ───
  const wordLengths = [3, 4, 5, 6, 7, 8];
  wordLengths.forEach((n) => {
    addForAllLocales(`/words/${n}-letter-words`, {
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  });

  // ─── Programmatic SEO: Words starting with letter (130 URLs) ───
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  alphabet.forEach((letter) => {
    addForAllLocales(`/words/starting-with/${letter}`, {
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'monthly',
      priority: 0.65,
    });
  });

  return routes;
}
