'use client';

import HolidayHideSpot from '@/components/holidays/hunt/HolidayHideSpot';
import React, { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { GameLoadingFallback } from '@/components/ui/GameLoadingFallback';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useModeBed } from '@/hooks/useModeBed';

function LoadingFallback(): React.JSX.Element {
  const { t } = useLanguageSafe();
  // The first-paint catalogue is a subset; until the full one lands t() echoes
  // the key. The mascot alone reads as loading — a raw "adventure.loading" does not.
  const caption = t('adventure.loading');
  return <GameLoadingFallback text={caption === 'adventure.loading' ? undefined : caption} mascotVariant="explorer" />;
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
  useModeBed('ADVENTURE');
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HolidayHideSpot slot="adventure" />
      <AdventureView />
    </Suspense>
  );
}
