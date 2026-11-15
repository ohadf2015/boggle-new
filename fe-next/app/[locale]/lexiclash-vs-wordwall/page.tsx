import type { Metadata } from 'next';
import Link from 'next/link';
import { VsComparisonPage } from '@/components/seo/VsComparisonPage';
import { copies, resolveVsLocale } from './copy';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-wordwall';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Wordwall — Free Wordwall Alternative for Word Games (2026) | LexiClash',
    description: 'LexiClash vs Wordwall compared: dedicated word-formation gameplay vs templated activities. Whole class free, no Wordwall subscription, no student signup, 6 native dictionaries. The free Wordwall alternative for vocabulary teachers.',
    keywords: 'lexiclash vs wordwall, wordwall alternative, free wordwall alternative, wordwall vs lexiclash, alternatives to wordwall, free wordwall replacement, wordwall for free, classroom word game wordwall, vocabulary tool wordwall, wordwall classroom multiplayer',
    openGraph: {
      title: 'LexiClash vs Wordwall — The Free Alternative',
      description: 'Dedicated word games beat templated activities. No subscription. 6 languages. Whole class free.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Wordwall comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Wordwall — Free Alternative',
      description: 'Word games for the classroom. No subscription. 6 languages.',
      images: [`${BASE_URL}/og-image-en.webp`],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        'x-default': pageUrl,
        en: pageUrl,
      },
    },
    robots: { index: isEnglish, follow: true },
  };
}

/** Link targets for `copy.alts`, in the same order. */
const ALT_HREFS = [
  '/lexiclash-vs-kahoot',
  '/lexiclash-vs-quizlet',
  '/lexiclash-vs-blooket',
  '/lexiclash-vs-gimkit',
  '/lexiclash-vs-wayground',
  '/education/classroom-game',
] as const;

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = copies[resolveVsLocale(locale)];

  return (
    <VsComparisonPage
      locale={locale}
      copy={c}
      slug="lexiclash-vs-wordwall"
      competitor="Wordwall"
      ctaLinks={[
        { label: c.ctaTry, href: '/education/classroom-game' },
        { label: c.cta2, href: '/education/vocabulary-games-classroom' },
        { label: c.cta3, href: '/education/games-for-teachers' },
      ]}
      moreHrefs={['/lexiclash-vs-quizlet', '/lexiclash-vs-kahoot', '/best-online-word-games']}
      showBackLink={false}
      afterWins={<section className="mb-12">
          <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">{c.altTitle}</h2>
          <p className="mb-6 text-neo-gray-200">{c.altIntro}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {ALT_HREFS.map((href, i) => (
              <Link key={href} href={`/${locale}${href}`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-[border-color] hover:border-neo-lime/40">
                <h3 className="font-bold text-neo-cyan">{c.alts[i].name}</h3>
                <p className="mt-1 text-sm text-neo-gray-200">{c.alts[i].desc}</p>
              </Link>
            ))}
          </div>
        </section>}
    />
  );
}
