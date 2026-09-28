'use client';

import React, { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { PageLoader } from '@/components/ui/PageLoader';
import { retryImport } from '@/utils/retryImport';
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary';

// Loading fallback matches SinglePlayerGame's fullscreen shell.
function LoadingFallback(): React.JSX.Element {
  // Match SinglePlayerGame's fullscreen shell (`fixed inset-0 z-[70] bg-neo-navy`).
  // The ssr:false game overlay used to mount over a flex loader, which was the
  // 0.073 CLS culprit on /singleplayer PSI (worst run 0.097).
  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-neo-navy"
      translate="no"
    >
      <PageLoader size="lg" text="Loading single player..." priority className="flex-1" />
    </div>
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
 */
export default function SinglePlayerPageClient(): React.JSX.Element {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <SinglePlayerView />
      </Suspense>
    </ChunkErrorBoundary>
  );
}
