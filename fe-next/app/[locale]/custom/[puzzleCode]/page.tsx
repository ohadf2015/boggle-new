import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import type { Metadata } from 'next';
import { translations } from '@/translations';

type Locale = keyof typeof translations;

interface PageParams {
  params: Promise<{ locale: string; puzzleCode: string }>;
}

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
    <div className="text-center">
      <div className="relative w-12 h-12 mx-auto mb-3">
        <div className="absolute inset-0 border-4 border-neo-pink/30 rounded-full" />
        <div className="absolute inset-0 border-4 border-transparent border-t-neo-pink rounded-full animate-spin" />
      </div>
      <p className="text-gray-600 dark:text-gray-300 text-sm">Loading Custom Puzzle...</p>
    </div>
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
  const t = translations[validLocale] as Record<string, unknown>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
