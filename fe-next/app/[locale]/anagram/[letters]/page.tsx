import type { Metadata } from 'next';
import { defaultOgImages } from '@/lib/seo/defaultOgImage';
import Link from 'next/link';
import { CtaBand, FaqList, LandingButton, LandingHero, LandingPage, LinkPills, Mark, Section, StatStrip } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import { notFound } from 'next/navigation';
import { InlineBannerAd } from '@/components/ads';
import { calculateWordScore } from '@/shared/utils/scoring';
import { parseLetters, findAnagramsFromLetters } from '../lib/anagramLogic';
import { loadDictionaryWords } from '@/app/api/word-solver/dictionaryLoader';
import { enOnlyAlternates } from '@/lib/seo/enOnlyAlternates';
import { jsonLdGraph } from '@/lib/seo/jsonLdGraph';

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
    openGraph: { images: defaultOgImages(locale), type: 'website', url, title, description, siteName: 'LexiClash' },
    // Founder-authorised 2026-06-08: noindex the whole programmatic family —
    // 127 indexed pages earned 0 clicks / 0% CTR over 28d (failed SEO experiment
    // + AdSense thin-page drag). `follow:true` still passes outbound crawl
    // signal. Reversible: restore `index: locale === 'en'` to re-index.
    alternates: enOnlyAlternates(`/anagram/${letters}`),
    robots: { index: false, follow: true },
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

  return JSON.stringify(jsonLdGraph([breadcrumb, itemList, faq, webPage]));
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

      <LandingPage locale={locale} play={{ href: `/${locale}/quick-play`, label: 'Play Free →' }}>
        <nav aria-label="Breadcrumb" className="-mb-8 flex items-center gap-2 text-sm text-neo-white/70 sm:-mb-14">
          <Link href={`/${locale}`} className="hover:text-neo-white">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/${locale}/tools`} className="hover:text-neo-white">Tools</Link>
          <span aria-hidden="true">/</span>
          <span className="text-neo-white" aria-current="page">Anagrams of {upper}</span>
        </nav>

        <LandingHero
          title={<>Anagrams of <Mark>{upper}</Mark></>}
          lead={totalWords > 0
            ? `${totalWords} word${totalWords === 1 ? '' : 's'} you can make with these letters`
            : 'No anagrams found — try different letters'}
        >
          {totalWords > 0 && (
            <div className="w-full">
              <StatStrip
                items={[
                  { value: totalWords, label: 'total words' },
                  { value: sortedLengths.length, label: 'word lengths' },
                  { value: `${sortedLengths[0]}–${sortedLengths[sortedLengths.length - 1]}`, label: 'letters' },
                ]}
              />
            </div>
          )}
        </LandingHero>

        {totalWords === 0 && (
          <div className="rounded-neo-lg border-3 border-neo-black bg-neo-cream p-6 text-neo-black shadow-hard-xl">
            <p className="mb-4 font-bold">Hmm, no words found from these letters. Try:</p>
            <ul className="list-disc space-y-2 ps-5">
              <li>Removing one letter and searching again</li>
              <li>Adding a vowel if you have mostly consonants</li>
              <li>Checking your spelling</li>
            </ul>
            {dropLetterSuggestions.length > 0 && (
              <div className="mt-4 border-t-2 border-neo-black/15 pt-4">
                <p className="mb-2 text-sm">Try these letter combinations:</p>
                <LinkPills items={dropLetterSuggestions.map((suggestion) => ({ href: `/${locale}/anagram/${suggestion}`, label: suggestion.toUpperCase() }))} />
              </div>
            )}
          </div>
        )}

        {totalWords > 0 && (
          <div className="flex flex-col gap-10">
            {sortedLengths.map((len) => (
              <Section key={len} title={`${len}-Letter Words`}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {(grouped[len] ?? []).map((word) => (
                    <Link
                      key={word}
                      href={`/${locale}/words/${word}`}
                      className="flex items-center justify-between rounded-neo border-2 border-neo-black bg-neo-cream px-3 py-2 text-neo-black shadow-hard-sm hover:bg-neo-yellow"
                    >
                      <span className="text-sm font-bold uppercase tracking-wide">{word}</span>
                      <span className="ms-1 shrink-0 rounded bg-neo-black px-1.5 py-0.5 text-xs font-bold text-neo-lime">
                        {calculateWordScore(word)}pt
                      </span>
                    </Link>
                  ))}
                </div>
              </Section>
            ))}
          </div>
        )}

        {totalWords > 0 && (
          <CtaBand
            tone="lime"
            title="Try these words in LexiClash"
            body="Find them on the grid to earn points. Longer words score more!"
            actions={<LandingButton href={`/${locale}/quick-play`} variant="dark">Play Free →</LandingButton>}
            art={LANDING_ART.trophy('')}
          />
        )}

        <InlineBannerAd webZone="content-page" />

        <Section title="Frequently Asked Questions">
          <FaqList
            items={[
              {
                q: `What words can I make from ${upper}?`,
                a: totalWords > 0
                  ? `There are ${totalWords} valid words you can form from the letters ${upper}, ranging from ${sortedLengths[0]} to ${sortedLengths[sortedLengths.length - 1]} letters long. Click any word to see its definition and scoring breakdown.`
                  : `No words were found from the letters ${upper}. Try removing or swapping letters to find anagrams.`,
              },
              {
                q: 'Is this a Scrabble word finder?',
                a: 'Yes! This anagram solver uses the same dictionary as competitive Scrabble and Boggle word games. All words shown are valid in standard English dictionaries, making it perfect for word game players.',
              },
              {
                q: 'How is the score calculated?',
                a: (
                  <div className="space-y-2">
                    <p>In LexiClash, longer words score exponentially more points:</p>
                    <ul className="list-disc space-y-1 ps-5">
                      <li>3-letter words: 10 points</li>
                      <li>4-letter words: 20 points</li>
                      <li>5-letter words: 50 points</li>
                      <li>6-letter words: 100 points</li>
                      <li>7-letter words: 200 points</li>
                      <li>8+ letter words: 500 points</li>
                    </ul>
                    <p>Combo bonuses can multiply your score further when you find words consecutively.</p>
                  </div>
                ),
              },
            ]}
          />
        </Section>

        <Section title="Related Tools & Games">
          <LinkPills
            items={[
              { href: `/${locale}/tools/word-solver`, label: 'Word Solver →' },
              { href: `/${locale}/quick-play`, label: 'Play Solo →' },
              { href: `/${locale}/multiplayer`, label: 'Multiplayer →' },
            ]}
          />
        </Section>
      </LandingPage>
    </>
  );
}
