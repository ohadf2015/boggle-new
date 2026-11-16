import type { Metadata } from 'next';
import Link from 'next/link';
import { faqs } from './faqs';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_URL = `${BASE_URL}/en/wordscapes-alternative`;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isTargetLocale = locale === 'en';

  return {
    title: 'Wordscapes Alternative — Free, No Ads | LexiClash',
    description: 'Tired of Wordscapes ads? LexiClash is a free word game with no pop-up ads, no download and no signup. Play live with 2-20+ friends.',
    keywords: 'wordscapes alternative, word games without ads, free word game no ads, wordscapes too many ads, games like wordscapes, wordscapes alternative multiplayer',
    openGraph: {
      title: 'Wordscapes Alternative — Free, No Ads | LexiClash',
      description: 'A free word game without interruptive ads. No download, no signup, real-time multiplayer.',
      locale: 'en_US',
      type: 'website',
      url: PAGE_URL,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash - Wordscapes Alternative' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Wordscapes Alternative — Free, No Ads | LexiClash',
      description: 'Free word game, no pop-up ads, no download. Play live with friends.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: { canonical: PAGE_URL },
    robots: isTargetLocale ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const faqJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
});

const breadcrumbJsonLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/en` },
    { '@type': 'ListItem', position: 2, name: 'Wordscapes Alternative', item: PAGE_URL },
  ],
});

const compareRows: ReadonlyArray<readonly [string, string, string]> = [
  ['Ads', 'No interruptive ads', 'Ads between and during levels'],
  ['Price', 'Free, no pay-to-win', 'Free with ads + in-app purchases'],
  ['Install', 'None, plays in the browser', 'App store download'],
  ['Real-time multiplayer', 'Yes, 2-20+ players', 'No (single-player, async tournaments)'],
  ['Style', 'Boggle-style word finder', 'Crossword-style puzzle'],
  ['Daily challenges', 'Yes', 'Yes'],
  ['Languages', '6 dictionaries', 'Several'],
];

export default async function WordscapesAlternativePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white">
      <script id="ld-faq" type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <script id="ld-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <section>
          <h1 className="font-neo-display text-4xl font-black leading-tight sm:text-6xl">
            A <span className="text-neo-lime">Wordscapes alternative</span> without the ads
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neo-gray-200">
            Fed up with long ads between levels? LexiClash is a free word game that plays in your browser: no
            download, no signup, no pop-ups. Solve daily puzzles on your own or race friends on the same grid, live.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${locale}/daily`}
              className="rounded-neo border-4 border-neo-black bg-neo-lime px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard"
            >
              Play today&apos;s puzzle
            </Link>
            <Link
              href={`/${locale}/multiplayer`}
              className="rounded-neo border-4 border-neo-black bg-neo-pink px-7 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard"
            >
              Play with friends
            </Link>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="mb-2 font-neo-display text-3xl font-black uppercase">
            LexiClash <span className="text-neo-pink">vs</span> Wordscapes
          </h2>
          <p className="mb-6 text-sm text-neo-gray-300">Wordscapes is a polished puzzle game. These are the differences that matter if ads drove you away.</p>
          <div className="overflow-x-auto rounded-neo border-4 border-neo-black bg-neo-navy-light shadow-hard-lg">
            <table className="w-full border-collapse text-sm sm:text-base">
              <thead>
                <tr className="border-b-3 border-neo-black bg-neo-navy">
                  <th className="px-4 py-3 text-left font-neo-display font-black uppercase text-neo-yellow">Feature</th>
                  <th className="px-4 py-3 text-center font-neo-display font-black uppercase text-neo-lime">LexiClash</th>
                  <th className="px-4 py-3 text-center font-neo-display font-black uppercase text-neo-gray-300">Wordscapes</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr key={row[0]} className={`border-b border-neo-gray-400/20 ${i % 2 ? 'bg-neo-navy/30' : ''}`}>
                    <td className="px-4 py-3 font-bold">{row[0]}</td>
                    <td className="px-4 py-3 text-center font-bold text-neo-lime">{row[1]}</td>
                    <td className="px-4 py-3 text-center text-neo-gray-300">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="mb-6 font-neo-display text-3xl font-black uppercase">Questions</h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5">
                <h3 className="font-neo-display text-lg font-black">{f.q}</h3>
                <p className="mt-2 text-neo-gray-200">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-12 text-sm text-neo-gray-300">
          Also see the{' '}
          <Link className="underline" href={`/${locale}/words-with-friends-alternative`}>Words With Friends alternative</Link>{' '}
          and{' '}
          <Link className="underline" href={`/${locale}/best-online-word-games`}>best online word games</Link>.
          Wordscapes is a trademark of its owner; LexiClash is not affiliated with it.
        </p>
      </div>
    </main>
  );
}
