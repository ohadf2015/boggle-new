import type { Metadata } from 'next';
import { VsComparisonPage } from '@/components/seo/VsComparisonPage';
import { copies, resolveVsLocale } from './copy';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-flocabulary';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Flocabulary — Free Vocabulary-Game Alternative (2026) | LexiClash',
    description: 'LexiClash vs Flocabulary compared: active word-formation gameplay vs hip-hop vocabulary videos. No subscription, no student signup, live multiplayer, 6 languages. The free Flocabulary alternative for vocabulary practice.',
    keywords: 'lexiclash vs flocabulary, flocabulary alternative, free flocabulary alternative, flocabulary alternative free, flocabulary vs lexiclash, alternatives to flocabulary, vocabulary game alternative, classroom vocabulary game, free vocabulary practice',
    openGraph: {
      title: 'LexiClash vs Flocabulary — The Free Vocabulary Alternative',
      description: 'Active word games beat watching vocabulary videos for recall. No subscription. 6 languages. Whole class free.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Flocabulary comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Flocabulary — Free Alternative',
      description: 'Play vocabulary, don’t just watch it. No signup. 6 languages. Free.',
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

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  const c = copies[resolveVsLocale(locale)];

  return (
    <VsComparisonPage
      locale={locale}
      copy={c}
      slug="lexiclash-vs-flocabulary"
      competitor="Flocabulary"
      ctaLinks={[
        { label: c.ctaTry, href: '/education/classroom-game' },
        { label: c.cta2, href: '/education/vocabulary-games-classroom' },
        { label: c.cta3, href: '/education/esl-word-games' },
      ]}
      moreHrefs={['/lexiclash-vs-quizlet', '/lexiclash-vs-vocabularyspellingcity', '/education']}
    />
  );
}
