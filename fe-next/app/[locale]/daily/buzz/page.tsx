import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import type { Metadata } from 'next';
import { translations } from '@/translations';
import { PageLoader } from '@/components/ui/PageLoader';

type Locale = 'en' | 'he' | 'sv' | 'ja' | 'es';

interface PageParams {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    date?: string;
  }>;
}

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center bg-neo-navy">
    <PageLoader size="lg" text="Loading Daily Buzz..." />
  </div>
);

const BuzzChallengeWrapper = dynamicImport(() => import('@/components/buzz/BuzzChallengeWrapper'), {
  loading: LoadingFallback,
});

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale as Locale) || 'en';
  const seo = translations[validLocale]?.seo?.daily || translations.en.seo.daily;

  const localePath = `/${locale}`;
  const baseUrl = 'https://www.lexiclash.live';

  return {
    title: `${seo.title} - Daily Buzz`,
    description: 'Word challenges from today\'s trends',
    openGraph: {
      type: 'website',
      url: `${baseUrl}${localePath}/daily/buzz`,
      title: 'Daily Buzz - LexiClash',
      description: 'Word challenges from today\'s trends',
      siteName: 'LexiClash',
    },
  };
}

/**
 * Daily Buzz page route
 * Dedicated route for Daily Buzz game mode
 */
export default function DailyBuzzPage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BuzzChallengeWrapper />
    </Suspense>
  );
}
