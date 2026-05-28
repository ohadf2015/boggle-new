import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InlineBannerAd } from '@/components/ads';
import { calculateWordScore } from '@/shared/utils/scoring';
import { parseLetters, findAnagramsFromLetters } from '../lib/anagramLogic';
import { loadDictionaryWords } from '@/app/api/word-solver/dictionaryLoader';
import { enOnlyAlternates } from '@/lib/seo/enOnlyAlternates';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

const BASE_URL = 'https://www.lexiclash.live';

interface PageParams {
  params: Promise<{ locale: string; letters: string }>;
}

function groupByLength(words: string[]): Record<number, string[]> {
  return words.reduce<Record<number, string[]>>((acc, w) => {
    if (!acc[w.length]) acc[w.length] = [];
    acc[w.length].push(w);
    return acc;
  }, {});
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, letters: rawLetters } = await params;
  const letters = parseLetters(rawLetters);
  if (!letters) return { title: 'Not Found' };

  const upper = letters.toUpperCase();
  const title = `Anagrams of ${upper} — Anagram Solver | LexiClash`;
  const description = `Find all words you can make from the letters ${upper}. Free anagram solver for Scrabble, Boggle, and word games.`;
  const url = `${BASE_URL}/${locale}/anagram/${letters}`;

  return {
    title,
    description,
    openGraph: { type: 'website', url, title, description, siteName: 'LexiClash' },
    // English-only content + index:locale==='en'. Self-referencing EN hreflang
    // cluster (never declare the noindexed /he|/sv|/ja|/es siblings).
    alternates: enOnlyAlternates(`/anagram/${letters}`),
    robots: { index: locale === 'en', follow: true },
  };
}

function buildSchemaJson(letters: string, locale: string, words: string[], totalFound: number): string {
  const upper = letters.toUpperCase();
  const grouped = groupByLength(words);
  const lengths = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const shortest = lengths[0] ?? 2;
  const longest = lengths[lengths.length - 1] ?? 10;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'LexiClash', item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${BASE_URL}/${locale}/tools` },
      { '@type': 'ListItem', position: 3, name: `Anagrams of ${upper}`, item: `${BASE_URL}/${locale}/anagram/${letters}` },
    ],
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Anagrams of ${upper}`,
    description: `${totalFound} words you can make from the letters ${upper}`,
    numberOfItems: totalFound,
    itemListElement: words.slice(0, 50).map((word, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: word.toUpperCase(),
      url: `${BASE_URL}/${locale}/words/${word}`,
    })),
  };

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What words can I make from ${upper}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `There are ${totalFound} valid words you can form from the letters ${upper}, ranging from ${shortest} to ${longest} letters long. Use this anagram solver to find them all.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Is this a Scrabble word finder?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes! This anagram solver uses the same dictionary as competitive Scrabble and Boggle. All words shown are valid in standard English dictionaries and word games.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How is the score calculated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `In LexiClash, longer words score exponentially more points: 3-letter words = 10pts, 4-letter = 20pts, 5-letter = 50pts, 6-letter = 100pts, 7-letter = 200pts, 8+ = 500pts. Combo bonuses can multiply your score further.`,
        },
      },
    ],
  };

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Anagrams of ${upper}`,
    description: `${totalFound} anagrams from ${upper}`,
    url: `${BASE_URL}/${locale}/anagram/${letters}`,
    isPartOf: { '@type': 'WebSite', name: 'LexiClash', url: BASE_URL },
  };

  return JSON.stringify([breadcrumb, itemList, faq, webPage]);
}

export default async function AnagramPage({ params }: PageParams) {
  const { locale, letters: rawLetters } = await params;
  const letters = parseLetters(rawLetters);
  if (!letters) notFound();

  let anagrams: string[] = [];
  try {
    const dictionary = await loadDictionaryWords('en');
    anagrams = findAnagramsFromLetters(letters, dictionary);
  } catch (error) {
    console.error('[anagram] Dictionary load error:', error);
    // Fail gracefully — still render empty page with helpful message
  }

  const grouped = groupByLength(anagrams);
  const sortedLengths = Object.keys(grouped).map(Number).sort((a, b) => b - a);
  const totalWords = anagrams.length;
  const upper = letters.toUpperCase();
  const schemaJson = buildSchemaJson(letters, locale, anagrams, totalWords);

  // For empty state suggestions, drop one letter at a time
  const dropLetterSuggestions = letters.split('').slice(0, 2).map((_, idx) => {
    const suggested = letters.split('').filter((_, i) => i !== idx).join('');
    return suggested;
  });

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
            <Link href={`/${locale}/tools`} className="hover:text-neo-cyan transition-colors">Tools</Link>
            <span aria-hidden="true">/</span>
            <span className="text-neo-white" aria-current="page">Anagrams of {upper}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-neo-display font-black text-neo-lime mb-3">
              Anagrams of {upper}
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
              {totalWords > 0
                ? `${totalWords} word${totalWords === 1 ? '' : 's'} you can make with these letters`
                : 'No anagrams found — try different letters'}
            </p>
          </div>

          {/* Stats bar */}
          {totalWords > 0 && (
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="bg-neo-navy border-2 border-neo-black rounded-neo px-4 py-2 shadow-hard-sm flex items-center gap-2">
                <span className="text-neo-cyan font-bold text-lg">{totalWords}</span>
                <span className="text-slate-400 text-sm">total words</span>
              </div>
              <div className="bg-neo-navy border-2 border-neo-black rounded-neo px-4 py-2 shadow-hard-sm flex items-center gap-2">
                <span className="text-neo-lime font-bold text-lg">{sortedLengths.length}</span>
                <span className="text-slate-400 text-sm">word lengths</span>
              </div>
              <div className="bg-neo-navy border-2 border-neo-black rounded-neo px-4 py-2 shadow-hard-sm flex items-center gap-2">
                <span className="text-neo-cyan font-bold text-lg">{sortedLengths[0]}–{sortedLengths[sortedLengths.length - 1]}</span>
                <span className="text-slate-400 text-sm">letters</span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {totalWords === 0 && (
            <div className="bg-neo-navy border-2 border-neo-cyan rounded-neo p-6 shadow-hard mb-8">
              <p className="text-neo-white font-bold mb-4">
                Hmm, no words found from these letters. Try:
              </p>
              <ul className="space-y-2 text-slate-300">
                <li>Removing one letter and searching again</li>
                <li>Adding a vowel if you have mostly consonants</li>
                <li>Checking your spelling</li>
              </ul>
              {dropLetterSuggestions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-sm text-slate-400 mb-2">Try these letter combinations:</p>
                  <div className="flex flex-wrap gap-2">
                    {dropLetterSuggestions.map(suggestion => (
                      <Link
                        key={suggestion}
                        href={`/${locale}/anagram/${suggestion}`}
                        className="bg-neo-cyan/10 border border-neo-cyan rounded-neo px-3 py-1 text-sm font-bold text-neo-cyan hover:bg-neo-cyan/20 transition-colors"
                      >
                        {suggestion.toUpperCase()}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hero CTA */}
          {totalWords > 0 && (
            <div className="bg-linear-to-r from-neo-lime/10 to-neo-cyan/10 border-3 border-neo-lime rounded-neo p-5 shadow-hard mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <p className="font-neo-display font-black text-xl text-neo-white mb-1">
                    Try these words in LexiClash
                  </p>
                  <p className="text-slate-300 text-sm">
                    Find them on the grid to earn points. Longer words score more!
                  </p>
                </div>
                <Link
                  href={`/${locale}/singleplayer`}
                  className="shrink-0 bg-neo-lime text-neo-black font-neo-display font-black px-5 py-2.5 rounded-neo border-3 border-neo-black shadow-hard-sm hover:shadow-hard-pressed active:translate-y-0.5 transition-all"
                >
                  Play Free →
                </Link>
              </div>
            </div>
          )}

          {/* Words grouped by length */}
          {totalWords > 0 && (
            <div className="space-y-8">
              {sortedLengths.map((len) => (
                <section key={len}>
                  <h2 className="text-2xl font-neo-display font-black text-neo-cyan mb-3 border-b-2 border-slate-700 pb-2">
                    {len}-Letter Words
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {(grouped[len] ?? []).map((word) => (
                      <Link
                        key={word}
                        href={`/${locale}/words/${word}`}
                        className="group flex items-center justify-between bg-neo-navy border border-slate-700 hover:border-neo-cyan hover:shadow-[0_0_12px_rgba(0,255,255,0.15)] rounded-neo px-3 py-2 transition-all duration-200"
                      >
                        <span className="font-bold text-sm text-neo-white group-hover:text-neo-lime transition-colors uppercase tracking-wide">
                          {word}
                        </span>
                        <span className="text-xs font-bold text-neo-cyan bg-neo-navy-light rounded px-1.5 py-0.5 ms-1 shrink-0">
                          {calculateWordScore(word)}pt
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <InlineBannerAd webZone="content-page" className="my-8" />

          {/* FAQ section */}
          <section className="mt-12 pt-8 border-t-2 border-slate-700">
            <h2 className="text-2xl font-neo-display font-black text-neo-lime mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <details className="bg-neo-navy border-2 border-slate-700 rounded-neo p-4 group" open>
                <summary className="font-bold text-neo-white cursor-pointer list-none flex items-center justify-between">
                  What words can I make from {upper}?
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="mt-3 text-slate-300 text-sm leading-relaxed">
                  <p>
                    {totalWords > 0
                      ? `There are ${totalWords} valid words you can form from the letters ${upper}, ranging from ${sortedLengths[0]} to ${sortedLengths[sortedLengths.length - 1]} letters long. Click any word to see its definition and scoring breakdown.`
                      : `No words were found from the letters ${upper}. Try removing or swapping letters to find anagrams.`}
                  </p>
                </div>
              </details>
              <details className="bg-neo-navy border-2 border-slate-700 rounded-neo p-4 group">
                <summary className="font-bold text-neo-white cursor-pointer list-none flex items-center justify-between">
                  Is this a Scrabble word finder?
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="mt-3 text-slate-300 text-sm leading-relaxed">
                  <p>
                    Yes! This anagram solver uses the same dictionary as competitive Scrabble and Boggle word games. All words shown are valid in standard English dictionaries, making it perfect for word game players.
                  </p>
                </div>
              </details>
              <details className="bg-neo-navy border-2 border-slate-700 rounded-neo p-4 group">
                <summary className="font-bold text-neo-white cursor-pointer list-none flex items-center justify-between">
                  How is the score calculated?
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="mt-3 text-slate-300 text-sm leading-relaxed space-y-2">
                  <p>
                    In LexiClash, longer words score exponentially more points:
                  </p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>3-letter words: 10 points</li>
                    <li>4-letter words: 20 points</li>
                    <li>5-letter words: 50 points</li>
                    <li>6-letter words: 100 points</li>
                    <li>7-letter words: 200 points</li>
                    <li>8+ letter words: 500 points</li>
                  </ul>
                  <p>Combo bonuses can multiply your score further when you find words consecutively.</p>
                </div>
              </details>
            </div>
          </section>

          {/* Related tools */}
          <div className="mt-12 pt-8 border-t-2 border-slate-700">
            <h2 className="text-sm font-bold text-neo-cyan uppercase tracking-wider mb-4">Related Tools & Games</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/${locale}/tools/word-solver`}
                className="flex-1 bg-neo-navy-light border border-slate-700 rounded-neo px-4 py-3 hover:border-neo-cyan transition-colors text-sm font-bold"
              >
                Word Solver →
              </Link>
              <Link
                href={`/${locale}/singleplayer`}
                className="flex-1 bg-neo-navy-light border border-slate-700 rounded-neo px-4 py-3 hover:border-neo-cyan transition-colors text-sm font-bold"
              >
                Play Solo →
              </Link>
              <Link
                href={`/${locale}/multiplayer`}
                className="flex-1 bg-neo-navy-light border border-slate-700 rounded-neo px-4 py-3 hover:border-neo-cyan transition-colors text-sm font-bold"
              >
                Multiplayer →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
