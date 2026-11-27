import type { Metadata } from 'next';
import { defaultOgImages } from '@/lib/seo/defaultOgImage';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { calculateWordScore, getComboBonus } from '@/shared/utils/scoring';
import { InlineBannerAd } from '@/components/ads';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { parseWordLength } from '../_utils/wordListData';
import { nLetterWordsMetadata, NLetterWordsView } from '../_nletter/NLetterWordsView';
import { jsonLdGraph } from '@/lib/seo/jsonLdGraph';
import { Stagger } from '@/components/motion/PopIn';
import { PressGroup } from '../_components/PressGroup';
import { HeroBand } from '../_components/HeroBand';
import { PRIMARY_CTA, CHIP, PAPER_CARD, SECTION_LABEL } from '../_components/wordStyles';

// /words/{n}-letter-words (e.g. 3-letter-words) is served by THIS dynamic route and
// delegated to NLetterWordsView. It used to be a sibling [n]-letter-words route, but two
// dynamic segments under /words/ conflicted and 404'd both. Detect the exact pattern.
const N_LETTER_WORDS_RE = /^(\d+)-letter-words$/;
function nLetterLengthFromParam(rawWord: string): ReturnType<typeof parseWordLength> {
  const m = rawWord.match(N_LETTER_WORDS_RE);
  return m ? parseWordLength(m[1]) : null;
}

export const dynamic = 'force-dynamic';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
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

// NOTE: no route-level `revalidate` — it conflicts with `dynamic = 'force-dynamic'`
// above and made Next ISR-cache this route's metadata for 24h, so a deploy's
// updated robots (noindex) wouldn't take effect until revalidation. force-dynamic
// governs: metadata is computed per request and always reflects current code.
export const dynamicParams = true;

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, word: rawWord } = await params;

  // /words/{n}-letter-words → delegate to the N-letter-words content view's metadata.
  const nLen = nLetterLengthFromParam(rawWord);
  if (nLen) return nLetterWordsMetadata(locale, nLen);

  const word = sanitizeWord(rawWord);
  // Invalid word param → noindex (AdSense/GSC: never let a not-found leak index,follow).
  if (!word) return { title: 'Not Found', robots: { index: false, follow: false } };

  const displayWord = word.toUpperCase();
  const points = getBasePoints(word);
  const title = `${displayWord} — ${points} Points in LexiClash | ${word.length}-Letter Word`;
  const description = `${displayWord} is a ${word.length}-letter word worth ${points} points in LexiClash. See letter breakdown, scoring details, and play it in a word game.`;
  const localePath = `/${locale}`;

  return {
    title,
    description,
    openGraph: {
      images: defaultOgImages(locale),
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

  // /words/{n}-letter-words → render the N-letter-words content view.
  const nLen = nLetterLengthFromParam(rawWord);
  if (nLen) return <NLetterWordsView locale={locale} n={nLen} />;

  const word = sanitizeWord(rawWord);

  if (!word) notFound();

  const isValid = await isWordValid(word, validLocale);
  const displayWord = word.toUpperCase();
  const points = getBasePoints(word);
  const letterFreq = getLetterFrequency(word);

  const scoringTiers = [
    { combo: 0, label: 'No combo', score: points },
    { combo: 5, label: 'Combo 5', score: getComboScore(word.length, 5) },
    { combo: 10, label: 'Combo 10', score: getComboScore(word.length, 10) },
  ];

  // JSON-LD schema — all values are sanitized via sanitizeWord() (letters only, max 20 chars)
  const schemaJson = JSON.stringify(jsonLdGraph([
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
  ]));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />

      <PressGroup className="min-h-screen bg-neo-navy text-neo-white">
        <HeroBand className="max-w-2xl">
          <TopBackLink className="mb-4" />

          <h1 className="font-neo-display text-5xl font-bold tracking-wide sm:text-6xl">
            {displayWord}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`inline-block rounded-full border-2 border-neo-black px-3 py-1 text-sm font-bold shadow-hard-sm ${isValid ? 'bg-neo-lime text-neo-black' : 'bg-neo-red text-neo-white'}`}>
              {isValid ? 'Valid' : 'Not Valid'}
            </span>
            <span className="text-neo-white/75">
              {word.length} letters
            </span>
            <span className="rounded-full border-2 border-neo-black bg-neo-cyan px-3 py-1 text-sm font-bold text-neo-black">
              {points} pts
            </span>
          </div>

          <Stagger dir={/[\u0590-\u05FF]/.test(word) ? 'rtl' : 'ltr'} className="flex flex-wrap gap-2 mt-5">
            {displayWord.split('').map((letter, i) => (
              <div
                key={`${letter}-${i}`}
                className="flex h-12 w-12 items-center justify-center rounded-neo border-3 border-neo-black bg-neo-cream font-neo-display text-xl font-bold text-neo-black shadow-hard-sm sm:h-14 sm:w-14 sm:text-2xl"
              >
                {letter}
              </div>
            ))}
          </Stagger>
          {letterFreq.some(l => l.count > 1) && (
            <p className="mt-2 text-xs text-neo-white/70">
              Repeated: {letterFreq.filter(l => l.count > 1).map(l => `${l.letter} ×${l.count}`).join(', ')}
            </p>
          )}

          <div className="mt-6">
            <Link href={`/${locale}/quick-play`} data-press data-primary-cta className={PRIMARY_CTA}>
              Play Now →
            </Link>
            <p className="mt-3 text-sm text-neo-white/70">
              Can you find this word on the grid?
            </p>
          </div>
        </HeroBand>

        <div className="mx-auto flex max-w-2xl flex-col gap-10 px-4 pb-20 pt-4">
          <section className={`${PAPER_CARD} p-5 sm:p-6`}>
            <h2 className="mb-3 font-neo-display text-2xl font-bold">Scoring</h2>
            <div className="space-y-2">
              {scoringTiers.map(tier => (
                <div key={tier.combo} className="flex items-center justify-between text-sm">
                  <span>{tier.label}</span>
                  <span className="font-bold">{tier.score} pts</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t-2 border-neo-black/15 pt-2 text-sm">
                <span>Fire Round (2x)</span>
                <span className="rounded bg-neo-orange px-1.5 font-bold">{points * 2} pts</span>
              </div>
            </div>
          </section>

          <InlineBannerAd webZone="content-page" />

          <section>
            <h2 className={`${SECTION_LABEL} mb-4`}>Word Facts</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col-reverse justify-end rounded-neo-lg border-3 border-neo-black bg-neo-lime p-3 text-neo-black shadow-hard-lg">
                <dt className="text-sm font-bold">Length</dt>
                <dd className="font-neo-display text-2xl font-bold">{word.length} letters</dd>
              </div>
              <div className="flex flex-col-reverse justify-end rounded-neo-lg border-3 border-neo-black bg-neo-cyan p-3 text-neo-black shadow-hard-lg">
                <dt className="text-sm font-bold">Unique Letters</dt>
                <dd className="font-neo-display text-2xl font-bold">{letterFreq.length}</dd>
              </div>
              <div className="flex flex-col-reverse justify-end rounded-neo-lg border-3 border-neo-black bg-neo-pink p-3 text-neo-black shadow-hard-lg">
                <dt className="text-sm font-bold">Starts With</dt>
                <dd className="font-neo-display text-2xl font-bold">{word[0].toUpperCase()}</dd>
              </div>
              <div className="flex flex-col-reverse justify-end rounded-neo-lg border-3 border-neo-black bg-neo-yellow p-3 text-neo-black shadow-hard-lg">
                <dt className="text-sm font-bold">Ends With</dt>
                <dd className="font-neo-display text-2xl font-bold">{word[word.length - 1].toUpperCase()}</dd>
              </div>
            </dl>
          </section>

          {/* Related searches — internal linking for SEO */}
          <section>
            <h2 className={`${SECTION_LABEL} mb-4`}>Explore More</h2>
            <div className="flex flex-wrap gap-2">
              {[
                [`/${locale}/tools/word-solver?length=${word.length}`, `${word.length}-letter words`],
                [`/${locale}/tools/word-solver?starts=${word[0].toLowerCase()}`, `Words starting with ${word[0].toUpperCase()}`],
                [`/${locale}/daily`, 'Daily Challenge'],
                [`/${locale}/tools/word-solver`, 'Word Solver'],
              ].map(([href, label]) => (
                <Link key={href} href={href} data-press className={`${CHIP} rounded-full px-4 py-2 text-sm font-bold`}>
                  {label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </PressGroup>
    </>
  );
}
