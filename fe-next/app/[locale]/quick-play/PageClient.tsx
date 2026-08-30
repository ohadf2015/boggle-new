'use client';

/**
 * Quick Play page shell — renders the solo arcade wheel hub.
 * Ungated and available to all players as the default mode after onboarding.
 */
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { QuickPlayHub } from '@/components/quick-play/QuickPlayHub';

function LoadingFallback() {
  return <div className="min-h-screen bg-neo-navy" />;
}

function QuickPlayGate() {
  const { language } = useLanguageSafe();
  const searchParams = useSearchParams();

  return <QuickPlayHub challengeId={searchParams.get('challenge')} />;
}

export default function QuickPlayPageClient() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      {/* Participate in the app layout's bounded flex-column height chain
          (`<main>` → children wrapper are `flex-1 flex flex-col min-h-0`), the
          same chain the Daily Challenge route relies on. A `min-h-screen` block
          here (the old shell) breaks that chain: the Word Wheel's `flex-1` root
          becomes inert and its `[container-type:size]` wheel cluster collapses,
          crushing the board into the top HUD.
          overflow-hidden (not overflow-y-auto): nested STAGE/game scrollers own
          overflow. A page-level scroller was stacking with STAGE scroll and
          fighting definite-height flex for boards. Hub wheel/results use
          min-h-full + their own scroll when content is tall. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-neo-navy">
        <QuickPlayGate />
      </div>
    </Suspense>
  );
}
