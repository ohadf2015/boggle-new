import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getWordsByLetter,
  groupByLength,
  getWordScore,
  parseLetter,
  VALID_LETTERS,
  VALID_LENGTHS,
  type Letter,
} from '../../_utils/wordListData';

export const revalidate = 86400;

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];
const BASE_URL = 'https://www.lexiclash.live';

interface PageParams {
  params: Promise<{ locale: string; letter: string }>;
}

export async function generateStaticParams() {
  const params: { locale: string; letter: string }[] = [];
  for (const locale of LOCALES) {
    for (const letter of VALID_LETTERS) {
      params.push({ locale, letter });
    }
  }
  return params;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, letter: rawLetter } = await params;
  const letter = parseLetter(rawLetter);
  if (!letter) return { title: 'Not Found' };

  const upper = letter.toUpperCase();
  const title = `Words Starting With ${upper} | LexiClash`;
  const description = `Browse all LexiClash words that start with the letter ${upper}. See words grouped by length, with base scores. Play them in a real-time word game.`;
  const url = `${BASE_URL}/${locale}/words/starting-with/${letter}`;

  return {
    title,
    description,
    openGraph: { type: 'website', url, title, description, siteName: 'LexiClash' },
    alternates: {
      canonical: url,
      languages: Object.fromEntries([
        ['x-default', `${BASE_URL}/en/words/starting-with/${letter}`],
        ...LOCALES.map(l => [l, `${BASE_URL}/${l}/words/starting-with/${letter}`]),
        ['en-IL', `${BASE_URL}/en/words/starting-with/${letter}`],
        ['he-IL', `${BASE_URL}/he/words/starting-with/${letter}`],
        ['en-US', `${BASE_URL}/en/words/starting-with/${letter}`],
        ['es-US', `${BASE_URL}/es/words/starting-with/${letter}`],
        ['en-GB', `${BASE_URL}/en/words/starting-with/${letter}`],
        ['en-SE', `${BASE_URL}/en/words/starting-with/${letter}`],
        ['sv-SE', `${BASE_URL}/sv/words/starting-with/${letter}`],
        ['en-JP', `${BASE_URL}/en/words/starting-with/${letter}`],
        ['ja-JP', `${BASE_URL}/ja/words/starting-with/${letter}`],
        ['en-ES', `${BASE_URL}/en/words/starting-with/${letter}`],
        ['es-ES', `${BASE_URL}/es/words/starting-with/${letter}`],
        ['en-MX', `${BASE_URL}/en/words/starting-with/${letter}`],
        ['es-MX', `${BASE_URL}/es/words/starting-with/${letter}`],
        ['en-AU', `${BASE_URL}/en/words/starting-with/${letter}`],
        ['es-AR', `${BASE_URL}/es/words/starting-with/${letter}`],
        ['es-CO', `${BASE_URL}/es/words/starting-with/${letter}`],
      ]),
    },
    robots: { index: true, follow: true },
  };
}

function buildSchemaJson(letter: string, locale: string, words: string[]): string {
  const upper = letter.toUpperCase();
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'LexiClash', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Words', item: `${BASE_URL}/${locale}/words` },
      { '@type': 'ListItem', position: 3, name: `Words starting with ${upper}`, item: `${BASE_URL}/${locale}/words/starting-with/${letter}` },
    ],
  };
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `LexiClash Words Starting With ${upper}`,
    description: `All words starting with ${upper} in LexiClash dictionary.`,
    numberOfItems: words.length,
    itemListElement: words.map((word, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: word.toUpperCase(),
      url: `${BASE_URL}/${locale}/words/${word}`,
    })),
  };
  return JSON.stringify([breadcrumb, itemList]);
}

export default async function StartingWithLetterPage({ params }: PageParams) {
  const { locale, letter: rawLetter } = await params;
  const letter = parseLetter(rawLetter) as Letter | null;
  if (!letter) notFound();

  const words = getWordsByLetter(letter);
  const grouped = groupByLength(words);
  const sortedLengths = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const totalWords = words.length;
  const upper = letter.toUpperCase();
  const schemaJson = buildSchemaJson(letter, locale, words);

  // Adjacent letters for navigation
  const letterIndex = VALID_LETTERS.indexOf(letter);
  const prevLetter = letterIndex > 0 ? VALID_LETTERS[letterIndex - 1] : null;
  const nextLetter = letterIndex < VALID_LETTERS.length - 1 ? VALID_LETTERS[letterIndex + 1] : null;

  return (
    <>
      {/* JSON-LD is static server data — no user input involved */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />

      <div className="min-h-screen bg-neo-navy text-neo-white">
        <div className="max-w-4xl mx-auto px-4 py-8">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-400 flex items-center gap-2">
            <Link href={`/${locale}`} className="hover:text-neo-cyan transition-colors">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${locale}/words`} className="hover:text-neo-cyan transition-colors">Words</Link>
            <span aria-hidden="true">/</span>
            <span className="text-neo-white" aria-current="page">Starting With {upper}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 bg-neo-yellow text-neo-black font-neo-display font-black text-4xl flex items-center justify-center rounded-neo border-3 border-neo-black shadow-hard">
                {upper}
              </div>
              <div>
                <h1 className="text-4xl font-neo-display font-black text-neo-yellow">
                  Words Starting With {upper}
                </h1>
              </div>
            </div>
            <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
              Browse {totalWords} LexiClash words beginning with the letter {upper},
              grouped by word length. Each word shows its base score — click to see full details.
            </p>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="bg-slate-900 border-2 border-neo-black rounded-neo px-4 py-2 shadow-hard-sm flex items-center gap-2">
              <span className="text-neo-cyan font-bold text-lg">{totalWords}</span>
              <span className="text-slate-400 text-sm">total words</span>
            </div>
            <div className="bg-slate-900 border-2 border-neo-black rounded-neo px-4 py-2 shadow-hard-sm flex items-center gap-2">
              <span className="text-neo-yellow font-bold text-lg">{sortedLengths.length}</span>
              <span className="text-slate-400 text-sm">length groups</span>
            </div>
          </div>

          {/* Letter navigation */}
          <div className="flex items-center gap-3 mb-8">
            {prevLetter ? (
              <Link
                href={`/${locale}/words/starting-with/${prevLetter}`}
                className="bg-slate-800 border border-slate-700 rounded-neo px-3 py-2 text-sm font-bold hover:border-neo-cyan transition-colors"
              >
                ← {prevLetter.toUpperCase()}
              </Link>
            ) : (
              <span className="bg-slate-800/40 border border-slate-800 rounded-neo px-3 py-2 text-sm font-bold text-slate-600 cursor-not-allowed">
                ←
              </span>
            )}
            <span className="text-slate-400 text-sm flex-1 text-center">
              Words starting with {upper}
            </span>
            {nextLetter ? (
              <Link
                href={`/${locale}/words/starting-with/${nextLetter}`}
                className="bg-slate-800 border border-slate-700 rounded-neo px-3 py-2 text-sm font-bold hover:border-neo-cyan transition-colors"
              >
                {nextLetter.toUpperCase()} →
              </Link>
            ) : (
              <span className="bg-slate-800/40 border border-slate-800 rounded-neo px-3 py-2 text-sm font-bold text-slate-600 cursor-not-allowed">
                →
              </span>
            )}
          </div>

          {/* CTA */}
          <div className="bg-slate-900 border-neo border-neo-black rounded-neo p-4 shadow-hard mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-neo-white mb-1">How many {upper}- words can you find?</p>
              <p className="text-slate-400 text-sm">
                Spot them fast on the grid and rack up combo bonuses!
              </p>
            </div>
            <Link
              href={`/${locale}/singleplayer`}
              className="shrink-0 bg-neo-yellow text-neo-black font-neo-display font-black px-5 py-2.5 rounded-neo border-3 border-neo-black shadow-hard-sm hover:shadow-hard-pressed active:translate-y-0.5 transition-all"
            >
              Play Now →
            </Link>
          </div>

          {/* Words by length */}
          <div className="space-y-8">
            {sortedLengths.map(len => (
              <section key={len}>
                <div className="flex items-center gap-3 mb-3 border-b-2 border-slate-700 pb-2">
                  <h2 className="text-2xl font-neo-display font-black text-neo-cyan">
                    {len}-Letter Words
                  </h2>
                  <Link
                    href={`/${locale}/words/${len}-letter-words`}
                    className="text-xs text-slate-500 hover:text-neo-cyan transition-colors"
                  >
                    see all {len}-letter words →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {(grouped[len] ?? []).map(word => (
                    <Link
                      key={word}
                      href={`/${locale}/words/${word}`}
                      className="group flex items-center justify-between bg-slate-900 border border-slate-700 hover:border-neo-cyan rounded-neo px-3 py-2 transition-colors"
                    >
                      <span className="font-bold text-sm text-neo-white group-hover:text-neo-yellow transition-colors uppercase tracking-wide">
                        {word}
                      </span>
                      <span className="text-xs font-bold text-neo-cyan bg-slate-800 rounded px-1.5 py-0.5 ms-1 shrink-0">
                        {getWordScore(word)}pt
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* All letters grid */}
          <div className="mt-12 pt-8 border-t-2 border-slate-700">
            <h2 className="text-sm font-bold text-neo-cyan uppercase tracking-wider mb-4">Browse All Letters</h2>
            <div className="flex flex-wrap gap-1.5">
              {VALID_LETTERS.map((l: string) => (
                <Link
                  key={l}
                  href={`/${locale}/words/starting-with/${l}`}
                  className={`w-8 h-8 flex items-center justify-center rounded-neo text-sm font-bold uppercase transition-colors border ${
                    l === letter
                      ? 'bg-neo-yellow text-neo-black border-neo-black'
                      : 'bg-slate-800 border-slate-700 hover:border-neo-cyan hover:text-neo-yellow'
                  }`}
                  aria-current={l === letter ? 'page' : undefined}
                >
                  {l}
                </Link>
              ))}
            </div>
          </div>

          {/* Related lengths */}
          <div className="mt-6">
            <h2 className="text-sm font-bold text-neo-cyan uppercase tracking-wider mb-4">Browse by Word Length</h2>
            <div className="flex flex-wrap gap-2">
              {VALID_LENGTHS.map(l => (
                <Link
                  key={l}
                  href={`/${locale}/words/${l}-letter-words`}
                  className="text-sm bg-slate-800 border border-slate-700 rounded-neo px-3 py-1.5 hover:border-neo-cyan transition-colors"
                >
                  {l}-letter words
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
