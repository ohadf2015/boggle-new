import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

import { DailyLoadingFallback } from '@/components/daily/DailyLoadingFallback';
import { retryImport } from '@/utils/retryImport';

interface PageParams {
  params: Promise<{ locale: string }>;
}

const LoadingFallback = () => <DailyLoadingFallback mode="wordHunt" />;

// retryImport hardens the lazy chunk load so a stale-deploy or flaky-network
// ChunkLoadError retries and then recovers instead of freezing the fallback.
const DailyChallenge = dynamicImport(retryImport(() => import('@/components/daily/DailyChallenge')), {
  loading: LoadingFallback,
});

export const revalidate = 3600;

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  // Game shell (~282 crawlable words) — noindexed 2026-07-02; /daily is the
  // indexable hub for the daily modes.
  return generatePageMetadata({ seoKey: 'daily', path: '/daily/word-hunt', locale, noIndex: true });
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
