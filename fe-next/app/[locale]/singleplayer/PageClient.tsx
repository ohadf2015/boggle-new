'use client';

import React, { Suspense, useEffect, useState } from 'react';
import nextDynamic from 'next/dynamic';
import { retryImport } from '@/utils/retryImport';
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary';

// Loading fallback matches SinglePlayerGame's fullscreen shell.
function LoadingFallback(): React.JSX.Element {
  // Opaque navy, NO mascot. The LCP <img> lives in the server layout
  // (SinglePlayerLcpShell) so it is not unmounted when this ssr:false
  // boundary hydrates — remounting winner.webp was the 4–6s LCP render delay.
  // Same `fixed inset-0 z-[70] bg-neo-navy` box as the game overlay so the
  // swap cannot shift the page (CLS 0.073 was this box changing size).
  return (
    <div
      className="fixed inset-0 z-[69] overflow-hidden bg-neo-navy"
      translate="no"
      aria-busy="true"
      aria-label="Loading single player"
      data-testid="sp-game-hydrate-pending"
    />
  );
}

// Dynamic import for code splitting. retryImport so a stale-deploy / flaky
// network ChunkLoadError retries then cache-busts instead of freezing
// "Loading single player...". Hang-timeout (10s) covers the case the import
// never settles (pending forever — retry never runs). ChunkErrorBoundary is
// outside the chunk so a hang/reject can still render retry/reload.
// The board is ssr:false — it cannot SSR.
const SINGLEPLAYER_IMPORT_HANG_MS = 10_000;

const SinglePlayerView = nextDynamic(
  retryImport(() => import('@/components/singleplayer/SinglePlayerView'), {
    timeoutMs: SINGLEPLAYER_IMPORT_HANG_MS,
  }),
  {
    loading: LoadingFallback,
    ssr: false,
  },
);

/**
 * Single Player page route
 * Handles all single player game modes: Solo vs Bots, Practice, Challenge
 *
 * Wrapped in Suspense boundary to properly handle useSearchParams
 * which can cause "Rendered fewer hooks than expected" errors without it.
 * See: https://nextjs.org/docs/app/api-reference/functions/use-search-params
 *
 * Game client is not mounted until after first paint so the server LCP
 * shell can become FCP without waiting on Script Evaluation of the board.
 */
export default function SinglePlayerPageClient(): React.JSX.Element {
  const [hydrateGame, setHydrateGame] = useState(false);

  useEffect(() => {
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setHydrateGame(true));
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, []);

  if (!hydrateGame) {
    return <LoadingFallback />;
  }

  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <SinglePlayerView />
      </Suspense>
    </ChunkErrorBoundary>
  );
}
