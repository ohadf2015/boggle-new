import type { MetadataRoute } from 'next';
import { hasBodyInLocale } from '@/lib/seo/bodyLocales';
import { hreflangAlternates } from '@/lib/seo/hreflang';
import { EDUCATION_PAGES } from '@/lib/seo/educationPageLinks';
import { WORD_LISTS_GENERATED_AT } from '@/lib/seo/wordLists/catalog';
import { wordListSitemapRoutes } from '@/lib/seo/wordLists/sitemapRoutes';
import { isAppScreenUrl } from '@/lib/seo/appScreens';
import { blogPostLocales, getAllBlogEntries } from '@/lib/blog/posts';
import buildInfo from '@/lib/seo/buildInfo.generated.json';
import { HOLIDAY_LANDINGS, landingAlternates, landingUrl } from '@/lib/holidays/landing';

const BASE_URL = 'https://www.lexiclash.live';
const LOCALES = ['he', 'en', 'sv', 'ja', 'es', 'ru'] as const;

// Use stable dates instead of new Date() to avoid telling Google every page changed on every request.
// NOTE: process.env.NEXT_PUBLIC_BUILD_TIME is inlined by next.config.mjs `env` for route
// handlers (api/version proves it), but that inlining does NOT reach this metadata route in
// the production standalone build — prod sitemap.xml served the hardcoded fallback below for
// 434 URLs for months (verified 2026-10-14). The committed, prebuild-regenerated
// buildInfo.generated.json is the channel that provably reaches prod (same pattern as
// wordLists.generated.json), so it wins over the env var here.
const LAST_DEPLOYED =
  (buildInfo as { builtAt?: string }).builtAt ||
  process.env.NEXT_PUBLIC_BUILD_TIME ||
  '2026-03-26T00:00:00.000Z';
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
    `${BASE_URL}/og-image-he.webp?v=2`,
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
  // /multiplayer and /singleplayer are noindexed game shells with no visible copy.
  // /blast, /word-craft, /daily/word-hunt, /daily/word-wheel are near-empty
  // game shells (30-282 crawlable words, measured live 2026-07-02) — noindexed
  // at page level after the AdSense "low value content" rejection. Search
  // intent is covered by /word-craft-game, /daily-word-wheel and /guides/*.
  addForLocaleOnly(routes, '/word-craft-game', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.8 });
  // Play screens in APP_SCREEN_PATHS (daily, adventure, word tower, connections,
  // leaderboard, community, teacher upgrade) are noindexed and never listed.

  // Per-date archive child pages are intentionally NOT listed here.
  // They are thin per-puzzle stat/leaderboard snapshots and were dragging the
  // domain's content-quality average below AdSense's bar (~780 URLs across 5
  // locales). They are now noindex,follow at the page level and stay fully
  // playable — we just don't advertise them. The /daily/archive hub (above)
  // remains the canonical entry point. See docs/2026-06-04-adsense-approval-plan.md.

  // /brain and /brain/drills/* are noindexed game shells; brain-training searches land on /brain-training-word-games.

  // ─── Practice / tutorial ───
  // Interactive-only pages — noindexed in the AdSense thin-page sweep (2026-06-17), so
  // they are intentionally OMITTED from the sitemap (a noindexed URL in the sitemap
  // triggers GSC "Submitted URL marked noindex"). Re-add if real prose is added later.
  // docs/2026-06-17-adsense-thin-page-noindex-spec.md

  // ─── Tools ───
  addForAllLocales(routes, '/tools/word-solver', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.9 });

  // ─── Education ───
  addForAllLocales(routes, '/education', { lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.7 });
  // /education/access — form/redeem page, noindexed (AdSense thin-page sweep 2026-06-17),
  // so omitted from the sitemap to avoid GSC "Submitted URL marked noindex".

  // ─── Teacher Pro pricing ───
  // Public alias people actually type. /en/pricing 404'd while the paywall
  // lived only at /teacher/upgrade — anyone hunting a price never reached checkout.
  addForAllLocales(routes, '/pricing', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.8 });

  // ─── Education SEO landings ───
  // Single source of truth: EDUCATION_PAGES in lib/seo/educationPageLinks.ts
  // (same registry as the footer, /education hub, and llms.txt). Restating the
  // 17 slugs here is how a new landing would ship linked internally but absent
  // from /sitemap.xml. addForAllLocales emits all six locales because these
  // pages set robots: { index: true } + self-referencing hreflang in
  // generateMetadata. Priority stays 0.85 (teacher-intent; do not demote).
  EDUCATION_PAGES.filter((page) => page.slug !== 'lists').forEach((page) => {
    addForAllLocales(routes, `/education/${page.slug}`, {
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'weekly',
      priority: 0.85,
      images: [`${BASE_URL}/og-image-en.webp`],
    });
  });

  // ─── Public word lists: empty while every tier in indexPolicy is off ───
  routes.push(...wordListSitemapRoutes(WORD_LISTS_GENERATED_AT));

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
    images: [`${BASE_URL}/og-image-he.webp?v=2`],
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
    images: [`${BASE_URL}/og-image-he.webp?v=2`],
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
    images: [`${BASE_URL}/og-image-he.webp?v=2`],
  });

  routes.push({
    url: `${BASE_URL}/he/mischaqey-safa-imun-kogniti`,
    lastModified: LAST_DEPLOYED,
    changeFrequency: 'monthly',
    priority: 0.7,
    alternates: {
      languages: {
        'x-default': `${BASE_URL}/en/brain-training-word-games`,
        he: `${BASE_URL}/he/mischaqey-safa-imun-kogniti`,
        'he-IL': `${BASE_URL}/he/mischaqey-safa-imun-kogniti`,
      },
    },
    images: [`${BASE_URL}/og-image-he.webp?v=2`],
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
    images: [`${BASE_URL}/og-image-es.webp?v=2`],
  });

  // ─── Content pages ───
  addForAllLocales(routes, '/how-to-play', { lastModified: GUIDES_UPDATED, changeFrequency: 'weekly', priority: 0.9 });
  addForAllLocales(routes, '/rules', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.7 });

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
  addForLocaleOnly(routes, '/lexiclash-join', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.8 });
  addForLocaleOnly(routes, '/lexiclash-vs-mentimeter', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-wayground', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-wooclap', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-socrative', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-classpoint', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-peardeck', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-padlet', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
  addForLocaleOnly(routes, '/lexiclash-vs-nearpod', { lastModified: LAST_DEPLOYED, changeFrequency: 'monthly', priority: 0.85 });
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

  // Holiday landings: evergreen, one native slug per language, hreflang across the same holiday.
  for (const p of HOLIDAY_LANDINGS) {
    routes.push({ url: landingUrl(p), lastModified: LAST_DEPLOYED, changeFrequency: 'weekly', priority: 0.85, alternates: { languages: landingAlternates(p) } });
  }

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
  // Posts, dates, hero images and locales come from lib/blog/posts — the same list the article
  // JSON-LD, /news-sitemap.xml and the RSS feeds read. Locales follow BODY_LOCALES, so an
  // English-only or not-yet-translated (e.g. ru) article never advertises a noindexed sibling.
  const blogEntries = getAllBlogEntries();
  const newestBlogEdit = blogEntries.map((e) => e.dateModified).sort().pop() ?? LAST_DEPLOYED;
  addForAllLocales(routes, '/blog', { lastModified: newestBlogEdit, changeFrequency: 'weekly', priority: 0.9 });
  for (const entry of blogEntries) {
    const path = `/blog/${entry.slug}`;
    const locales = blogPostLocales(entry.slug);
    const urls = new Set(locales.map((l) => `${BASE_URL}/${l}${path}`));
    const languages = Object.fromEntries(
      Object.entries(langAlternates(path)).filter(([code, url]) => code !== 'x-default' && urls.has(url)),
    );
    languages['x-default'] = `${BASE_URL}/${locales.includes('en') ? 'en' : locales[0]}${path}`;
    routes.push({
      url: entry.url,
      lastModified: entry.dateModified,
      changeFrequency: 'monthly',
      priority: 0.85,
      alternates: { languages },
      images: entry.images,
    });
  }

  // ─── Info pages ───
  addForAllLocales(routes, '/faq', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.8 });
  // English-only body (lib/seo/englishOnlyBodyPages): only /en is indexable.
  addForLocaleOnly(routes, '/about', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.6 });
  addForAllLocales(routes, '/contact', { lastModified: GUIDES_UPDATED, changeFrequency: 'monthly', priority: 0.5 });
  // /profile is noindexed — excluded from sitemap to avoid wasting crawl budget
  addForAllLocales(routes, '/accessibility', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.4 });

  // ─── Legal pages ───
  addForAllLocales(routes, '/legal', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.4 });
  addForAllLocales(routes, '/legal/privacy', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.3 });
  // English-only body (lib/seo/englishOnlyBodyPages): only /en is indexable.
  addForLocaleOnly(routes, '/legal/terms', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.3 });
  addForLocaleOnly(routes, '/legal/disclaimer', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.3 });
  addForLocaleOnly(routes, '/legal/cookies', { lastModified: LEGAL_UPDATED, changeFrequency: 'monthly', priority: 0.3 });

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

  // Anagram hub: EN + SV indexed (Growth Radar rec 6487 `anagram svenska`).
  // Other locales stay noindex in page.tsx and must not appear here.
  addForLocaleOnly(routes, '/anagram', {
    lastModified: LAST_DEPLOYED,
    changeFrequency: 'monthly',
    priority: 0.7,
  });
  addForLocaleOnly(routes, '/anagram', {
    lastModified: LAST_DEPLOYED,
    changeFrequency: 'monthly',
    priority: 0.7,
  }, 'sv');

  // Word finder (Growth Radar rec 15849): English-only body, other locales noindex.
  addForLocaleOnly(routes, '/word-finder', {
    lastModified: LAST_DEPLOYED,
    changeFrequency: 'monthly',
    priority: 0.8,
  });

  addForLocaleOnly(routes, '/wordle-solver', {
    lastModified: LAST_DEPLOYED,
    changeFrequency: 'monthly',
    priority: 0.8,
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
  //
  // /en/multiplayer-word-game-online 308-redirects to /en/free-multiplayer-word-game
  // (next.config.mjs slug consolidation), so it must not be a <loc> or an alternate target:
  // a sitemap URL that redirects is a wasted crawl and an hreflang Google discards. The cluster's
  // English member is the canonical showcase, which already has its own entry above, so only the
  // four localized slugs are pushed here.
  const wordGameCluster: Record<string, string> = {
    en: `${BASE_URL}/en/free-multiplayer-word-game`,
    es: `${BASE_URL}/es/juego-de-palabras-multijugador`,
    he: `${BASE_URL}/he/hebrew-multiplayer-word-game`,
    sv: `${BASE_URL}/sv/swedish-multiplayer-word-game`,
    ja: `${BASE_URL}/ja/japanese-word-game`,
  };
  Object.entries(wordGameCluster).forEach(([locale, url]) => {
    if (locale === 'en') return;
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
      ['en', 'play-boggle-5x5-online'],
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

  // Arabic has no locale yet: an Arabic waitlist page and its English twin live under /en.
  const arWaitlist = {
    ar: `${BASE_URL}/en/laabat-kalimat-arabiya`,
    en: `${BASE_URL}/en/arabic-word-game`,
  };
  for (const url of [arWaitlist.ar, arWaitlist.en]) {
    routes.push({
      url,
      lastModified: LAST_DEPLOYED,
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: { languages: { ...arWaitlist, 'x-default': arWaitlist.en } },
    });
  }

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

function hasBody(url: string): boolean {
  const [locale, ...rest] = url.replace(`${BASE_URL}/`, '').split('/');
  return hasBodyInLocale(rest.length ? `/${rest.join('/')}` : '', locale);
}

function keepPagesWithBody(routes: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const kept = routes.filter((route) => hasBody(route.url));
  for (const route of kept) {
    const langs = route.alternates?.languages as Record<string, string> | undefined;
    if (langs?.['x-default'] && !hasBody(langs['x-default'])) langs['x-default'] = route.url;
  }
  return kept;
}

// Single sitemap at /sitemap.xml. ~410 URLs × ~2KB hreflangs ≈ 820KB —
// well under Google's 50MB / 50k URL limit. generateSitemaps() chunks to
// /sitemap/[id].xml but does NOT auto-create an index at /sitemap.xml,
// which then collides with the [locale] catch-all and serves HTML.
export default function sitemap(): MetadataRoute.Sitemap {
  return pruneUnconfirmedAlternates(keepPagesWithBody(getAllRoutes()).filter((r) => !isAppScreenUrl(r.url)));
}
