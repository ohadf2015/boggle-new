'use client';

import React, { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';

// Loading fallback component with playful design
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-neo-navy relative">
    <PlayfulBackground intensity="medium" colorScheme="game" />
    <div className="relative z-10">
      <NeoLoader variant="mascot-letters" size="lg" text="Loading adventure..." />
    </div>
  </div>
);

// Dynamic import for code splitting
const AdventureView = nextDynamic(
  () => import('@/components/adventure/AdventureView'),
  {
    loading: LoadingFallback,
    ssr: false,
  }
);

export const dynamic = 'force-dynamic';

/**
 * Adventure Mode page route
 * Shows the world map and level selection for Adventure Mode
 *
 * Wrapped in Suspense boundary for proper hook handling
 */
export default function AdventurePage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AdventureView />
    </Suspense>
  );
}
