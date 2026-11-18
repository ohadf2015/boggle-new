import type { Metadata } from 'next';

type BodyLocale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

/**
 * Locales each page has a real body in. A page absent from this map is written
 * in every locale. Translating a page? Add the locale here.
 */
export const BODY_LOCALES: Record<string, readonly BodyLocale[]> = {
  '/about/ohad-fisher': ['en'],
  '/community': ['en', 'he', 'sv', 'ja', 'es'],
  '/editorial-policy': ['en'],
  '/education/sight-words-practice': ['en'],
  '/glossary': ['en', 'he'],
  '/guides': ['en', 'he', 'sv', 'ja', 'es'],
  '/guides/blast-strategy': ['en', 'he', 'sv', 'ja', 'es'],
  '/guides/classic-strategy': ['en', 'he', 'sv', 'ja', 'es'],
  '/guides/word-hunt-strategy': ['en', 'he', 'sv', 'ja', 'es'],
  '/how-to-play': ['en', 'he', 'sv', 'ja', 'es'],
  '/leaderboard': ['en', 'he', 'sv', 'ja', 'es'],
  '/rules': ['en', 'he', 'sv', 'ja', 'es'],
  '/words': ['en'],
  '/blog/10-surprising-benefits-word-games': ['en', 'he', 'sv', 'ja', 'es', 'ru'],
  '/blog/ai-vs-word-games-language-learning': ['en', 'he', 'sv', 'ja', 'es'],
  '/blog/alternativas-a-scrabble': ['es'],
  '/blog/best-boggle-alternatives-2026': ['en', 'he', 'sv', 'ja'],
  '/blog/boggle-vs-scrabble': ['en', 'he', 'sv', 'ja', 'es'],
  '/blog/boggle-vs-wordle': ['en', 'he', 'sv', 'ja', 'es'],
  '/blog/boggle-vs-words-with-friends': ['en', 'he', 'sv', 'ja', 'es'],
  '/blog/daily-challenge-strategies': ['en', 'he', 'sv', 'ja', 'es', 'ru'],
  '/blog/death-of-turn-based-word-games': ['en', 'he', 'sv', 'ja', 'es'],
  '/blog/free-word-games-online': ['en', 'ru'],
  '/blog/hebrew-word-games-guide': ['en', 'he', 'sv', 'ja', 'es'],
  '/blog/improve-word-game-skills': ['en', 'he', 'sv', 'ja', 'es', 'ru'],
  '/blog/juegos-palabras-gratis': ['es'],
  '/blog/leaderboard-elo-explained': ['en'],
  '/blog/milat-hayom-habit': ['he'],
  '/blog/mishachke-milim-chinuch': ['he'],
  '/blog/most-popular-word-games-2026': ['en', 'he', 'sv', 'ja', 'es'],
  '/blog/multilingual-word-learning': ['en', 'he', 'sv', 'ja', 'es', 'ru'],
  '/blog/multiplayer-strategy-guide': ['en'],
  '/blog/multiplayer-word-games-social': ['en', 'he', 'sv', 'ja', 'es', 'ru'],
  '/blog/netflix-word-game-2026-rise': ['en', 'he', 'sv', 'ja', 'es'],
  '/blog/ordspel-familjer': ['sv'],
  '/blog/science-behind-word-games': ['en', 'he', 'sv', 'ja', 'es', 'ru'],
  '/blog/spelling-bee-science-vocabulary': ['en', 'he', 'sv', 'ja', 'es'],
  '/blog/top-player-secrets': ['en', 'he', 'sv', 'ja', 'es', 'ru'],
  '/blog/vocabulary-building-strategies': ['en', 'he', 'sv', 'ja', 'es', 'ru'],
  '/blog/why-word-games-are-addictive': ['en', 'he', 'sv', 'ja', 'ru'],
  '/blog/word-game-history': ['en', 'he', 'sv', 'ja', 'es', 'ru'],
  '/blog/word-games-and-mental-health': ['en', 'he', 'sv', 'ja', 'es', 'ru'],
  '/blog/word-games-for-brain-training': ['en', 'he', 'sv', 'ja', 'ru'],
  '/blog/word-games-for-kids-education': ['en', 'he', 'sv', 'ja', 'es', 'ru'],
};

const urlLocale = (url: string) => url.match(/^https?:\/\/[^/]+\/([a-z]{2})(?:\/|$)/)?.[1];

export function hasBodyInLocale(path: string, locale: string): boolean {
  const locales = BODY_LOCALES[path];
  return !locales || locales.includes(locale as BodyLocale);
}

/** Keeps hreflang on locales with a real body; any other copy is noindexed and canonicalised to one that has it. */
export function withBodyLocales(meta: Metadata, path: string, locale: string): Metadata {
  const locales = BODY_LOCALES[path];
  if (!locales) return meta;
  const home = locales.includes('en') ? 'en' : locales[0];
  const base = 'https://www.lexiclash.live';
  const languages = Object.fromEntries(
    Object.entries(meta.alternates?.languages ?? {}).filter(
      ([code, url]) => code !== 'x-default' && locales.includes(urlLocale(String(url)) as BodyLocale),
    ),
  );
  const homeUrl = `${base}/${home}${path}`;
  const hasBody = hasBodyInLocale(path, locale);
  languages[home] = homeUrl;
  if (hasBody) languages[locale] = `${base}/${locale}${path}`;
  languages['x-default'] = homeUrl;
  return {
    ...meta,
    alternates: { ...meta.alternates, canonical: hasBody ? `${base}/${locale}${path}` : homeUrl, languages },
    robots: hasBody ? meta.robots : { index: false, follow: true },
  };
}
