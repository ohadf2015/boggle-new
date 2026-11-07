import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqPageJsonLd } from '@/components/seo/FaqPageJsonLd';
import { enOnlyAlternates } from '@/lib/seo/enOnlyAlternates';
import benchmark from '@/lib/wordleSolver/benchmark.json';
import WordleSolverPageClient from './PageClient';
import { faqs } from './faqs';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PATH = '/wordle-solver';
const TITLE = 'Wordle Solver & Helper: Best Next Guess | LexiClash';
const DESCRIPTION = `Free Wordle solver: tap in your tile colors and get the best next guess. Tested on all ${benchmark.games.toLocaleString('en-US')} answers, it averages ${benchmark.average} guesses.`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const alternates = enOnlyAlternates(PATH);

  return {
    title: TITLE,
    description: DESCRIPTION,
    keywords: 'wordle solver, wordle helper, wordle hint, best wordle starting word, wordle next guess, wordle answer finder',
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      locale: 'en_US',
      type: 'website',
      url: alternates.canonical,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash Wordle Solver' }],
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

export default async function WordleSolverPage({ params }: PageProps) {
  const { locale } = await params;
  const pageUrl = `${BASE_URL}/en${PATH}`;
  const rows = Object.entries(benchmark.distribution).map(([guesses, games]) => ({ guesses, games }));
  const widest = Math.max(...rows.map((r) => r.games));

  const webAppJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'LexiClash Wordle Solver',
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
      { '@type': 'ListItem', position: 3, name: 'Wordle Solver', item: pageUrl },
    ],
  });

  return (
    <div dir="ltr" className="min-h-dvh bg-neo-navy">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: webAppJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
      <FaqPageJsonLd faqs={faqs} />

      <WordleSolverPageClient />

      <article className="max-w-4xl mx-auto px-4 pb-12">
        <section className={sectionClass}>
          <h2 className={h2Class}>Tested on every Wordle answer</h2>
          <p className={pClass}>
            We played the solver against all {benchmark.games.toLocaleString('en-US')} answers in the original Wordle
            list. It found every one within six guesses and needed {benchmark.average} guesses on average. Here is how
            many games took each number of guesses:
          </p>
          <div className="space-y-1.5" role="table" aria-label="Guesses needed per game">
            {rows.map((r) => (
              <div key={r.guesses} role="row" className="flex items-center gap-3">
                <span role="cell" className="w-6 font-mono font-bold text-neo-white text-end">{r.guesses}</span>
                <span role="cell" className="flex-1">
                  <span
                    className="block h-6 bg-neo-lime border-2 border-neo-black rounded-sm text-end pe-2 font-mono font-bold text-neo-black text-sm leading-5"
                    style={{ width: `${Math.max(8, (r.games / widest) * 100)}%` }}
                  >
                    {r.games}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className={h2Class}>How to use it</h2>
          <p className={pClass}>
            Play the suggested word in your Wordle game. Then tap each tile here until its color matches what the game
            showed you, and press Next guess. If you played a different word, type it into the row first. Keep going
            until the tiles are all green.
          </p>
          <p className={pClass}>
            Under the board you can see every answer that still fits, so you can also just use it as a hint list and
            pick the word yourself.
          </p>
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
          <h2 className="font-neo-display text-2xl font-bold text-neo-black mb-2">One Wordle a day not enough?</h2>
          <p className="text-neo-black/80 mb-4">
            LexiClash is a free word game where you race friends or the clock to find words in a letter grid. New
            daily challenge every day, no download.
          </p>
          <Link
            href={`/${locale}/daily`}
            className="inline-block px-8 py-3 font-neo-display font-bold text-lg bg-neo-navy text-white border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-pressed transition-shadow duration-100"
          >
            Play today&apos;s challenge
          </Link>
        </section>
      </article>
    </div>
  );
}
