import type { Metadata } from 'next';
import { FaqPageJsonLd } from '@/components/seo/FaqPageJsonLd';
import { enOnlyAlternates } from '@/lib/seo/enOnlyAlternates';
import benchmark from '@/lib/wordleSolver/benchmark.json';
import { CtaBand, FaqList, LandingButton, Prose, Section } from '@/components/landing/kit';
import { LANDING_ART } from '@/components/landing/kit/art';
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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: webAppJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
      <FaqPageJsonLd faqs={faqs} />

      <WordleSolverPageClient>
        <Section title="Tested on every Wordle answer">
          <Prose>
            <p>
              We played the solver against all {benchmark.games.toLocaleString('en-US')} answers in the original Wordle
              list. It found every one within six guesses and needed {benchmark.average} guesses on average. Here is how
              many games took each number of guesses:
            </p>
          </Prose>
          <div className="max-w-3xl space-y-1.5 rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 text-neo-black shadow-hard-xl" role="table" aria-label="Guesses needed per game">
            {rows.map((r) => (
              <div key={r.guesses} role="row" className="flex items-center gap-3">
                <span role="cell" className="w-6 text-end font-mono font-bold">{r.guesses}</span>
                <span role="cell" className="flex-1">
                  <span
                    className="block h-6 rounded-sm border-2 border-neo-black bg-neo-lime pe-2 text-end font-mono text-sm font-bold leading-5"
                    style={{ width: `${Math.max(8, (r.games / widest) * 100)}%` }}
                  >
                    {r.games}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="How to use it">
          <Prose>
            <p>
              Play the suggested word in your Wordle game. Then tap each tile here until its color matches what the game
              showed you, and press Next guess. If you played a different word, type it into the row first. Keep going
              until the tiles are all green.
            </p>
            <p>
              Under the board you can see every answer that still fits, so you can also just use it as a hint list and
              pick the word yourself.
            </p>
          </Prose>
        </Section>

        <Section title="Frequently asked questions">
          <FaqList items={faqs} />
        </Section>

        <CtaBand
          tone="yellow"
          title="One Wordle a day not enough?"
          body="LexiClash is a free word game where you race friends or the clock to find words in a letter grid. New daily challenge every day, no download."
          actions={<LandingButton href={`/${locale}/daily`} variant="dark">Play today&apos;s challenge</LandingButton>}
          art={LANDING_ART.trophy('')}
        />
      </WordleSolverPageClient>
    </>
  );
}
