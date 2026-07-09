import React, { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { DailyLoadingFallback } from '@/components/daily/DailyLoadingFallback';
import Header from '@/components/Header';

interface PageParams {
  params: Promise<{ locale: string }>;
}

const LoadingFallback = () => <DailyLoadingFallback mode="wordHunt" />;

// Client orchestrator — the breather between chained daily challenges.
const DailyFlowController = dynamicImport(
  () => import('@/components/daily/flow/DailyFlowController'),
  { loading: LoadingFallback },
);

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  // Interstitial coordinator, not a landing page — keep it out of the index;
  // /daily is the crawlable hub for the daily modes.
  return generatePageMetadata({ seoKey: 'daily', path: '/daily/flow', locale, noIndex: true });
}

/**
 * Daily Flow route — the "one tap, play them all" coordinator. Sits between the
 * day's challenges: launches the next mode, gives a breather, and celebrates the
 * finish. See DailyFlowController for the state machine.
 */
export default function DailyFlowPage(): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col bg-neo-navy min-h-screen">
      <Header />
      <Suspense fallback={<LoadingFallback />}>
        <DailyFlowController />
      </Suspense>
    </div>
  );
}
