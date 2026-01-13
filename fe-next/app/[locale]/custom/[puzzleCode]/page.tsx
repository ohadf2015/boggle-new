import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import type { Metadata } from 'next';
import { translations } from '@/translations';
import { PageLoader } from '@/components/ui/PageLoader';

type Locale = keyof typeof translations;

interface PageParams {
  params: Promise<{ locale: string; puzzleCode: string }>;
}

// Loading fallback component using unified PageLoader
const LoadingFallback = () => <PageLoader text="Loading Custom Puzzle..." />;

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
  const t = translations[validLocale] as Record<string, unknown>;

   
  const customPuzzle = (t as any).customPuzzle || {};
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
