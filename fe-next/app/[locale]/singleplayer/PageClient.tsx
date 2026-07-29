'use client';

import React, { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { PageLoader } from '@/components/ui/PageLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';

// Loading fallback component with playful design
function LoadingFallback(): React.JSX.Element {
  return (
    <div className="flex-1 flex relative">
      <PlayfulBackground intensity="medium" colorScheme="game" />
      <PageLoader size="lg" text="Loading single player..." className="relative z-10" />
    </div>
  );
}

// Dynamic import for code splitting
const SinglePlayerView = nextDynamic(() => import('@/components/singleplayer/SinglePlayerView'), {
  loading: LoadingFallback,
  ssr: false,
});

/**
 * Single Player page route
 * Handles all single player game modes: Solo vs Bots, Practice, Challenge
 *
 * Wrapped in Suspense boundary to properly handle useSearchParams
 * which can cause "Rendered fewer hooks than expected" errors without it.
 * See: https://nextjs.org/docs/app/api-reference/functions/use-search-params
 */
export default function SinglePlayerPageClient(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SinglePlayerView />
    </Suspense>
  );
}
