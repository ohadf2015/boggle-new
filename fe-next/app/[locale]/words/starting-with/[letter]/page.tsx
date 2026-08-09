import type { Metadata } from 'next';
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
import { ScrollReveal, StaggerReveal } from '../../_components/ScrollReveal';
import { AnimatedCounter } from '../../_components/AnimatedCounter';
import { PulseCTA } from '../../_components/PulseCTA';
import { LETTER_CONTENT } from './letterContent';
import { enOnlyAlternates } from '@/lib/seo/enOnlyAlternates';

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
    openGraph: { type: 'website', url, title, description, siteName: 'LexiClash' },
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
  return JSON.stringify([breadcrumb, itemList, faq, webPage]);
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

      <div className="min-h-screen bg-neo-navy text-neo-white">
        <div className="max-w-4xl mx-auto px-4 py-8">

          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-400 flex items-center gap-2">
            <Link href={`/${locale}`} className="hover:text-neo-cyan transition-colors">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/${locale}/words`} className="hover:text-neo-cyan transition-colors">Words</Link>
            <span aria-hidden="true">/</span>
            <span className="text-neo-white" aria-current="page">Starting With {upper}</span>
          </nav>

          {/* Header — animated entrance */}
          <ScrollReveal className="mb-8">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 bg-neo-lime text-neo-black font-neo-display font-black text-4xl flex items-center justify-center rounded-neo border-3 border-neo-black shadow-hard hover:rotate-6 transition-transform">
                {upper}
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-neo-display font-black text-neo-lime">
                  {totalWords} Words That Start With {upper}
                </h1>
              </div>
            </div>
            {letterInfo && (
              <p className="text-slate-300 text-lg leading-relaxed max-w-2xl mb-3">
                {letterInfo.intro}
              </p>
            )}
            <p className="text-slate-400 text-base leading-relaxed max-w-2xl">
              Complete list of words starting with {upper}, from {sortedLengths[0]}-letter
              to {sortedLengths[sortedLengths.length - 1]}-letter words. Each word shows its
              game score — tap any word for its definition.
            </p>
          </ScrollReveal>

          {/* Hero CTA — above the fold, with pulse */}
          <ScrollReveal delay={0.15} className="mb-8">
            <div className="bg-linear-to-r from-neo-lime/10 to-neo-cyan/10 border-3 border-neo-lime rounded-neo p-5 shadow-hard">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <p className="font-neo-display font-black text-xl text-neo-white mb-1">
                    Think you know your {upper}-words?
                  </p>
                  <p className="text-slate-300 text-sm">
                    Find words on a letter grid before time runs out.
                    Free, no signup required — play instantly.
                  </p>
                </div>
                <PulseCTA href={`/${locale}/singleplayer`} color="lime" className="text-lg">
                  Play Free Now →
                </PulseCTA>
              </div>
            </div>
          </ScrollReveal>

          {/* Stats bar — animated counters */}
          <ScrollReveal delay={0.25} className="mb-8">
            <div className="flex flex-wrap gap-4">
              <div className="bg-neo-navy border-2 border-neo-black rounded-neo px-4 py-2 shadow-hard-sm flex items-center gap-2">
                <AnimatedCounter value={totalWords} className="text-neo-cyan font-bold text-lg" />
                <span className="text-slate-400 text-sm">total words</span>
              </div>
              <div className="bg-neo-navy border-2 border-neo-black rounded-neo px-4 py-2 shadow-hard-sm flex items-center gap-2">
                <AnimatedCounter value={sortedLengths.length} className="text-neo-lime font-bold text-lg" />
                <span className="text-slate-400 text-sm">length groups</span>
              </div>
              <div className="bg-neo-navy border-2 border-neo-black rounded-neo px-4 py-2 shadow-hard-sm flex items-center gap-2">
                <span className="text-neo-cyan font-bold text-lg">{sortedLengths[0]}–{sortedLengths[sortedLengths.length - 1]}</span>
                <span className="text-slate-400 text-sm">letters</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Letter navigation */}
          <div className="flex items-center gap-3 mb-8">
            {prevLetter ? (
              <Link
                href={`/${locale}/words/starting-with/${prevLetter}`}
                className="bg-neo-navy-light border border-slate-700 rounded-neo px-3 py-2 text-sm font-bold hover:border-neo-cyan transition-colors"
              >
                ← {prevLetter.toUpperCase()}
              </Link>
            ) : (
              <span className="bg-neo-navy-light/40 border border-slate-800 rounded-neo px-3 py-2 text-sm font-bold text-slate-600 cursor-not-allowed">
                ←
              </span>
            )}
            <span className="text-slate-400 text-sm flex-1 text-center">
              Words starting with {upper}
            </span>
            {nextLetter ? (
              <Link
                href={`/${locale}/words/starting-with/${nextLetter}`}
                className="bg-neo-navy-light border border-slate-700 rounded-neo px-3 py-2 text-sm font-bold hover:border-neo-cyan transition-colors"
              >
                {nextLetter.toUpperCase()} →
              </Link>
            ) : (
              <span className="bg-neo-navy-light/40 border border-slate-800 rounded-neo px-3 py-2 text-sm font-bold text-slate-600 cursor-not-allowed">
                →
              </span>
            )}
          </div>

          <div className="space-y-8">
            {sortedLengths.map((len, groupIndex) => (
              <div key={len}>
                <ScrollReveal>
                  <section>
                    <div className="flex items-center gap-3 mb-3 border-b-2 border-slate-700 pb-2">
                      <h2 className="text-2xl font-neo-display font-black text-neo-cyan">
                        {len}-Letter Words Starting With {upper}
                      </h2>
                      <Link
                        href={`/${locale}/words/${len}-letter-words`}
                        className="text-xs text-slate-500 hover:text-neo-cyan transition-colors"
                      >
                        see all {len}-letter words →
                      </Link>
                    </div>
                    <StaggerReveal
                      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"
                      staggerMs={30}
                    >
                      {(grouped[len] ?? []).map(word => (
                        <Link
                          key={word}
                          href={`/${locale}/words/${word}`}
                          className="group flex items-center justify-between bg-neo-navy border border-slate-700 hover:border-neo-cyan hover:shadow-[0_0_12px_rgba(0,255,255,0.15)] rounded-neo px-3 py-2 transition-all duration-200"
                        >
                          <span className="font-bold text-sm text-neo-white group-hover:text-neo-lime transition-colors uppercase tracking-wide">
                            {word}
                          </span>
                          <span className="text-xs font-bold text-neo-cyan bg-neo-navy-light rounded px-1.5 py-0.5 ms-1 shrink-0">
                            {getWordScore(word)}pt
                          </span>
                        </Link>
                      ))}
                    </StaggerReveal>
                  </section>
                </ScrollReveal>

                {/* Inline CTA after 2nd group */}
                {groupIndex === 1 && (
                  <ScrollReveal delay={0.1} direction="left" className="mt-6">
                    <div className="bg-neo-navy border-2 border-neo-cyan rounded-neo p-4 shadow-hard-sm flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="flex-1">
                        <p className="font-bold text-neo-white">
                          Can you spot {len}-letter {upper}-words on a grid?
                        </p>
                        <p className="text-slate-400 text-sm">
                          Longer words score more. The highest-scoring {upper}-word is worth{' '}
                          <span className="text-neo-lime font-bold">{getWordScore(words[words.length - 1])}pt</span>.
                        </p>
                      </div>
                      <PulseCTA href={`/${locale}/singleplayer`} color="cyan" className="text-sm">
                        Try It Free →
                      </PulseCTA>
                    </div>
                  </ScrollReveal>
                )}

                {/* Inline CTA after 4th group */}
                {groupIndex === 3 && sortedLengths.length > 4 && (
                  <ScrollReveal delay={0.1} direction="left" className="mt-6">
                    <div className="bg-neo-navy border-2 border-neo-pink rounded-neo p-4 shadow-hard-sm flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="flex-1">
                        <p className="font-bold text-neo-white">
                          Challenge a friend to find {upper}-words
                        </p>
                        <p className="text-slate-400 text-sm">
                          Real-time 1v1 word battle — same grid, who finds more?
                        </p>
                      </div>
                      <PulseCTA href={`/${locale}/multiplayer`} color="pink" className="text-sm">
                        Play Multiplayer →
                      </PulseCTA>
                    </div>
                  </ScrollReveal>
                )}
              </div>
            ))}
          </div>

          <InlineBannerAd webZone="content-page" className="mt-10" />

          {/* FAQ section — renders as FAQ rich snippet in Google */}
          <ScrollReveal className="mt-12 pt-8 border-t-2 border-slate-700">
            <h2 className="text-2xl font-neo-display font-black text-neo-lime mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <details className="bg-neo-navy border-2 border-slate-700 rounded-neo p-4 group" open>
                <summary className="font-bold text-neo-white cursor-pointer list-none flex items-center justify-between">
                  How many words start with {upper}?
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="mt-3 text-slate-300 text-sm leading-relaxed space-y-2">
                  <p>
                    There are <strong className="text-neo-lime">{totalWords} words</strong> that start with the letter {upper} in the
                    LexiClash dictionary, ranging from {sortedLengths[0]} to {sortedLengths[sortedLengths.length - 1]} letters long.
                    The most common lengths are {sortedLengths.filter(l => (grouped[l]?.length ?? 0) > 5).slice(0, 3).join(', ')} letters.
                  </p>
                  {letterInfo && (
                    <p className="text-slate-400">{letterInfo.funFact}</p>
                  )}
                </div>
              </details>
              <details className="bg-neo-navy border-2 border-slate-700 rounded-neo p-4 group">
                <summary className="font-bold text-neo-white cursor-pointer list-none flex items-center justify-between">
                  What are common words that start with {upper}?
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="mt-3 text-slate-300 text-sm leading-relaxed space-y-2">
                  <p>
                    Some popular {upper}-words include{' '}
                    <strong>{words.slice(0, 8).map(w => w.toUpperCase()).join(', ')}</strong>.
                    Browse the full list above organized by word length, with game scores for each word.
                  </p>
                  {letterInfo && (
                    <p className="text-slate-400">{letterInfo.intro}</p>
                  )}
                </div>
              </details>
              <details className="bg-neo-navy border-2 border-slate-700 rounded-neo p-4 group">
                <summary className="font-bold text-neo-white cursor-pointer list-none flex items-center justify-between">
                  How can I practice words starting with {upper}?
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="mt-3 text-slate-300 text-sm leading-relaxed space-y-2">
                  <p>
                    LexiClash is a free word game where you find words on a letter grid under time pressure.
                    It&apos;s the best way to practice vocabulary and improve your word skills.
                  </p>
                  {letterInfo && (
                    <p className="text-slate-400">{letterInfo.strategy}</p>
                  )}
                  <Link
                    href={`/${locale}/singleplayer`}
                    className="inline-block bg-neo-lime text-neo-black font-bold px-4 py-2 rounded-neo border-2 border-neo-black shadow-hard-sm hover:shadow-hard-pressed active:translate-y-0.5 transition-all text-sm"
                  >
                    Start Practicing →
                  </Link>
                </div>
              </details>
              <details className="bg-neo-navy border-2 border-slate-700 rounded-neo p-4 group">
                <summary className="font-bold text-neo-white cursor-pointer list-none flex items-center justify-between">
                  What is the highest-scoring {upper}-word?
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-slate-300 text-sm leading-relaxed">
                  The highest-scoring word starting with {upper} is{' '}
                  <strong className="text-neo-lime">{words[words.length - 1]?.toUpperCase()}</strong> worth{' '}
                  <strong className="text-neo-cyan">{getWordScore(words[words.length - 1])} points</strong>.
                  Longer words earn more points — find them on the grid to boost your score.
                </p>
              </details>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="scale" className="mt-10">
            <div className="bg-linear-to-r from-neo-lime/10 to-neo-pink/10 border-3 border-neo-lime rounded-neo p-6 shadow-hard text-center">
              <p className="font-neo-display font-black text-2xl text-neo-white mb-2">
                Ready to test your {upper}-word skills?
              </p>
              <p className="text-slate-300 mb-4 max-w-md mx-auto">
                Free word game — no download, no signup. Find words on a grid against the clock.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <PulseCTA href={`/${locale}/singleplayer`} color="lime">
                  Play Solo →
                </PulseCTA>
                <PulseCTA href={`/${locale}/multiplayer`} color="pink">
                  Challenge a Friend →
                </PulseCTA>
              </div>
            </div>
          </ScrollReveal>

          <div className="mt-12 pt-8 border-t-2 border-slate-700">
            <h2 className="text-sm font-bold text-neo-cyan uppercase tracking-wider mb-4">Browse All Letters</h2>
            <div className="flex flex-wrap gap-1.5">
              {VALID_LETTERS.map((l: string) => (
                <Link
                  key={l}
                  href={`/${locale}/words/starting-with/${l}`}
                  className={`w-8 h-8 flex items-center justify-center rounded-neo text-sm font-bold uppercase transition-colors border ${
                    l === letter
                      ? 'bg-neo-lime text-neo-black border-neo-black'
                      : 'bg-neo-navy-light border-slate-700 hover:border-neo-cyan hover:text-neo-lime'
                  }`}
                  aria-current={l === letter ? 'page' : undefined}
                >
                  {l}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-bold text-neo-cyan uppercase tracking-wider mb-4">Browse by Word Length</h2>
            <div className="flex flex-wrap gap-2">
              {VALID_LENGTHS.map(l => (
                <Link
                  key={l}
                  href={`/${locale}/words/${l}-letter-words`}
                  className="text-sm bg-neo-navy-light border border-slate-700 rounded-neo px-3 py-1.5 hover:border-neo-cyan transition-colors"
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
