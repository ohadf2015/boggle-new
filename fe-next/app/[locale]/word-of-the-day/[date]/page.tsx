import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  wordsByLocale,
  getWordByDate,
  type Locale,
} from '../content';
import { buildDynamicTitle, buildDynamicDescription, buildSchemas } from '../seo';
import WordOfTheDayClient from '../PageClient';

// Match the parent /word-of-the-day route — upstream components (AutoHideHeader, ad widgets)
// touch useSearchParams, which bails turbopack-prod prerender. Runtime SSR is fully crawlable
// and the sitemap still drives discovery, so we lose nothing for SEO.
export const dynamic = 'force-dynamic';

const SITE_URL = 'https://www.lexiclash.live';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

interface PageProps {
  params: Promise<{ locale: string; date: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, date } = await params;
  const loc = (LOCALES.includes(locale as Locale) ? locale : 'en') as Locale;
  const word = getWordByDate(loc, date);
  if (!word) {
    return { title: 'Not Found', robots: { index: false, follow: false } };
  }
  const title = buildDynamicTitle(loc, word);
  const description = buildDynamicDescription(loc, word);
  const url = `${SITE_URL}/${loc}/word-of-the-day/${date}`;
  return {
    title,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: 'LexiClash',
      publishedTime: `${date}T00:00:00Z`,
      images: [{
        url: `${SITE_URL}/og-image-${loc === 'he' ? 'he' : 'en'}.webp`,
        width: 1200,
        height: 630,
        alt: title,
      }],
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        LOCALES.map((l) => [l, `${SITE_URL}/${l}/word-of-the-day/${date}`])
          .concat([['x-default', `${SITE_URL}/en/word-of-the-day/${date}`]]),
      ),
    },
    // Thin per-date page (~216 crawlable words) — noindexed 2026-07-02 after
    // the AdSense "low value content" rejection; the /word-of-the-day hub is
    // the indexable surface. Same treatment as /daily/archive/[date] (06-04).
    robots: { index: false, follow: true },
  };
}

export default async function WordOfTheDayDatePage({ params }: PageProps) {
  const { locale, date } = await params;
  const loc = (LOCALES.includes(locale as Locale) ? locale : 'en') as Locale;
  const word = getWordByDate(loc, date);
  if (!word) notFound();
  const allWords = wordsByLocale[loc] || wordsByLocale.en;
  const schemas = buildSchemas(loc, word, `/${loc}/word-of-the-day/${date}`);

  // Safe: schemas built entirely from typed helpers + curated word data, no user input
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      />
      <WordOfTheDayClient allWords={allWords} featuredWord={word} />
    </>
  );
}
