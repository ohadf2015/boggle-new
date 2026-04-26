import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

export const dynamic = 'force-dynamic';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];
const BASE_URL = 'https://www.lexiclash.live';

export const revalidate = 86400;

interface PageParams {
  params: Promise<{ locale: string }>;
}

const POPULAR_SEEDS = [
  'listen', 'stared', 'heart', 'stone', 'rates', 'learn', 'smart', 'great',
  'earth', 'words', 'friend', 'master', 'planet', 'action', 'dragon',
];

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en/anagram`;

  return {
    title: 'Free Anagram Solver — Find Every Word From Any Letters | LexiClash',
    description:
      'Free online anagram solver. Enter any letters and instantly see every valid English word you can make. Perfect for Scrabble, Boggle, Words With Friends, and crossword help.',
    openGraph: {
      type: 'website',
      url: pageUrl,
      title: 'Free Anagram Solver — Find Every Word From Any Letters',
      description:
        'Enter any letters and find every word you can make. Free, instant, no signup. Built into LexiClash, the multiplayer word game with 30+ modes.',
      siteName: 'LexiClash',
    },
    alternates: {
      canonical: pageUrl,
      languages: Object.fromEntries([
        ['x-default', `${BASE_URL}/en/anagram`],
        ...LOCALES.map((l) => [l, `${BASE_URL}/${l}/anagram`]),
      ]),
    },
    robots: { index: isEnglish, follow: true },
  };
}

export default async function AnagramHubPage({ params }: PageParams) {
  const { locale } = await params;

  return (
    <div className="min-h-screen bg-neo-navy text-neo-white">
      <BreadcrumbJsonLd
        items={[
          { name: 'LexiClash', url: `${BASE_URL}/${locale}` },
          { name: 'Anagram Solver', url: `${BASE_URL}/en/anagram` },
        ]}
      />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="mb-6 text-sm text-slate-400">
          <Link href={`/${locale}`} className="hover:text-neo-cyan transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-neo-white">Anagram Solver</span>
        </nav>

        <h1 className="text-4xl font-neo-display font-black text-neo-pink tracking-wider mb-4">
          Anagram Solver
        </h1>
        <p className="text-slate-300 text-lg mb-8 leading-relaxed">
          Enter any letters in the URL and instantly see every valid English word you can make.
          Free, no signup, no download. Powered by the same dictionary that runs the LexiClash
          multiplayer word game.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-neo-display font-bold text-neo-cyan uppercase tracking-wider mb-4">
            Popular Anagram Lookups
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Tap any seed to see every word you can make from those letters.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {POPULAR_SEEDS.map((letters) => (
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

        <section className="mb-10">
          <h2 className="text-xl font-neo-display font-bold text-neo-cyan uppercase tracking-wider mb-4">
            How It Works
          </h2>
          <ol className="text-slate-300 space-y-2 list-decimal list-inside">
            <li>Visit <code className="text-neo-lime">/anagram/yourletters</code> — replace yourletters with 2-10 a-z characters.</li>
            <li>Every valid word that fits within your letter pool appears, grouped by length.</li>
            <li>Tap any word to see its score and definition page.</li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-neo-display font-bold text-neo-cyan uppercase tracking-wider mb-4">
            Related Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href={`/${locale}/tools/word-solver`}
              className="bg-slate-900 border-2 border-neo-black rounded-neo p-4 shadow-hard hover:border-neo-cyan transition-all"
            >
              <div className="font-neo-display font-bold text-neo-white">Word Solver</div>
              <div className="text-xs text-slate-400 mt-1">Interactive UI version</div>
            </Link>
            <Link
              href={`/${locale}/words`}
              className="bg-slate-900 border-2 border-neo-black rounded-neo p-4 shadow-hard hover:border-neo-cyan transition-all"
            >
              <div className="font-neo-display font-bold text-neo-white">Words Dictionary</div>
              <div className="text-xs text-slate-400 mt-1">Browse by length or letter</div>
            </Link>
            <Link
              href={`/${locale}/multiplayer`}
              className="bg-slate-900 border-2 border-neo-black rounded-neo p-4 shadow-hard hover:border-neo-lime transition-all"
            >
              <div className="font-neo-display font-bold text-neo-white">Play LexiClash</div>
              <div className="text-xs text-slate-400 mt-1">Real-time word game</div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
