import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getWordsByLength,
  groupByFirstLetter,
  getWordScore,
  parseWordLength,
  VALID_LENGTHS,
  type WordLength,
} from '../_utils/wordListData';

export const revalidate = 86400;

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];
const BASE_URL = 'https://www.lexiclash.live';

interface PageParams {
  params: Promise<{ locale: string; n: string }>;
}

export async function generateStaticParams() {
  const params: { locale: string; n: string }[] = [];
  for (const locale of LOCALES) {
    for (const n of VALID_LENGTHS) {
      params.push({ locale, n: String(n) });
    }
  }
  return params;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, n: rawN } = await params;
  const n = parseWordLength(rawN);
  if (!n) return { title: 'Not Found' };

  const title = `All ${n}-Letter Words | LexiClash Word Game`;
  const description = `Browse all ${n}-letter words in the LexiClash dictionary. See every valid ${n}-letter word with its score and play it in a real-time word game.`;
  const url = `${BASE_URL}/${locale}/words/${n}-letter-words`;

  return {
    title,
    description,
    openGraph: { type: 'website', url, title, description, siteName: 'LexiClash' },
    alternates: {
      canonical: url,
      languages: Object.fromEntries([
        ['x-default', `${BASE_URL}/en/words/${n}-letter-words`],
        ...LOCALES.map(l => [l, `${BASE_URL}/${l}/words/${n}-letter-words`]),
        ['en-IL', `${BASE_URL}/en/words/${n}-letter-words`],
        ['he-IL', `${BASE_URL}/he/words/${n}-letter-words`],
        ['en-US', `${BASE_URL}/en/words/${n}-letter-words`],
        ['es-US', `${BASE_URL}/es/words/${n}-letter-words`],
        ['en-GB', `${BASE_URL}/en/words/${n}-letter-words`],
        ['en-SE', `${BASE_URL}/en/words/${n}-letter-words`],
        ['sv-SE', `${BASE_URL}/sv/words/${n}-letter-words`],
        ['en-JP', `${BASE_URL}/en/words/${n}-letter-words`],
        ['ja-JP', `${BASE_URL}/ja/words/${n}-letter-words`],
        ['en-ES', `${BASE_URL}/en/words/${n}-letter-words`],
        ['es-ES', `${BASE_URL}/es/words/${n}-letter-words`],
        ['en-MX', `${BASE_URL}/en/words/${n}-letter-words`],
        ['es-MX', `${BASE_URL}/es/words/${n}-letter-words`],
        ['en-AU', `${BASE_URL}/en/words/${n}-letter-words`],
        ['es-AR', `${BASE_URL}/es/words/${n}-letter-words`],
        ['es-CO', `${BASE_URL}/es/words/${n}-letter-words`],
      ]),
    },
    robots: { index: true, follow: true },
  };
}

function buildSchemaJson(n: number, locale: string, words: string[]): string {
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'LexiClash', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Words', item: `${BASE_URL}/${locale}/words` },
      { '@type': 'ListItem', position: 3, name: `${n}-Letter Words`, item: `${BASE_URL}/${locale}/words/${n}-letter-words` },
    ],
  };
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `All ${n}-Letter Words in LexiClash`,
    description: `Complete list of ${n}-letter words playable in LexiClash word game.`,
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

export default async function NLetterWordsPage({ params }: PageParams) {
  const { locale, n: rawN } = await params;
  const n = parseWordLength(rawN) as WordLength | null;
  if (!n) notFound();

  const words = getWordsByLength(n);
  const grouped = groupByFirstLetter(words);
  const sortedLetters = Object.keys(grouped).sort();
  const totalWords = words.length;
  const schemaJson = buildSchemaJson(n, locale, words);

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
            <span className="text-neo-white" aria-current="page">{n}-Letter Words</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-neo-display font-black text-neo-yellow mb-3">
              All {n}-Letter Words
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
              Explore all {totalWords} valid {n}-letter words in the LexiClash dictionary.
              Each word shows its base score — longer words earn more points in the game.
              Click any word to see its full scoring breakdown and letter analysis.
            </p>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="bg-slate-900 border-2 border-neo-black rounded-neo px-4 py-2 shadow-hard-sm flex items-center gap-2">
              <span className="text-neo-cyan font-bold text-lg">{totalWords}</span>
              <span className="text-slate-400 text-sm">words</span>
            </div>
            <div className="bg-slate-900 border-2 border-neo-black rounded-neo px-4 py-2 shadow-hard-sm flex items-center gap-2">
              <span className="text-neo-yellow font-bold text-lg">{getWordScore('x'.repeat(n))}</span>
              <span className="text-slate-400 text-sm">base pts each</span>
            </div>
            <div className="bg-slate-900 border-2 border-neo-black rounded-neo px-4 py-2 shadow-hard-sm flex items-center gap-2">
              <span className="text-neo-orange font-bold text-lg">{getWordScore('x'.repeat(n)) * 2}</span>
              <span className="text-slate-400 text-sm">fire round pts</span>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-slate-900 border-neo border-neo-black rounded-neo p-4 shadow-hard mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-neo-white mb-1">Think you know your {n}-letter words?</p>
              <p className="text-slate-400 text-sm">
                Put your vocabulary to the test — find these words on the grid under time pressure!
              </p>
            </div>
            <Link
              href={`/${locale}/singleplayer`}
              className="shrink-0 bg-neo-yellow text-neo-black font-neo-display font-black px-5 py-2.5 rounded-neo border-3 border-neo-black shadow-hard-sm hover:shadow-hard-pressed active:translate-y-0.5 transition-all"
            >
              Play Now →
            </Link>
          </div>

          {/* Word list by letter group */}
          <div className="space-y-8">
            {sortedLetters.map(letter => (
              <section key={letter}>
                <h2 className="text-2xl font-neo-display font-black text-neo-cyan mb-3 border-b-2 border-slate-700 pb-2">
                  {letter}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {(grouped[letter] ?? []).map(word => (
                    <Link
                      key={word}
                      href={`/${locale}/words/${word}`}
                      className="group flex items-center justify-between bg-slate-900 border border-slate-700 hover:border-neo-cyan rounded-neo px-3 py-2 transition-colors"
                    >
                      <span className="font-bold text-sm text-neo-white group-hover:text-neo-yellow transition-colors uppercase tracking-wide">
                        {word}
                      </span>
                      <span className="text-xs font-bold text-neo-cyan bg-slate-800 rounded px-1.5 py-0.5 ml-1 shrink-0">
                        {getWordScore(word)}pt
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Related pages — other lengths */}
          <div className="mt-12 pt-8 border-t-2 border-slate-700">
            <h2 className="text-sm font-bold text-neo-cyan uppercase tracking-wider mb-4">Explore Other Lengths</h2>
            <div className="flex flex-wrap gap-2">
              {VALID_LENGTHS.filter(l => l !== n).map(l => (
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

          {/* Browse by letter */}
          <div className="mt-6">
            <h2 className="text-sm font-bold text-neo-cyan uppercase tracking-wider mb-4">Browse by Starting Letter</h2>
            <div className="flex flex-wrap gap-1.5">
              {'abcdefghijklmnopqrstuvwxyz'.split('').map(letter => (
                <Link
                  key={letter}
                  href={`/${locale}/words/starting-with/${letter}`}
                  className="w-8 h-8 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-neo text-sm font-bold uppercase hover:border-neo-cyan hover:text-neo-yellow transition-colors"
                >
                  {letter}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
