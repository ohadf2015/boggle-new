import type { Metadata } from 'next';
import { VsComparisonPage } from '@/components/seo/VsComparisonPage';
import { copies, resolveVsLocale } from './copy';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const PAGE_PATH = '/lexiclash-vs-quizlet';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const isEnglish = locale === 'en';
  const pageUrl = `${BASE_URL}/en${PAGE_PATH}`;

  return {
    title: 'LexiClash vs Quizlet — Free Quizlet Alternative for Classrooms (2026) | LexiClash',
    description: 'LexiClash vs Quizlet compared: free word-formation games vs flashcard-based learning. No student signup, multiplayer for the whole class, 6 languages. The free Quizlet alternative for vocabulary teachers.',
    keywords: 'lexiclash vs quizlet, quizlet alternative, free quizlet alternative, quizlet alternative free, quizlet vs lexiclash, alternatives to quizlet, free flashcard alternative, vocabulary game vs quizlet, classroom vocabulary tool, quizlet for teachers free',
    openGraph: {
      title: 'LexiClash vs Quizlet — The Free Alternative',
      description: 'Word-formation games beat flashcards for spelling + recall. No student signup. 6 languages. Whole class free.',
      locale: 'en_US',
      type: 'website',
      url: pageUrl,
      images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Quizlet comparison' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'LexiClash vs Quizlet — Free Alternative',
      description: 'Word games for the classroom. No signup. 6 languages. Free.',
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
      slug="lexiclash-vs-quizlet"
      competitor="Quizlet"
      ctaLinks={[
        { label: c.ctaTry, href: '/education/classroom-game' },
        { label: c.cta2, href: '/education/vocabulary-games-classroom' },
        { label: c.cta3, href: '/education/duels' },
      ]}
      moreHrefs={['/lexiclash-vs-kahoot', '/lexiclash-vs-wordle', '/best-online-word-games']}
    />
  );
}
