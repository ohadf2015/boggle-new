import type { Metadata } from 'next';
import { VsComparisonPage } from '@/components/seo/VsComparisonPage';
import { copies, resolveVsLocale } from './copy';
import { BlooketGapsSetHonestyStrip } from '@/components/education/BlooketGapsSetHonestyStrip';
import { BlooketFreeTierHonestyStrip } from '@/components/education/BlooketFreeTierHonestyStrip';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-blooket';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Blooket — Free Word-Game Alternative for Classrooms (2026) | LexiClash',
    description: 'LexiClash vs Blooket compared: pre-built word-formation games vs build-your-own quiz game shows. No student signup, no question-writing, vocabulary-focused, 6 languages. The free Blooket alternative for word and vocabulary review.',
    keywords: 'lexiclash vs blooket, blooket alternative, free blooket alternative, blooket alternative free, blooket vs lexiclash, alternatives to blooket, blooket for vocabulary, classroom word game, word game like blooket, vocabulary review game',
    openGraph: {
      title: 'LexiClash vs Blooket — The Free Word-Game Alternative',
      description: 'Pre-built word games beat building quiz sets from scratch. No student signup. 6 languages. Whole class free.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Blooket comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Blooket — Free Alternative',
      description: 'Word games for the classroom. No signup. No question-writing. Free.',
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
      slug="lexiclash-vs-blooket"
      competitor="Blooket"
      ctaLinks={[
        { label: c.ctaTry, href: '/education/classroom-game' },
        { label: c.cta2, href: '/education/vocabulary-games-classroom' },
        { label: c.cta3, href: '/education/duels' },
      ]}
      moreHrefs={['/lexiclash-vs-kahoot', '/lexiclash-vs-vocabularyspellingcity', '/education']}
      afterTable={<>
          <BlooketFreeTierHonestyStrip locale={locale} />
          <BlooketGapsSetHonestyStrip locale={locale} />
        </>}
    />
  );
}
