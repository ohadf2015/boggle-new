import type { Metadata } from 'next';
import { defaultOgImages } from '@/lib/seo/defaultOgImage';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InlineBannerAd } from '@/components/ads';
import {
  getWordsByLetter,
  groupByLength,
  getWordScore,
  parseLetter,
  VALID_LETTERS,
  VALID_LENGTHS,
  type Letter,
} from '../../_utils/wordListData';
import { PopIn } from '@/components/motion/PopIn';
import { PressGroup } from '../../_components/PressGroup';
import { HeroBand } from '../../_components/HeroBand';
import { PRIMARY_CTA, SECONDARY_CTA, CHIP, SECTION_LABEL } from '../../_components/wordStyles';
import { LETTER_CONTENT } from './letterContent';
import { enOnlyAlternates } from '@/lib/seo/enOnlyAlternates';
import { jsonLdGraph } from '@/lib/seo/jsonLdGraph';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.lexiclash.live';

// 28d GSC: 0 clicks & ≤2 impressions → noindex until they earn organic traffic
const DEAD_LETTERS = new Set(['c', 'd', 'f', 'i', 'o', 'w', 'y']);

interface PageParams {
  params: Promise<{ locale: string; letter: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, letter: rawLetter } = await params;
  const letter = parseLetter(rawLetter);
  if (!letter) return { title: 'Not Found' };

  const upper = letter.toUpperCase();
  const words = getWordsByLetter(letter as Letter);
  const totalWords = words.length;
  const title = `${totalWords}+ Words That Start With ${upper} — Play & Practice | LexiClash`;
  const description = `Find ${totalWords} words starting with ${upper}, from ${words[0]?.toUpperCase() ?? upper} to ${words[words.length - 1]?.toUpperCase() ?? upper}. See scores, lengths & definitions — then test yourself in a free word game.`;
  const url = `${BASE_URL}/${locale}/words/starting-with/${letter}`;

  return {
    title,
    description,
    openGraph: { images: defaultOgImages(locale), type: 'website', url, title, description, siteName: 'LexiClash' },
    // Body content is English-only across all locale prefixes — index:locale==='en'.
    // Self-referencing EN hreflang cluster + canonical → /en (non-EN are noindexed,
    // have no localized equivalent, so we never declare them as alternates).
    alternates: enOnlyAlternates(`/words/starting-with/${letter}`),
    // NOINDEX 2026-08-09 — see NLetterWordsView for the full rationale: AdSense
    // "low value content" rejection x2 blocks all web ad revenue, these 27 generated
    // list pages are the trigger, and they drew ZERO pageviews in 60d.
    robots: { index: false, follow: true },
  };
}

function buildSchemaJson(letter: string, locale: string, words: string[]): string {
  const upper = letter.toUpperCase();
  const totalWords = words.length;
  const grouped = groupByLength(words);
  const lengths = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const shortest = lengths[0] ?? 2;
  const longest = lengths[lengths.length - 1] ?? 9;

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
    name: `Words That Start With ${upper}`,
    description: `${totalWords} words starting with ${upper} — browse by length, see scores, play free.`,
    numberOfItems: totalWords,
    itemListElement: words.slice(0, 100).map((word, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: word.toUpperCase(),
      url: `${BASE_URL}/${locale}/words/${word}`,
    })),
  };
  const letterInfo = LETTER_CONTENT[letter.toLowerCase()];
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How many words start with ${upper}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `There are ${totalWords} words that start with the letter ${upper} in the LexiClash dictionary, ranging from ${shortest} to ${longest} letters long. ${letterInfo?.funFact ?? ''}`,
        },
      },
      {
        '@type': 'Question',
        name: `What are common words that start with ${upper}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Some popular ${upper}-words include ${words.slice(0, 8).map(w => w.toUpperCase()).join(', ')}. ${letterInfo?.intro ?? ''} Browse the full list organized by word length above.`,
        },
      },
      {
        '@type': 'Question',
        name: `Can I practice words starting with ${upper}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes! LexiClash is a free word game where you find words on a letter grid. ${letterInfo?.strategy ?? ''} Play singleplayer to practice ${upper}-words, or challenge friends in real-time multiplayer.`,
        },
      },
      {
        '@type': 'Question',
        name: `What is the highest-scoring ${upper}-word?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The highest-scoring word starting with ${upper} in LexiClash is ${words[words.length - 1]?.toUpperCase() ?? upper}, worth ${getWordScore(words[words.length - 1])} points. Longer words earn more points — find them on the grid to boost your score.`,
        },
      },
    ],
  };
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Words That Start With ${upper}`,
    description: `${totalWords} words starting with ${upper} — browse, learn scores, and play free.`,
    url: `${BASE_URL}/${locale}/words/starting-with/${letter}`,
    isPartOf: { '@type': 'WebSite', name: 'LexiClash', url: BASE_URL },
    about: { '@type': 'Game', name: 'LexiClash', url: BASE_URL, genre: 'Word Game' },
  };
  return JSON.stringify(jsonLdGraph([breadcrumb, itemList, faq, webPage]));
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

  const letterIndex = VALID_LETTERS.indexOf(letter);
  const prevLetter = letterIndex > 0 ? VALID_LETTERS[letterIndex - 1] : null;
  const nextLetter = letterIndex < VALID_LETTERS.length - 1 ? VALID_LETTERS[letterIndex + 1] : null;
  const letterInfo = LETTER_CONTENT[letter];

  return (
    <>
      {/* JSON-LD is static server data — no user input involved */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />

      <PressGroup className="min-h-screen bg-neo-navy text-neo-white">
        <HeroBand className="max-w-4xl">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-neo-cream/60 flex items-center gap-2">
            <Link href={`/${locale}`} className="hover:text-neo-cyan transition-colors">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${locale}/words`} className="hover:text-neo-cyan transition-colors">Words</Link>
            <span aria-hidden="true">/</span>
            <span className="text-neo-white" aria-current="page">Starting With {upper}</span>
          </nav>

          <div className="flex items-center gap-4 mb-3">
            <PopIn className="w-16 h-16 shrink-0 bg-neo-lime text-neo-black font-neo-display font-black text-4xl flex items-center justify-center rounded-neo border-3 border-neo-black shadow-[0_4px_0_0] shadow-neo-lime-dark">
              {upper}
            </PopIn>
            <h1 className="text-3xl sm:text-4xl font-neo-display font-black text-neo-lime">
              {totalWords} Words That Start With {upper}
            </h1>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-neo-cream/70">
            <span><strong className="text-neo-cyan text-lg">{totalWords}</strong> total words</span>
            <span><strong className="text-neo-lime text-lg">{sortedLengths.length}</strong> length groups</span>
            <span><strong className="text-neo-cyan text-lg">{sortedLengths[0]}–{sortedLengths[sortedLengths.length - 1]}</strong> letters</span>
          </p>

          <div className="mt-6">
            <Link href={`/${locale}/quick-play`} data-press data-primary-cta className={PRIMARY_CTA}>
              Play Free Now →
            </Link>
            <p className="text-neo-cream/60 text-sm mt-3">
              Free, no signup required — play instantly.
            </p>
          </div>
        </HeroBand>

        <div className="max-w-4xl mx-auto px-4 pb-10">
          <div className="flex items-center gap-3 mb-8">
            {prevLetter ? (
              <Link href={`/${locale}/words/starting-with/${prevLetter}`} data-press className={`${CHIP} px-3 py-2 text-sm font-bold`}>
                ← {prevLetter.toUpperCase()}
              </Link>
            ) : (
              <span className="rounded-neo border-2 border-neo-cream/10 px-3 py-2 text-sm font-bold text-neo-cream/30 cursor-not-allowed">←</span>
            )}
            <span className="text-neo-cream/60 text-sm flex-1 text-center">
              Words starting with {upper}
            </span>
            {nextLetter ? (
              <Link href={`/${locale}/words/starting-with/${nextLetter}`} data-press className={`${CHIP} px-3 py-2 text-sm font-bold`}>
                {nextLetter.toUpperCase()} →
              </Link>
            ) : (
              <span className="rounded-neo border-2 border-neo-cream/10 px-3 py-2 text-sm font-bold text-neo-cream/30 cursor-not-allowed">→</span>
            )}
          </div>

          <div className="space-y-8">
            {sortedLengths.map((len, groupIndex) => (
              <div key={len}>
                <section>
                  <div className="flex flex-wrap items-baseline gap-x-3 mb-3">
                    <h2 className="text-xl sm:text-2xl font-neo-display font-black text-neo-cyan">
                      {len}-Letter Words Starting With {upper}
                    </h2>
                    <Link href={`/${locale}/words/${len}-letter-words`} className="text-xs text-neo-cream/60 hover:text-neo-cyan transition-colors">
                      see all {len}-letter words →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {(grouped[len] ?? []).map(word => (
                      <Link
                        key={word}
                        href={`/${locale}/words/${word}`}
                        data-press
                        className={`${CHIP} flex items-center justify-between px-3 py-2`}
                      >
                        <span className="font-bold text-sm uppercase tracking-wide">{word}</span>
                        <span className="text-xs font-bold text-neo-cyan ms-1 shrink-0">{getWordScore(word)}pt</span>
                      </Link>
                    ))}
                  </div>
                </section>

                {groupIndex === 1 && (
                  <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 border-s-4 border-neo-cyan ps-4">
                    <div className="flex-1">
                      <p className="font-bold text-neo-white">
                        Can you spot {len}-letter {upper}-words on a grid?
                      </p>
                      <p className="text-neo-cream/70 text-sm">
                        Longer words score more. The highest-scoring {upper}-word is worth{' '}
                        <span className="text-neo-lime font-bold">{getWordScore(words[words.length - 1])}pt</span>.
                      </p>
                    </div>
                    <Link href={`/${locale}/quick-play`} data-press className={SECONDARY_CTA}>
                      Try It Free →
                    </Link>
                  </div>
                )}

                {groupIndex === 3 && sortedLengths.length > 4 && (
                  <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 border-s-4 border-neo-pink ps-4">
                    <div className="flex-1">
                      <p className="font-bold text-neo-white">
                        Challenge a friend to find {upper}-words
                      </p>
                      <p className="text-neo-cream/70 text-sm">
                        Real-time 1v1 word battle — same grid, who finds more?
                      </p>
                    </div>
                    <Link href={`/${locale}/multiplayer`} data-press className={SECONDARY_CTA}>
                      Play Multiplayer →
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>

          <InlineBannerAd webZone="content-page" className="mt-10" />

          <div className="mt-12 max-w-2xl space-y-3">
            {letterInfo && (
              <p className="text-neo-cream/85 text-lg leading-relaxed">{letterInfo.intro}</p>
            )}
            <p className="text-neo-cream/70 leading-relaxed">
              Complete list of words starting with {upper}, from {sortedLengths[0]}-letter
              to {sortedLengths[sortedLengths.length - 1]}-letter words. Each word shows its
              game score — tap any word for its definition.
            </p>
          </div>

          {/* FAQ section — renders as FAQ rich snippet in Google */}
          <section className="mt-10 max-w-2xl">
            <h2 className="text-2xl font-neo-display font-black text-neo-lime mb-3">
              Frequently Asked Questions
            </h2>
            <div className="divide-y divide-neo-cream/15">
              <details className="group py-4" open>
                <summary className="font-bold text-neo-white cursor-pointer list-none flex items-center justify-between">
                  How many words start with {upper}?
                  <span className="text-neo-cream/50 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="mt-3 text-neo-cream/80 text-sm leading-relaxed space-y-2">
                  <p>
                    There are <strong className="text-neo-lime">{totalWords} words</strong> that start with the letter {upper} in the
                    LexiClash dictionary, ranging from {sortedLengths[0]} to {sortedLengths[sortedLengths.length - 1]} letters long.
                    The most common lengths are {sortedLengths.filter(l => (grouped[l]?.length ?? 0) > 5).slice(0, 3).join(', ')} letters.
                  </p>
                  {letterInfo && <p className="text-neo-cream/70">{letterInfo.funFact}</p>}
                </div>
              </details>
              <details className="group py-4">
                <summary className="font-bold text-neo-white cursor-pointer list-none flex items-center justify-between">
                  What are common words that start with {upper}?
                  <span className="text-neo-cream/50 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="mt-3 text-neo-cream/80 text-sm leading-relaxed space-y-2">
                  <p>
                    Some popular {upper}-words include{' '}
                    <strong>{words.slice(0, 8).map(w => w.toUpperCase()).join(', ')}</strong>.
                    Browse the full list above organized by word length, with game scores for each word.
                  </p>
                  {letterInfo && <p className="text-neo-cream/70">{letterInfo.intro}</p>}
                </div>
              </details>
              <details className="group py-4">
                <summary className="font-bold text-neo-white cursor-pointer list-none flex items-center justify-between">
                  How can I practice words starting with {upper}?
                  <span className="text-neo-cream/50 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="mt-3 text-neo-cream/80 text-sm leading-relaxed space-y-2">
                  <p>
                    LexiClash is a free word game where you find words on a letter grid under time pressure.
                    It&apos;s the best way to practice vocabulary and improve your word skills.
                  </p>
                  {letterInfo && <p className="text-neo-cream/70">{letterInfo.strategy}</p>}
                  <Link href={`/${locale}/quick-play`} className="inline-block font-bold text-neo-cyan hover:underline">
                    Start Practicing →
                  </Link>
                </div>
              </details>
              <details className="group py-4">
                <summary className="font-bold text-neo-white cursor-pointer list-none flex items-center justify-between">
                  What is the highest-scoring {upper}-word?
                  <span className="text-neo-cream/50 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-neo-cream/80 text-sm leading-relaxed">
                  The highest-scoring word starting with {upper} is{' '}
                  <strong className="text-neo-lime">{words[words.length - 1]?.toUpperCase()}</strong> worth{' '}
                  <strong className="text-neo-cyan">{getWordScore(words[words.length - 1])} points</strong>.
                  Longer words earn more points — find them on the grid to boost your score.
                </p>
              </details>
            </div>
          </section>

          <div className="mt-10 border-2 border-neo-black rounded-neo bg-neo-navy-light/50 p-6 text-center">
            <p className="font-neo-display font-black text-2xl text-neo-white mb-2">
              Ready to test your {upper}-word skills?
            </p>
            <p className="text-neo-cream/70 mb-5 max-w-md mx-auto">
              Free word game — no download, no signup. Find words on a grid against the clock.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href={`/${locale}/quick-play`} data-press className={PRIMARY_CTA}>
                Play Solo →
              </Link>
              <Link href={`/${locale}/multiplayer`} data-press className={SECONDARY_CTA}>
                Challenge a Friend →
              </Link>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t-2 border-neo-cream/15">
            <h2 className={`${SECTION_LABEL} mb-4`}>Browse All Letters</h2>
            <div className="flex flex-wrap gap-1.5">
              {VALID_LETTERS.map((l: string) => (
                <Link
                  key={l}
                  href={`/${locale}/words/starting-with/${l}`}
                  data-press
                  className={
                    l === letter
                      ? 'w-9 h-9 flex items-center justify-center rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black text-sm font-bold uppercase'
                      : `${CHIP} w-9 h-9 flex items-center justify-center text-sm font-bold uppercase`
                  }
                  aria-current={l === letter ? 'page' : undefined}
                >
                  {l}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h2 className={`${SECTION_LABEL} mb-4`}>Browse by Word Length</h2>
            <div className="flex flex-wrap gap-2">
              {VALID_LENGTHS.map(l => (
                <Link key={l} href={`/${locale}/words/${l}-letter-words`} data-press className={`${CHIP} text-sm px-3 py-1.5`}>
                  {l}-letter words
                </Link>
              ))}
            </div>
          </div>
        </div>
      </PressGroup>
    </>
  );
}
