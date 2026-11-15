import type { Metadata } from 'next';
import { KahootGoLimitHonestyStrip } from '@/components/education/KahootGoLimitHonestyStrip';
import { VsComparisonPage } from '@/components/seo/VsComparisonPage';
import { copies, resolveVsLocale } from './copy';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-kahoot';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Kahoot — Free Kahoot Alternative for Vocabulary (2026) | LexiClash',
    description: 'LexiClash vs Kahoot compared: free word-formation games vs quiz-show format. No student signup, no Kahoot+ subscription, 6 languages, full multiplayer. The free Kahoot alternative for vocabulary and language teachers.',
    keywords: 'lexiclash vs kahoot, kahoot alternative, free kahoot alternative, kahoot vs lexiclash, alternatives to kahoot, free quiz game alternative, kahoot for free, classroom multiplayer free, vocabulary kahoot alternative, kahoot for teachers free',
    openGraph: {
      title: 'LexiClash vs Kahoot — The Free Alternative',
      description: 'Word games beat quiz format for vocabulary. No student signup. No Kahoot+ paywall. 6 languages.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Kahoot comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Kahoot — Free Alternative',
      description: 'Vocabulary word games. Free class play (3 classes × 50). Teacher Pro is $9/mo for teacher tools.',
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
      slug="lexiclash-vs-kahoot"
      competitor="Kahoot"
      ctaLinks={[
        { label: c.ctaTry, href: '/education/classroom-game' },
        { label: c.ctaTeachers, href: '/education/games-for-teachers' },
        { label: c.ctaEsl, href: '/education/esl-word-games' },
      ]}
      moreHrefs={['/lexiclash-vs-quizlet', '/lexiclash-vs-wordle', '/best-online-word-games']}
      afterTable={<KahootGoLimitHonestyStrip locale={locale} />}
    />
  );
}
