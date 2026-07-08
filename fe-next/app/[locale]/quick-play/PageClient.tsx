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
  const { canSeeInWorkModes } = useAuth();
  const { language } = useLanguageSafe();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isDev = process.env.NODE_ENV === 'development';
  useEffect(() => {
    if (!canSeeInWorkModes && !isDev) {
      router.replace(`/${language}`);
    }
  }, [canSeeInWorkModes, isDev, language, router]);

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
          crushing the board into the top HUD. `overflow-y-auto` keeps shorter
          phases (wheel select / results) scrollable within the bounded height. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-neo-navy">
        <QuickPlayGate />
      </div>
    </Suspense>
  );
}
