import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import { InlineBannerAd } from '@/components/ads';
import { EsScrabbleCrossLink } from '@/components/seo/EsScrabbleCrossLink';
import { SvScrabbleCrossLink } from '@/components/seo/SvScrabbleCrossLink';
import { HeScrabbleCrossLink } from '@/components/seo/HeScrabbleCrossLink';

export const dynamic = 'force-dynamic';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];
const BASE_URL = 'https://www.lexiclash.live';

export const revalidate = 86400;

interface PageParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const title = 'LexiClash Word Dictionary — Browse Words by Length & Letter';
  const description =
    'Explore the full LexiClash word dictionary. Browse valid words by length (3–8 letters) or starting letter (A–Z). Find high-scoring words, learn new vocabulary, and sharpen your word game skills.';

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      url: `${BASE_URL}/${locale}/words`,
      title,
      description,
      siteName: 'LexiClash',
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}/words`,
      languages: Object.fromEntries([
        ['x-default', `${BASE_URL}/en/words`],
        ...LOCALES.map(l => [l, `${BASE_URL}/${l}/words`]),
        ['en-IL', `${BASE_URL}/en/words`],
        ['he-IL', `${BASE_URL}/he/words`],
        ['en-US', `${BASE_URL}/en/words`],
        ['es-US', `${BASE_URL}/es/words`],
        ['en-GB', `${BASE_URL}/en/words`],
        ['en-SE', `${BASE_URL}/en/words`],
        ['sv-SE', `${BASE_URL}/sv/words`],
        ['en-JP', `${BASE_URL}/en/words`],
        ['ja-JP', `${BASE_URL}/ja/words`],
        ['en-ES', `${BASE_URL}/en/words`],
        ['es-ES', `${BASE_URL}/es/words`],
        ['en-MX', `${BASE_URL}/en/words`],
        ['es-MX', `${BASE_URL}/es/words`],
        ['en-AU', `${BASE_URL}/en/words`],
        ['es-AR', `${BASE_URL}/es/words`],
        ['es-CO', `${BASE_URL}/es/words`],
      ]),
    },
    robots: { index: true, follow: true },
  };
}

const WORD_LENGTHS = [3, 4, 5, 6, 7, 8] as const;
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

export default async function WordsHubPage({ params }: PageParams) {
  const { locale } = await params;

  return (
    <div className="min-h-screen bg-neo-navy text-neo-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-slate-400">
          <Link href={`/${locale}`} className="hover:text-neo-cyan transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-neo-white">Words</span>
        </nav>

        {/* Hero */}
        <h1 className="text-4xl font-neo-display font-black text-neo-yellow tracking-wider mb-4">
          LexiClash Word Dictionary
        </h1>

        <div className="text-slate-300 text-base leading-relaxed mb-8 space-y-4">
          <p>
            Welcome to the LexiClash word dictionary, your go-to resource for finding valid words
            across every game mode. Whether you are warming up for a Daily Challenge, hunting for
            high-scoring plays in Blast Mode, or preparing for a multiplayer showdown, this hub gives
            you quick access to every word in our curated dictionary.
          </p>
          <p>
            Our dictionary is built from multiple trusted word lists and is continuously refined. Every
            word you see here is valid in LexiClash games, so you can study with confidence. Words are
            scored based on length: longer words earn exponentially more points, and chaining them into
            combos multiplies your score even further. A solid vocabulary is the single biggest
            advantage you can bring to any match.
          </p>
          <p>
            Browse by word length to focus on a specific tier of difficulty, or explore words by their
            starting letter to build familiarity with common openings. Many top players drill one
            letter group per day, cycling through the alphabet over a month. Pair this habit with the
            Daily Challenge and you will see measurable improvement within weeks.
          </p>
          <p>
            Each word page shows base points, combo scoring tiers, letter breakdowns, and links to
            related words. Use these pages as flashcards: open a random word, try to recall its score,
            then check. Over time this builds intuition for spotting valuable words on the grid
            instantly instead of calculating during precious game seconds.
          </p>
        </div>

        {/* Words by Length */}
        <section className="mb-10">
          <h2 className="text-xl font-neo-display font-bold text-neo-cyan uppercase tracking-wider mb-4">
            Browse by Word Length
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {WORD_LENGTHS.map(n => (
              <Link
                key={n}
                href={`/${locale}/words/${n}-letter-words`}
                className="bg-slate-900 border-3 border-neo-black rounded-neo p-4 shadow-hard-sm hover:shadow-hard hover:border-neo-cyan transition-all text-center group"
              >
                <span className="text-2xl font-neo-display font-black text-neo-yellow group-hover:text-neo-white transition-colors">
                  {n}
                </span>
                <span className="block text-sm text-slate-400 mt-1">letter words</span>
              </Link>
            ))}
          </div>
        </section>

        <InlineBannerAd webZone="content-page" className="my-6" />

        <EsScrabbleCrossLink locale={locale} anchorVariant="words" />
        <SvScrabbleCrossLink locale={locale} anchorVariant="words" />
        <HeScrabbleCrossLink locale={locale} anchorVariant="words" />

        {/* Words by Starting Letter */}
        <section className="mb-10">
          <h2 className="text-xl font-neo-display font-bold text-neo-cyan uppercase tracking-wider mb-4">
            Browse by Starting Letter
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {ALPHABET.map(letter => (
              <Link
                key={letter}
                href={`/${locale}/words/starting-with/${letter}`}
                className="bg-slate-900 border-2 border-neo-black rounded-neo p-3 shadow-hard-sm hover:shadow-hard hover:border-neo-yellow transition-all text-center"
              >
                <span className="text-lg font-neo-display font-black text-neo-white">
                  {letter.toUpperCase()}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular Anagram Lookups */}
        <section className="mb-10">
          <h2 className="text-xl font-neo-display font-bold text-neo-pink uppercase tracking-wider mb-4">
            Popular Anagram Lookups
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Find every word you can form from these letters — instant results, no signup.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {['listen', 'stared', 'heart', 'stone', 'rates', 'learn', 'smart', 'great', 'earth', 'words'].map((letters) => (
              <Link
                key={letters}
                href={`/${locale}/anagram/${letters}`}
                className="bg-slate-900 border-2 border-neo-black rounded-neo px-3 py-2 shadow-hard-sm hover:shadow-hard hover:border-neo-pink transition-all text-center"
              >
                <span className="text-sm font-neo-display font-bold text-neo-white uppercase">
                  {letters}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center mt-8">
          <Link
            href={`/${locale}/tools/word-solver`}
            className="inline-block bg-neo-yellow text-neo-black font-neo-display font-black px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard hover:shadow-hard-pressed active:translate-y-0.5 transition-all"
          >
            Open Word Solver
          </Link>
          <p className="text-slate-500 text-xs mt-2">
            Search for any word and check if it scores in LexiClash
          </p>
        </div>
      </div>
    </div>
  );
}
