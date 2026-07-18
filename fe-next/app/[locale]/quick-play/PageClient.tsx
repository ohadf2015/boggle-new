'use client';

/**
 * Quick Play page shell — beta/admin gate (mirrors /adventure), then the hub.
 * Gate renders nothing until the profile resolves: never flash the beta UI
 * at non-beta users (dual-source-of-truth pitfall).
 */
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { QuickPlayHub } from '@/components/quick-play/QuickPlayHub';

function LoadingFallback() {
  return <div className="min-h-screen bg-neo-navy" />;
}

function QuickPlayGate() {
  const { canSeeInWorkModes, loading } = useAuth();
  const { language } = useLanguageSafe();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isDev = process.env.NODE_ENV === 'development';
  // Wait for auth to finish resolving before deciding: on a hard-load straight
  // to /quick-play the profile (hence canSeeInWorkModes) lands a beat after
  // first paint, and redirecting on that transient `false` bounced even admins
  // back home. Only redirect once we KNOW the user can't see in-work modes.
  useEffect(() => {
    if (!loading && !canSeeInWorkModes && !isDev) {
      router.replace(`/${language}`);
    }
  }, [loading, canSeeInWorkModes, isDev, language, router]);

  if (!canSeeInWorkModes && !isDev) {
    return <LoadingFallback />;
  }

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
