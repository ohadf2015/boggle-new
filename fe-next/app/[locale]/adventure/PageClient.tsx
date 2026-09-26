'use client';

import React, { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { PageLoader } from '@/components/ui/PageLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';
import { useLanguageSafe } from '@/contexts/LanguageContext';

// Loading fallback component with playful design
function LoadingFallback(): React.JSX.Element {
  const { t } = useLanguageSafe();
  // The first-paint catalogue is a subset; until the full one lands t() echoes
  // the key. The mascot alone reads as loading — a raw "adventure.loading" does not.
  const caption = t('adventure.loading');
  return (
    <div className="flex-1 flex relative">
      <PlayfulBackground intensity="medium" colorScheme="game" />
      <PageLoader size="lg" text={caption === 'adventure.loading' ? undefined : caption} mascotVariant="explorer" className="relative z-10" />
    </div>
  );
}

// Dynamic import for code splitting
const AdventureView = nextDynamic(
  () => import('@/components/adventure/AdventureView'),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

/**
 * Adventure Mode page route — public and indexed. AdventureView owns the
 * auth split: guests get a playable demo battle, signed-in players the full map.
 */
export default function AdventurePageClient(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdventureView />
    </Suspense>
  );
}
