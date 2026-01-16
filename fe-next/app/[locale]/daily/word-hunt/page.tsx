import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import type { Metadata } from 'next';
import { translations } from '@/translations';
import { PageLoader } from '@/components/ui/PageLoader';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface PageParams {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    share?: string;
    wh?: string;
    whSolved?: string;
    whAttempts?: string;
    whPuzzle?: string;
    whName?: string;
    whEmoji?: string;
    whStreak?: string;
    whAvatar?: string;
  }>;
}

const LoadingFallback = () => <PageLoader text="Loading Word Hunt..." nested />;

const DailyChallenge = dynamicImport(() => import('@/components/daily/DailyChallenge'), {
  loading: LoadingFallback,
});

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const seo = translations[validLocale]?.seo?.daily || translations.en.seo.daily;

  return {
    title: `${seo.title} - Word Hunt`,
    description: seo.description,
  };
}

/**
 * Word Hunt Survival page route
 * Dedicated route for Word Hunt game mode
 */
export default function WordHuntPage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DailyChallenge />
    </Suspense>
  );
}
