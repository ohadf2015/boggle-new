'use client';

import React, { Suspense, useEffect, useState } from 'react';
import nextDynamic from 'next/dynamic';
import { retryImport } from '@/utils/retryImport';
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary';
import { SpLcpSrcSwap } from '@/components/singleplayer/SpLcpSrcSwap';
import { hasPriorEngagement, onFirstEngagement } from '@/lib/perf/onFirstEngagement';

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
 * Single Player page route.
 *
 * The board chunk (~188KB gz, long tasks 200–300ms under PSI 4x CPU) used to
 * mount on two rAFs. That is inside the Lighthouse load window, so every cold
 * PSI run paid the parse. Gate on a real key/pointer instead: PSI never sends
 * one, so the chunk stays out of TBT. An in-app visit already set
 * sessionStorage `lc_engaged` on the previous page's click, so those loads
 * still start immediately after paint. The LCP swap is NOT gated — it must
 * run on first paint.
 */
export default function SinglePlayerPageClient(): React.JSX.Element {
  const [hydrateGame, setHydrateGame] = useState(false);

  useEffect(() => {
    if (hasPriorEngagement()) {
      setHydrateGame(true);
      return;
    }
    return onFirstEngagement(() => setHydrateGame(true));
  }, []);

  return (
    <>
      <SpLcpSrcSwap />
      {hydrateGame ? (
        <ChunkErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <SinglePlayerView />
          </Suspense>
        </ChunkErrorBoundary>
      ) : (
        <LoadingFallback />
      )}
    </>
  );
}
