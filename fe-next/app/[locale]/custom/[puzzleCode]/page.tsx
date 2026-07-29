import { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import type { Metadata } from 'next';
import { loadTranslation } from '@/translations/loadTranslation';
import { PageLoader } from '@/components/ui/PageLoader';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

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
  const supportedLocales = ['en', 'he', 'sv', 'ja', 'es'];
  const validLocale = (supportedLocales.includes(locale) ? locale : 'en') as Locale;
  const t = await loadTranslation(validLocale) as Record<string, unknown>;

  const customPuzzle = (t.customPuzzle ?? {}) as { title?: string; description?: string };
  const title = customPuzzle.title || 'Custom Puzzle';
  const description = customPuzzle.description || 'Can you solve this custom word puzzle?';

  return {
    robots: { index: false, follow: false },
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
