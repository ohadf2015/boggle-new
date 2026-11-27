import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqPageJsonLd } from '@/components/seo/FaqPageJsonLd';
import { enOnlyAlternates } from '@/lib/seo/enOnlyAlternates';
import { CtaBand, FaqList, LandingButton, Prose, Section } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
import WordFinderPageClient from './PageClient';
import { faqs } from './faqs';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PATH = '/word-finder';
const TITLE = 'Word Finder: Find Words With Your Letters | LexiClash';
const DESCRIPTION =
  'Free word finder: enter your letters, lock letters in exact positions, and filter by start, end, length or blanks to get every matching word.';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const alternates = enOnlyAlternates(PATH);

  return {
    title: TITLE,
    description: DESCRIPTION,
    keywords:
      'word finder, find words with letters, find words with letters in certain positions, word finder with pattern, words with letters in specific positions, word finder with blanks, scrabble word finder, words with friends word finder',
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      locale: 'en_US',
      type: 'website',
      url: alternates.canonical,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash Word Finder' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description: DESCRIPTION,
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates,
    robots: { index: locale === 'en', follow: true },
  };
}


const codeClass = 'rounded bg-neo-black/10 px-1 font-mono font-bold';
const navyCode = 'font-mono font-bold text-neo-yellow';

export default async function WordFinderPage({ params }: PageProps) {
  const { locale } = await params;
  const pageUrl = `${BASE_URL}/en${PATH}`;

  // Static literals only, no user input.
  const webAppJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'LexiClash Word Finder',
    description: DESCRIPTION,
    url: pageUrl,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
  });
  const breadcrumbJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'LexiClash', item: `${BASE_URL}/en` },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${BASE_URL}/en/tools` },
      { '@type': 'ListItem', position: 3, name: 'Word Finder', item: pageUrl },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: webAppJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
      <FaqPageJsonLd faqs={faqs} />

      <WordFinderPageClient>
        <Section title="How to use the word finder">
          <Prose>
            <p>
              Type the letters you have into <strong>Your letters</strong> and press Find words. You get every word in the
              dictionary that can be built from those letters, grouped by length with the longest first. Each letter can be
              used as many times as you typed it, so <span className={navyCode}>listen</span> finds silent, tinsel and
              enlist, but not lessen, which needs a second e and s.
            </p>
            <p>
              You can leave the letters box empty and search with a pattern alone, which is how most crossword and
              Wordle players use it.
            </p>
          </Prose>
        </Section>

        <Section title="Filter by letter position">
          <Prose>
            <p>
              The <strong>Pattern</strong> box locks letters in exact spots. Write one character per letter of the word: the
              letter if you know it, an underscore if you do not.
            </p>
            <ul>
              <li>
                <span className={navyCode}>_ra_e</span> finds 5-letter words such as brace, crane, grade and trace.
              </li>
              <li>
                <span className={navyCode}>s___t</span> finds 5-letter words that start with s and end with t, such as
                shout, skirt and smart.
              </li>
              <li>
                For a crossword clue with the second and fourth letters filled in, type them in place:{' '}
                <span className={navyCode}>_o_e__</span>.
              </li>
            </ul>
            <p>
              For Wordle, put your green letters in the pattern and underscores everywhere else. Add a yellow letter in{' '}
              <strong>Contains</strong> to keep only words that use it somewhere.
            </p>
          </Prose>
        </Section>

        <Section title="Advanced filters: starting letter, length, contains, blanks">
          <Prose>
            <ul>
              <li><strong>Starts with</strong> keeps words that begin with the letters you give, like <span className={navyCode}>re</span> or <span className={navyCode}>un</span>.</li>
              <li><strong>Ends with</strong> is handy for suffix hunting: <span className={navyCode}>ing</span>, <span className={navyCode}>tion</span>, <span className={navyCode}>ly</span>.</li>
              <li><strong>Contains</strong> requires a run of letters anywhere in the word, for example <span className={navyCode}>qu</span> or <span className={navyCode}>x</span>.</li>
              <li><strong>Word length</strong> returns only words of exactly that many letters.</li>
              <li><strong>Blanks</strong>: add <span className={navyCode}>?</span> to your letters for each blank tile, up to three.</li>
            </ul>
            <p>
              Start, end and contains narrow the list; they do not add letters to your rack. If the letters you want to
              build on are on the board, put them in the pattern instead.
            </p>
          </Prose>
        </Section>

        <Section title="Word finder vs anagram solver: which to use when">
          <Prose paper>
            <p>
              Use the{' '}
              <Link href={`/${locale}/anagram`}>anagram solver</Link> when you want
              the exact rearrangements of a set of letters, such as a jumble puzzle. Use the{' '}
              <Link href={`/${locale}/tools/word-solver`}>word solver</Link> for a
              quick list of every word in your letters in English, Hebrew, Swedish, Japanese, Spanish or Russian. Use this word
              finder when position matters: a crossword gap, a Wordle row, or a word that has to hook onto tiles already
              on the board.
            </p>
          </Prose>
        </Section>

        <Section title="Tips for Words With Friends and Scrabble">
          <Prose paper>
            <ul>
              <li>Put the board letter you want to play through in the pattern, and your rack in Your letters. Try it at a few positions (<span className={codeClass}>a____</span>, <span className={codeClass}>_a___</span>, <span className={codeClass}>__a__</span>) to see every way to use it.</li>
              <li>Holding a Q without a U? Search Contains <span className={codeClass}>q</span> with your rack to see if anything plays.</li>
              <li>Before a seven-letter play, run your rack plus <span className={codeClass}>?</span> to see which single extra letter on the board would let you use every tile.</li>
              <li>Check the result against your game&apos;s own dictionary before you play, since tournament lists differ.</li>
            </ul>
          </Prose>
        </Section>

        <Section title="Frequently asked questions">
          <FaqList items={faqs} />
        </Section>

        <CtaBand
          tone="yellow"
          title="Put your word finding to the test"
          body="LexiClash is a free word game where you race friends or the clock to find words in a letter grid. No download."
          actions={<LandingButton href={`/${locale}/quick-play`} variant="dark">Play LexiClash free</LandingButton>}
          art={LANDING_ART.trophy('')}
        />
      </WordFinderPageClient>
    </>
  );
}
