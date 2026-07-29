'use client';

import React, { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { PageLoader } from '@/components/ui/PageLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';
import { useLanguageSafe } from '@/contexts/LanguageContext';

// Loading fallback component with playful design
function LoadingFallback(): React.JSX.Element {
  const { t } = useLanguageSafe();
  return (
    <div className="flex-1 flex relative">
      <PlayfulBackground intensity="medium" colorScheme="game" />
      <PageLoader size="lg" text={t('adventure.loading')} mascotVariant="explorer" className="relative z-10" />
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
 * Adventure Mode page route
 * Shows the world map and level selection for Adventure Mode
 *
 * Wrapped in Suspense boundary for proper hook handling
 */
export default function AdventurePageClient(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdventureView />
    </Suspense>
  );
}
