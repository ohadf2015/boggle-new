'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';

// Loading fallback component with playful design
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy relative overflow-hidden">
    <PlayfulBackground intensity="medium" colorScheme="game" />
    <div className="relative z-10">
      <NeoLoader variant="letters" size="md" text="Loading single player..." />
    </div>
  </div>
);

// Dynamic import for code splitting
const SinglePlayerView = dynamic(() => import('@/components/singleplayer/SinglePlayerView'), {
  loading: LoadingFallback,
  ssr: false,
});

// Force dynamic rendering
export const dynamic_config = 'force-dynamic';

/**
 * Single Player page route
 * Handles all single player game modes: Solo vs Bots, Practice, Challenge
 *
 * Wrapped in Suspense boundary to properly handle useSearchParams
 * which can cause "Rendered fewer hooks than expected" errors without it.
 * See: https://nextjs.org/docs/app/api-reference/functions/use-search-params
 */
export default function SinglePlayerPage(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SinglePlayerView />
    </Suspense>
  );
}
