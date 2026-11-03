import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqPageJsonLd } from '@/components/seo/FaqPageJsonLd';
import { enOnlyAlternates } from '@/lib/seo/enOnlyAlternates';
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


const sectionClass = 'bg-neo-navy-light border-3 border-neo-black rounded-neo p-5 sm:p-6 mb-6';
const h2Class = 'font-neo-display text-2xl font-bold text-white mb-3';
const pClass = 'text-neo-white leading-relaxed mb-3';
const codeClass = 'font-mono font-bold text-neo-yellow';

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
    <div dir="ltr" className="min-h-dvh bg-neo-navy">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: webAppJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
      <FaqPageJsonLd faqs={faqs} />

      <WordFinderPageClient />

      <article className="max-w-4xl mx-auto px-4 pb-12">
        <section className={sectionClass}>
          <h2 className={h2Class}>How to use the word finder</h2>
          <p className={pClass}>
            Type the letters you have into <strong>Your letters</strong> and press Find words. You get every word in the
            dictionary that can be built from those letters, grouped by length with the longest first. Each letter can be
            used as many times as you typed it, so <span className={codeClass}>listen</span> finds silent, tinsel and
            enlist, but not lessen, which needs a second e and s.
          </p>
          <p className={pClass}>
            You can leave the letters box empty and search with a pattern alone, which is how most crossword and
            Wordle players use it.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>Filter by letter position</h2>
          <p className={pClass}>
            The <strong>Pattern</strong> box locks letters in exact spots. Write one character per letter of the word: the
            letter if you know it, an underscore if you do not.
          </p>
          <ul className="list-disc ps-5 space-y-2 text-neo-white mb-3">
            <li>
              <span className={codeClass}>_ra_e</span> finds 5-letter words such as brace, crane, grade and trace.
            </li>
            <li>
              <span className={codeClass}>s___t</span> finds 5-letter words that start with s and end with t, such as
              shout, skirt and smart.
            </li>
            <li>
              For a crossword clue with the second and fourth letters filled in, type them in place:{' '}
              <span className={codeClass}>_o_e__</span>.
            </li>
          </ul>
          <p className={pClass}>
            For Wordle, put your green letters in the pattern and underscores everywhere else. Add a yellow letter in{' '}
            <strong>Contains</strong> to keep only words that use it somewhere.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>Advanced filters: starting letter, length, contains, blanks</h2>
          <ul className="list-disc ps-5 space-y-2 text-neo-white">
            <li><strong>Starts with</strong> keeps words that begin with the letters you give, like <span className={codeClass}>re</span> or <span className={codeClass}>un</span>.</li>
            <li><strong>Ends with</strong> is handy for suffix hunting: <span className={codeClass}>ing</span>, <span className={codeClass}>tion</span>, <span className={codeClass}>ly</span>.</li>
            <li><strong>Contains</strong> requires a run of letters anywhere in the word, for example <span className={codeClass}>qu</span> or <span className={codeClass}>x</span>.</li>
            <li><strong>Word length</strong> returns only words of exactly that many letters.</li>
            <li><strong>Blanks</strong>: add <span className={codeClass}>?</span> to your letters for each blank tile, up to three.</li>
          </ul>
          <p className={`${pClass} mt-3 mb-0`}>
            Start, end and contains narrow the list; they do not add letters to your rack. If the letters you want to
            build on are on the board, put them in the pattern instead.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>Word finder vs anagram solver: which to use when</h2>
          <p className={pClass}>
            Use the{' '}
            <Link href={`/${locale}/anagram`} className="text-neo-cyan underline">anagram solver</Link> when you want
            the exact rearrangements of a set of letters, such as a jumble puzzle. Use the{' '}
            <Link href={`/${locale}/tools/word-solver`} className="text-neo-cyan underline">word solver</Link> for a
            quick list of every word in your letters in English, Hebrew, Swedish, Japanese or Spanish. Use this word
            finder when position matters: a crossword gap, a Wordle row, or a word that has to hook onto tiles already
            on the board.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>Tips for Words With Friends and Scrabble</h2>
          <ul className="list-disc ps-5 space-y-2 text-neo-white">
            <li>Put the board letter you want to play through in the pattern, and your rack in Your letters. Try it at a few positions (<span className={codeClass}>a____</span>, <span className={codeClass}>_a___</span>, <span className={codeClass}>__a__</span>) to see every way to use it.</li>
            <li>Holding a Q without a U? Search Contains <span className={codeClass}>q</span> with your rack to see if anything plays.</li>
            <li>Before a seven-letter play, run your rack plus <span className={codeClass}>?</span> to see which single extra letter on the board would let you use every tile.</li>
            <li>Check the result against your game&apos;s own dictionary before you play, since tournament lists differ.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className={h2Class}>Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="bg-neo-navy-light border-3 border-neo-black rounded-neo p-4">
                <summary className="font-neo-display font-bold text-neo-orange cursor-pointer">{faq.q}</summary>
                <p className="text-neo-white mt-3 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-neo-yellow border-3 border-neo-black shadow-hard rounded-neo p-6 text-center">
          <h2 className="font-neo-display text-2xl font-bold text-neo-black mb-2">Put your word finding to the test</h2>
          <p className="text-neo-black/80 mb-4">
            LexiClash is a free word game where you race friends or the clock to find words in a letter grid. No download.
          </p>
          <Link
            href={`/${locale}/singleplayer`}
            className="inline-block px-8 py-3 font-neo-display font-bold text-lg bg-neo-navy text-white border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-pressed transition-shadow duration-100"
          >
            Play LexiClash free
          </Link>
        </section>
      </article>
    </div>
  );
}
