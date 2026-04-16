import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

import { PageLoader } from '@/components/ui/PageLoader';

interface PageParams {
  params: Promise<{ locale: string }>;
}

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center bg-neo-navy">
    <PageLoader size="lg" text="Loading Word Hunt..." />
  </div>
);

const DailyChallenge = dynamicImport(() => import('@/components/daily/DailyChallenge'), {
  loading: LoadingFallback,
});

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'daily', path: '/daily/word-hunt', locale });
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
