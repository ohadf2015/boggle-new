import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { calculateWordScore, getComboBonus } from '@/shared/utils/scoring';
import { InlineBannerAd } from '@/components/ads';

export const dynamic = 'force-dynamic';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];
const BASE_URL = 'https://www.lexiclash.live';

interface PageParams {
  params: Promise<{ locale: string; word: string }>;
}

/** Calculate base points for a word using canonical scoring */
function getBasePoints(word: string): number {
  return calculateWordScore(word);
}

/** Get letter frequency map */
function getLetterFrequency(word: string): Array<{ letter: string; count: number }> {
  const freq: Record<string, number> = {};
  for (const letter of word.toUpperCase()) {
    freq[letter] = (freq[letter] || 0) + 1;
  }
  return Object.entries(freq)
    .map(([letter, count]) => ({ letter, count }))
    .sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter));
}

/** Check if a word is valid by calling the dictionary API */
async function isWordValid(word: string, language: string): Promise<boolean> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiBase}/api/dictionary/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: word.toLowerCase(), language }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.isValid === true;
  } catch {
    return true; // Fail open for SEO — page still renders
  }
}

/**
 * Sanitize word param — only letters (any script), max 20 chars.
 * This is a security boundary: the sanitized output is safe for JSON-LD embedding.
 */
function sanitizeWord(raw: string): string | null {
  const decoded = decodeURIComponent(raw);
  // Allow letters from Latin, Hebrew, Japanese kana, CJK, and extended Latin scripts only
  const cleaned = decoded.replace(/[^a-zA-Z\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u00C0-\u024F]/g, '');
  if (cleaned.length < 2 || cleaned.length > 20) return null;
  return cleaned;
}

/** Get combo score for a given word length and combo level */
function getComboScore(wordLength: number, comboLevel: number): number {
  const dummyWord = 'A'.repeat(wordLength);
  return calculateWordScore(dummyWord, comboLevel);
}

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, word: rawWord } = await params;
  const word = sanitizeWord(rawWord);
  if (!word) return { title: 'Not Found' };

  const displayWord = word.toUpperCase();
  const points = getBasePoints(word);
  const title = `${displayWord} — ${points} Points in LexiClash | ${word.length}-Letter Word`;
  const description = `${displayWord} is a ${word.length}-letter word worth ${points} points in LexiClash. See letter breakdown, scoring details, and play it in a word game.`;
  const localePath = `/${locale}`;

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      url: `${BASE_URL}${localePath}/words/${word.toLowerCase()}`,
      title,
      description,
      siteName: 'LexiClash',
    },
    alternates: {
      canonical: `${BASE_URL}${localePath}/words/${word.toLowerCase()}`,
      languages: Object.fromEntries([
        ['x-default', `${BASE_URL}/en/words/${word.toLowerCase()}`],
        ...LOCALES.map(l => [l, `${BASE_URL}/${l}/words/${word.toLowerCase()}`]),
        ['en-IL', `${BASE_URL}/en/words/${word.toLowerCase()}`],
        ['he-IL', `${BASE_URL}/he/words/${word.toLowerCase()}`],
        ['en-US', `${BASE_URL}/en/words/${word.toLowerCase()}`],
        ['es-US', `${BASE_URL}/es/words/${word.toLowerCase()}`],
        ['en-GB', `${BASE_URL}/en/words/${word.toLowerCase()}`],
        ['en-SE', `${BASE_URL}/en/words/${word.toLowerCase()}`],
        ['sv-SE', `${BASE_URL}/sv/words/${word.toLowerCase()}`],
        ['en-JP', `${BASE_URL}/en/words/${word.toLowerCase()}`],
        ['ja-JP', `${BASE_URL}/ja/words/${word.toLowerCase()}`],
        ['en-ES', `${BASE_URL}/en/words/${word.toLowerCase()}`],
        ['es-ES', `${BASE_URL}/es/words/${word.toLowerCase()}`],
        ['en-MX', `${BASE_URL}/en/words/${word.toLowerCase()}`],
        ['es-MX', `${BASE_URL}/es/words/${word.toLowerCase()}`],
        ['en-AU', `${BASE_URL}/en/words/${word.toLowerCase()}`],
        ['es-AR', `${BASE_URL}/es/words/${word.toLowerCase()}`],
        ['es-CO', `${BASE_URL}/es/words/${word.toLowerCase()}`],
      ]),
    },
    robots: { index: false, follow: true },
  };
}

export default async function WordExplorerPage({ params }: PageParams) {
  const { locale, word: rawWord } = await params;
  const validLocale = (locale as Locale) || 'en';
  const word = sanitizeWord(rawWord);

  if (!word) notFound();

  const isValid = await isWordValid(word, validLocale);
  const displayWord = word.toUpperCase();
  const points = getBasePoints(word);
  const letterFreq = getLetterFrequency(word);
  // Word explorer labels are hardcoded (not in translation files yet — will add with i18n pass)

  const scoringTiers = [
    { combo: 0, label: 'No combo', score: points },
    { combo: 5, label: 'Combo 5', score: getComboScore(word.length, 5) },
    { combo: 10, label: 'Combo 10', score: getComboScore(word.length, 10) },
  ];

  // JSON-LD schema — all values are sanitized via sanitizeWord() (letters only, max 20 chars)
  const schemaJson = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'LexiClash', item: `${BASE_URL}/${locale}` },
        { '@type': 'ListItem', position: 2, name: 'Words', item: `${BASE_URL}/${locale}/words` },
        { '@type': 'ListItem', position: 3, name: displayWord, item: `${BASE_URL}/${locale}/words/${word.toLowerCase()}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      name: displayWord,
      description: `${displayWord} is a ${word.length}-letter word worth ${points} points in LexiClash word game.`,
      inDefinedTermSet: {
        '@type': 'DefinedTermSet',
        name: 'LexiClash Dictionary',
        url: `${BASE_URL}/${locale}/tools/word-solver`,
      },
    },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />

      <div className="min-h-screen bg-neo-navy text-neo-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Navigation */}
          <div className="mb-6">
            <Link href={`/${locale}/tools/word-solver`} className="text-neo-cyan text-sm hover:underline">
              ← Word Solver
            </Link>
          </div>

          {/* Word header */}
          <div className="mb-8">
            <h1 className="text-4xl font-neo-display font-black text-neo-yellow tracking-wider">
              {displayWord}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-block px-3 py-1 rounded-neo border-2 border-neo-black text-sm font-bold ${isValid ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                {isValid ? 'Valid' : 'Not Valid'}
              </span>
              <span className="text-slate-400">
                {word.length} letters
              </span>
              <span className="text-neo-cyan font-bold">
                {points} pts
              </span>
            </div>
          </div>

          {/* Points breakdown */}
          <div className="bg-neo-navy border-2 border-neo-black rounded-neo p-4 mb-6 shadow-hard-sm">
            <h2 className="text-sm font-bold text-neo-cyan uppercase tracking-wider mb-3">
              Scoring
            </h2>
            <div className="space-y-2">
              {scoringTiers.map(tier => (
                <div key={tier.combo} className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{tier.label}</span>
                  <span className="font-bold text-neo-white">{tier.score} pts</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm border-t border-slate-700/50 pt-2">
                <span className="text-slate-400">Fire Round (2x)</span>
                <span className="font-bold text-neo-orange">{points * 2} pts</span>
              </div>
            </div>
          </div>

          {/* Letter tiles */}
          <div className="bg-neo-navy border-2 border-neo-black rounded-neo p-4 mb-6 shadow-hard-sm">
            <h2 className="text-sm font-bold text-neo-cyan uppercase tracking-wider mb-3">
              Letters
            </h2>
            <div className="flex flex-wrap gap-2">
              {word.toUpperCase().split('').map((letter, i) => (
                <div
                  key={`${letter}-${i}`}
                  className="w-10 h-10 bg-neo-navy-light border-2 border-neo-black rounded-neo flex items-center justify-center font-neo-display font-black text-lg text-neo-yellow shadow-hard-sm"
                >
                  {letter}
                </div>
              ))}
            </div>
            {letterFreq.some(l => l.count > 1) && (
              <div className="mt-3 text-xs text-slate-500">
                Repeated: {letterFreq.filter(l => l.count > 1).map(l => `${l.letter} ×${l.count}`).join(', ')}
              </div>
            )}
          </div>

          <InlineBannerAd webZone="content-page" className="mb-6" />

          {/* Word facts */}
          <div className="bg-neo-navy border-2 border-neo-black rounded-neo p-4 mb-6 shadow-hard-sm">
            <h2 className="text-sm font-bold text-neo-cyan uppercase tracking-wider mb-3">
              Word Facts
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Length</dt>
                <dd className="font-bold">{word.length} letters</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Unique Letters</dt>
                <dd className="font-bold">{letterFreq.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Starts With</dt>
                <dd className="font-bold">{word[0].toUpperCase()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Ends With</dt>
                <dd className="font-bold">{word[word.length - 1].toUpperCase()}</dd>
              </div>
            </dl>
          </div>

          {/* Related searches — internal linking for SEO */}
          <div className="mb-8">
            <h2 className="text-sm font-bold text-neo-cyan uppercase tracking-wider mb-3">
              Explore More
            </h2>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/${locale}/tools/word-solver?length=${word.length}`}
                className="text-sm bg-neo-navy-light border border-slate-700 rounded-neo px-3 py-1.5 hover:border-neo-cyan transition-colors"
              >
                {word.length}-letter words
              </Link>
              <Link
                href={`/${locale}/tools/word-solver?starts=${word[0].toLowerCase()}`}
                className="text-sm bg-neo-navy-light border border-slate-700 rounded-neo px-3 py-1.5 hover:border-neo-cyan transition-colors"
              >
                Words starting with {word[0].toUpperCase()}
              </Link>
              <Link
                href={`/${locale}/daily`}
                className="text-sm bg-neo-navy-light border border-slate-700 rounded-neo px-3 py-1.5 hover:border-neo-cyan transition-colors"
              >
                Daily Challenge
              </Link>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href={`/${locale}/singleplayer`}
              className="inline-block bg-neo-yellow text-neo-black font-neo-display font-black px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard hover:shadow-hard-pressed active:translate-y-0.5 transition-all"
            >
              Play Now →
            </Link>
            <p className="text-slate-500 text-xs mt-2">
              Can you find this word on the grid?
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
