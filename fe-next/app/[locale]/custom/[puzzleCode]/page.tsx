import { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import type { Metadata } from 'next';
import { translations } from '@/translations';
import { PageLoader } from '@/components/ui/PageLoader';

type Locale = keyof typeof translations;

interface PageParams {
  params: Promise<{ locale: string; puzzleCode: string }>;
}

// Loading fallback component - flex-1 fills parent, PageLoader centers within
const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center bg-neo-navy">
    <PageLoader size="lg" text="Loading Custom Puzzle..." />
  </div>
);

// Dynamic import for code splitting (client component)
const CustomPuzzleGame = dynamicImport(() => import('@/components/custom-puzzle/CustomPuzzleGame'), {
  loading: LoadingFallback,
});

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Generate metadata for custom puzzle page
 */
export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const supportedLocales = Object.keys(translations);
  const validLocale = (supportedLocales.includes(locale) ? locale : 'en') as Locale;

  const customPuzzle = (translations[validLocale] as any).customPuzzle || {};
  const title = customPuzzle.title || 'Custom Puzzle';
  const description = customPuzzle.description || 'Can you solve this custom word puzzle?';

  return {
    title: `${title} - LexiClash`,
    description,
    openGraph: {
      title: `${title} - LexiClash`,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${title} - LexiClash`,
      description,
    },
  };
}

export default async function CustomPuzzlePage({ params }: PageParams) {
  const { puzzleCode } = await params;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <CustomPuzzleGame puzzleCode={puzzleCode} />
    </Suspense>
  );
}
