import type { MetadataRoute } from 'next';
import { hreflangAlternates } from '@/lib/seo/hreflang';
import { SUPPORTED_LANDING_LOCALES as CONNECTIONS_LANDING_LOCALES } from './[locale]/connections/content';

const BASE_URL = 'https://www.lexiclash.live';
const LOCALES = ['he', 'en', 'sv', 'ja', 'es', 'ru'] as const;

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

// Helper: generate hreflang alternates for a given path.
// Delegates to lib/seo/hreflang so the sitemap and each page's own
// <link rel="alternate"> set can never drift apart again.
function langAlternates(path: string): Record<string, string> {
  return hreflangAlternates(path);
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
  // /blast, /word-craft, /daily/word-hunt, /daily/word-wheel are near-empty
  // game shells (30-282 crawlable words, measured live 2026-07-02) — noindexed
  // at page level after the AdSense "low value content" rejection. Search
  // intent is covered by /word-craft-game, /daily-word-wheel and /guides/*.
  addForAllLocales(routes, '/word-craft-game', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.8 });
  // /adventure dropped while BETA-gated (PageClient redirects non-beta users —
  // crawlers and the AdSense reviewer land on a wall). Restore at GA together
  // with the noindex in adventure/page.tsx + layout.tsx.
  addForAllLocales(routes, '/daily/archive', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.7 });

  // Connections emits exactly the locales that have native landing copy —
  // SUPPORTED_LANDING_LOCALES is the single source of truth, shared with
  // connections/page.tsx (which gates robots + hreflang off the same list).
  // Anything not in it is noindex → canonical en, so it must not be listed here.
  {
    const connectionsAlternates: Record<string, string> = {
      'x-default': `${BASE_URL}/en/connections`,
    };
    CONNECTIONS_LANDING_LOCALES.forEach((l) => {
      connectionsAlternates[l] = `${BASE_URL}/${l}/connections`;
    });
    CONNECTIONS_LANDING_LOCALES.forEach((locale) => {
      routes.push({
        url: `${BASE_URL}/${locale}/connections`,
        lastModified: LAST_DEPLOYED,
        changeFrequency: 'daily',
        priority: 0.8,
        alternates: { languages: connectionsAlternates },
      });
    });
  }

  // Per-date archive child pages are intentionally NOT listed here.
  // They are thin per-puzzle stat/leaderboard snapshots and were dragging the
  // domain's content-quality average below AdSense's bar (~780 URLs across 5
  // locales). They are now noindex,follow at the page level and stay fully
  // playable — we just don't advertise them. The /daily/archive hub (above)
  // remains the canonical entry point. See docs/2026-06-04-adsense-approval-plan.md.

  // ─── Brain training ───
  addForAllLocales(routes, '/brain', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.8 });
  // /brain/drills/* dropped (2026-07-02): 30 URLs at ~212 crawlable words each,
  // now noindex at page level. The /brain hub remains the indexable entry.

  // ─── Practice / tutorial ───
  // Interactive-only pages — noindexed in the AdSense thin-page sweep (2026-06-17), so
  // they are intentionally OMITTED from the sitemap (a noindexed URL in the sitemap
  // triggers GSC "Submitted URL marked noindex"). Re-add if real prose is added later.
  // docs/2026-06-17-adsense-thin-page-noindex-spec.md

  // ─── Tools ───
  addForAllLocales(routes, '/tools', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.7 });
  addForAllLocales(routes, '/tools/word-solver', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });

  // ─── Community ───
  addForAllLocales(routes, '/community', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.7 });

  // ─── Education ───
  addForAllLocales(routes, '/education', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.7 });
  // /education/access — form/redeem page, noindexed (AdSense thin-page sweep 2026-06-17),
  // so omitted from the sitemap to avoid GSC "Submitted URL marked noindex".
  addForAllLocales(routes, '/education/duels', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.65 });
  addForAllLocales(routes, '/education/classroom-game', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.65 });

  // ─── Teacher Pro pricing (the paywall's front door) ───
  // Fully SSR'd (price, features, FAQ in raw HTML) and carries Product+Offer
  // and FAQPage JSON-LD. Previously absent from the sitemap — the only revenue
  // surface had no crawl path (added 2026-07-29).
  addForAllLocales(routes, '/teacher/upgrade', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.7 });
  // Public alias people actually type. /en/pricing 404'd while the paywall
  // lived only at /teacher/upgrade — anyone hunting a price never reached checkout.
  addForAllLocales(routes, '/pricing', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.8 });

  // ─── Education SEO landings ───
  // These pages ship fully localized copy and set `robots: { index: true }` for
  // all six locales in their own generateMetadata, with self-referencing
  // hreflang. This block used to emit /en only and point he/sv/ja/es hreflang at
  // *different* pages — annotations that contradicted the page's own <link
  // rel="alternate">, so Google discarded the cluster, and 30 indexable
  // non-English URLs were in no sitemap at all. addForAllLocales emits exactly
  // what the pages declare.
  const educationLandings = [
    '/education/vocabulary-games-classroom',
    '/education/esl-word-games',
    '/education/games-for-teachers',
    '/education/spelling-bee-practice',
    '/education/sight-words-practice',
    '/education/for-schools',
    // Teacher-moment landings: each targets a specific moment in the school day
    // rather than a product feature, and each carries its own artifact (a word
    // list, a timed plan, a comparison table) so the set is not near-duplicate.
    '/education/brain-breaks-word-games',
    '/education/indoor-recess-games',
    '/education/end-of-year-classroom-activities',
    '/education/first-day-of-school-icebreakers',
    '/education/early-finishers-activities',
    '/education/middle-school-word-games',
  ];
  educationLandings.forEach((path) => {
    addForAllLocales(routes, path, {
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'weekly',
      priority: 0.85,
      images: [`${BASE_URL}/og-image-en.webp`],
    });
  });

  // ─── WordCraft marketing landing (English-only target; non-EN hreflang → the
  //     localized playable game at /word-craft) ───
  routes.push({
    url: `${BASE_URL}/en/word-craft-landing`,
    lastModified: LAST_DEPLOYED,
    changeFrequency: 'weekly',
    priority: 0.8,
    alternates: {
      languages: {
        'x-default': `${BASE_URL}/en/word-craft-landing`,
        en: `${BASE_URL}/en/word-craft-landing`,
        he: `${BASE_URL}/he/word-craft`,
        sv: `${BASE_URL}/sv/word-craft`,
        ja: `${BASE_URL}/ja/word-craft`,
        es: `${BASE_URL}/es/word-craft`,
      },
    },
    images: [`${BASE_URL}/og-image-en.webp`],
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

  // ─── Hebrew competitor-comparison landing (targets "Wordwall/Quizlet חלופה", "השוואת משחקים לכיתה") ───
  // Hebrew-only by intent; self-referencing he cluster, x-default → /en education landing.
  routes.push({
    url: `${BASE_URL}/he/lexiclash-vs-wordwall-kahoot-quizlet`,
    lastModified: LAST_DEPLOYED,
    changeFrequency: 'monthly',
    priority: 0.8,
    alternates: {
      languages: {
        'x-default': `${BASE_URL}/en/education/vocabulary-games-classroom`,
        en: `${BASE_URL}/en/education/vocabulary-games-classroom`,
        he: `${BASE_URL}/he/lexiclash-vs-wordwall-kahoot-quizlet`,
        'he-IL': `${BASE_URL}/he/lexiclash-vs-wordwall-kahoot-quizlet`,
      },
    },
    images: [`${BASE_URL}/og-image-he.webp`],
  });

  // ─── Hebrew dedicated daily-word landing (targets "המילה היומית" / מילת היום) ───
  // Hebrew-only by intent; self-referencing he cluster, x-default → /en/daily.
  routes.push({
    url: `${BASE_URL}/he/hamila-hayomit`,
    lastModified: LAST_DEPLOYED,
    changeFrequency: 'daily',
    priority: 0.9,
    alternates: {
      languages: {
        'x-default': `${BASE_URL}/en/daily`,
        he: `${BASE_URL}/he/hamila-hayomit`,
        'he-IL': `${BASE_URL}/he/hamila-hayomit`,
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

  // Per-date Word of the Day pages dropped (2026-07-02, AdSense round 2):
  // ~106 URLs rendering ~216 crawlable words each — the same thin-per-date
  // footprint the 06-04 round removed for /daily/archive/[date]. Rejected for
  // "low value content" with them indexed. The hub above keeps every word;
  // per-date pages are noindex,follow and stay fully browsable.
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
  addForLocaleOnly(routes, '/lexiclash-vs-kahoot-gimkit-vocabulary', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-blooket', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-flocabulary', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-vocabularyspellingcity', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-freerice', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });

  // ─── Russian keyword landings (Russian-only body) ───
  // robots: { index: locale === 'ru' } in each page; emit RU-only with self
  // hreflang so Google never crawls a noindexed non-RU variant.
  addForLocaleOnly(routes, '/igry-v-slova-onlayn', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.85 }, 'ru');
  addForLocaleOnly(routes, '/slovo-dnya', { lastModified: LAST_DEPLOYED, changeFrequency: 'daily', priority: 0.85 }, 'ru');
  addForLocaleOnly(routes, '/balda-onlayn', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.85 }, 'ru');
  addForLocaleOnly(routes, '/filvordy-onlayn', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.85 }, 'ru');
  addForLocaleOnly(routes, '/erudit-onlayn', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.85 }, 'ru');
  addForLocaleOnly(routes, '/sostav-slova-iz-bukv', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.85 }, 'ru');
  addForLocaleOnly(routes, '/igra-v-assotsiatsii-onlayn', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.85 }, 'ru');

  // ─── Education keyword landings (English-only body) ───
  // Same pattern as comparison pages: robots: { index: locale === 'en' }, non-EN
  // hreflang to localized education equivalents. Emit EN-only.
  // Blast landing (live mode; its /blast play route is a noindexed shell)
  addForLocaleOnly(routes, '/word-blast-game', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/vocabulary-games-for-middle-school', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.8 });
  addForLocaleOnly(routes, '/word-games-for-the-classroom', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.8 });
  addForLocaleOnly(routes, '/bell-ringer-word-games', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.8 });
  addForLocaleOnly(routes, '/substitute-teacher-word-games', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.8 });

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
    'ai-vs-word-games-language-learning',
    'spelling-bee-science-vocabulary',
    'multiplayer-strategy-guide',
    'leaderboard-elo-explained',
  ];
  // English-only articles (metaTitles has 'en' only → hasTranslation=false →
  // every non-en locale is noindexed). Advertising noindexed locale URLs in
  // the sitemap is the same negative signal as the ru case above, so these
  // ship in the sitemap for /en only.
  const EN_ONLY_BLOG = new Set([
    'multiplayer-strategy-guide',
    'leaderboard-elo-explained',
  ]);
  // Articles with a native ru translation (contentByLocale.ru + ru metaTitles →
  // hasTranslation indexes them). Every other article serves the English body
  // on /ru noindexed — advertising those in the sitemap is a pure negative
  // signal (AdSense "low value content" rejection, 2026-07-02). Add a slug here
  // when its ru translation ships.
  const RU_TRANSLATED_BLOG = new Set([
    'word-games-for-brain-training',
    'free-word-games-online',
    'vocabulary-building-strategies',
    'improve-word-game-skills',
    '10-surprising-benefits-word-games',
    'science-behind-word-games',
    'why-word-games-are-addictive',
    'word-games-and-mental-health',
    'multilingual-word-learning',
    'word-game-history',
    'word-games-for-kids-education',
    'daily-challenge-strategies',
    'multiplayer-word-games-social',
    'top-player-secrets',
  ]);
  const blogLocalesNoRu = LOCALES.filter((l) => l !== 'ru');
  blogArticles.forEach((slug) => {
    if (EN_ONLY_BLOG.has(slug)) {
      routes.push({
        url: `${BASE_URL}/en/blog/${slug}`,
        lastModified: BLOG_UPDATED,
        changeFrequency: 'monthly',
        priority: 0.85,
        alternates: {
          languages: {
            'x-default': `${BASE_URL}/en/blog/${slug}`,
            en: `${BASE_URL}/en/blog/${slug}`,
          },
        },
      });
      return;
    }
    const hasRu = RU_TRANSLATED_BLOG.has(slug);
    const alts = langAlternates(`/blog/${slug}`);
    if (!hasRu) {
      // hreflang must not point at the noindexed ru sibling.
      delete alts.ru;
      delete alts['ru-RU'];
    }
    const blogLocales = hasRu ? LOCALES : blogLocalesNoRu;
    blogLocales.forEach((locale) => {
      routes.push({
        url: `${BASE_URL}/${locale}/blog/${slug}`,
        lastModified: BLOG_UPDATED,
        changeFrequency: 'monthly',
        priority: 0.85,
        alternates: { languages: alts },
      });
    });
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
    { locale: 'en', path: '/free-multiplayer-word-game', img: 'en' },
    { locale: 'en', path: '/play-boggle-online-free', img: 'en' },
    { locale: 'en', path: '/word-games-online-free', img: 'en' },
    { locale: 'en', path: '/scrabble-alternative-online', img: 'en' },
    { locale: 'en', path: '/competitive-word-games', img: 'en' },
  ] as const;

  // Brain Training Word Games — native content in all 5 locales, register each
  addForAllLocales(routes, '/brain-training-word-games', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });
  // Download Word Game (Android) — install-intent landing, native copy in all 5 locales
  addForAllLocales(routes, '/download-word-game-android', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
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
          'en-IL': `${BASE_URL}/en/free-multiplayer-word-game`,
          'he-IL': `${BASE_URL}/he/hebrew-multiplayer-word-game`,
          'en-US': `${BASE_URL}/en/free-multiplayer-word-game`,
          'es-US': `${BASE_URL}/es/juego-de-palabras-multijugador`,
          'en-GB': `${BASE_URL}/en/free-multiplayer-word-game`,
          'en-SE': `${BASE_URL}/en/free-multiplayer-word-game`,
          'sv-SE': `${BASE_URL}/sv/swedish-multiplayer-word-game`,
          'en-JP': `${BASE_URL}/en/free-multiplayer-word-game`,
          'ja-JP': `${BASE_URL}/ja/japanese-word-game`,
          'en-ES': `${BASE_URL}/en/free-multiplayer-word-game`,
          'es-ES': `${BASE_URL}/es/juego-de-palabras-multijugador`,
          'en-MX': `${BASE_URL}/en/free-multiplayer-word-game`,
          'es-MX': `${BASE_URL}/es/juego-de-palabras-multijugador`,
          'en-AU': `${BASE_URL}/en/free-multiplayer-word-game`,
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

  // ─── Programmatic word lists RETIRED from sitemap 2026-08-09 ───
  // Was: /words/{3..8}-letter-words (6 URLs) + /words/starting-with/{letter} (21 URLs).
  //
  // WHY: AdSense rejected this domain TWICE for "low value content"
  // (docs/2026-07-18-game-portals-web-ads-application-status.md §5), which leaves the
  // WEB ad line — ~5x the native session volume — earning nothing, while the entire ad
  // business rests on an Android app with 2–7 DAU. Auto-generated word lists with no
  // original writing are the canonical trigger for that verdict, and these 27 URLs were
  // the last such family still advertised (the /anagram seeds went on 2026-06-08 and
  // /daily/archive/[date] before them).
  //
  // COST: none measurable. PostHog 60d — ZERO pageviews across all 27, out of 7,673
  // site-wide. We are not trading traffic for a monetization bet.
  //
  // The /words hub above stays listed: it is a real navigable page, not a generated list.
  // Reversible — restore this block if a reapply lands and the pages are worth having.

  // Anagram hub page (parent of programmatic /anagram/[letters] routes).
  // EN-only indexed (app/[locale]/anagram/page.tsx robots: { index: isEnglish }).
  addForLocaleOnly(routes, '/anagram', {
    lastModified: LAST_DEPLOYED,
    changeFrequency: 'monthly',
    priority: 0.7,
  });

  // ─── Anagram solver: programmatic /anagram/[letters] RETIRED from sitemap 2026-06-08 ───
  // The 150 seed pages earned 0 clicks / 0% CTR over 28d and are now noindexed
  // (app/[locale]/anagram/[letters]/page.tsx robots:{index:false}). Keeping them
  // out of the sitemap avoids inviting crawl of noindexed URLs. The /anagram hub
  // (added above) stays indexed. Reversible with the route's robots flag.

  // ─── The localized-slug landings, which had no <loc> of their own ───
  //
  // These nine pages were referenced FORTY times as hreflang alternates of other URLs and never
  // listed as URLs themselves. That includes /es/juego-de-palabras-multijugador, the single
  // biggest search asset in the portfolio (~54,000 impressions), and the whole five-language
  // cluster it belongs to. A sitemap alternate with no <url> entry of its own is an incomplete
  // declaration, and none of the nine was ever submitted for crawling — they are found only by
  // internal link.
  //
  // The clusters below mirror what each page's generateMetadata declares, which is what makes
  // them survive pruneUnconfirmedAlternates.
  const wordGameCluster: Record<string, string> = {
    en: `${BASE_URL}/en/multiplayer-word-game-online`,
    es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
    he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
    sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
    ja: `${BASE_URL}/ja/japanese-word-game`,
  };
  Object.values(wordGameCluster).forEach((url) => {
    routes.push({
      url,
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: { languages: { 'x-default': wordGameCluster.en, ...wordGameCluster } },
    });
  });

  // Single-locale landings: indexed in one language only, so the cluster self-references, the
  // same shape lib/seo/enOnlyAlternates.ts documents.
  (
    [
      ['en', 'best-online-word-games'],
      ['en', 'boggle-word-shake-free'],
      ['es', 'lexiclash-contra-wordle'],
      ['he', 'lexiclash-neged-wordle'],
    ] as const
  ).forEach(([locale, slug]) => {
    const url = `${BASE_URL}/${locale}/${slug}`;
    routes.push({
      url,
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: { languages: { 'x-default': url, [locale]: url } },
    });
  });

  return routes;
}

/**
 * Drop every hreflang alternate the target does not confirm.
 *
 * Google honours an annotation only when the page it names points BACK, and the sitemap is a
 * full-strength declaration — fixing the pages' `generateMetadata` and leaving this file alone
 * keeps the contradiction alive. 294 of the annotations emitted here were unconfirmed: the five
 * /en/education landings each claimed /he/hebrew-classroom-vocabulary-games, /sv/education and
 * /es/juegos-vocabulario-aula as their translations, and `langAlternates()` emits all five
 * locales even for paths added to the sitemap in one locale only, naming URLs that are not in
 * the sitemap at all and are noindexed besides.
 *
 * Applied once, at the single exit, rather than edited into twenty hand-written blocks: this is
 * a property of the finished route list, and a rule enforced in one place cannot drift the way
 * those blocks did. Blocks stay free to over-declare; the sanitizer is what makes it safe.
 *
 * `x-default` is deliberately left alone. Several single-locale landings point it at another
 * cluster's canonical on purpose ("Hebrew-only by intent; x-default → /en/daily"), which is a
 * handoff rather than a translation claim.
 */
function pruneUnconfirmedAlternates(routes: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  // Snapshot first: the loop below rewrites the very objects the lookup reads, so without a copy
  // the answer would depend on the order routes happen to be in.
  const declared = new Map(
    routes.map((r) => [r.url, { ...(r.alternates?.languages ?? {}) } as Record<string, string>]),
  );
  for (const route of routes) {
    const langs = route.alternates?.languages;
    if (!langs) continue;
    const kept: Record<string, string> = {};
    for (const [lang, target] of Object.entries(langs)) {
      if (lang === 'x-default' || target === route.url) {
        kept[lang] = target as string;
        continue;
      }
      const targetLangs = declared.get(target as string);
      if (targetLangs && Object.values(targetLangs).includes(route.url)) kept[lang] = target as string;
    }
    route.alternates!.languages = kept;
  }
  return routes;
}

// Single sitemap at /sitemap.xml. ~410 URLs × ~2KB hreflangs ≈ 820KB —
// well under Google's 50MB / 50k URL limit. generateSitemaps() chunks to
// /sitemap/[id].xml but does NOT auto-create an index at /sitemap.xml,
// which then collides with the [locale] catch-all and serves HTML.
export default function sitemap(): MetadataRoute.Sitemap {
  return pruneUnconfirmedAlternates(getAllRoutes());
}
