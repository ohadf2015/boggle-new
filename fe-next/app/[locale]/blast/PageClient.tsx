'use client';

import React, { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { PageLoader } from '@/components/ui/PageLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';

function LoadingFallback(): React.JSX.Element {
  return (
    <div className="flex-1 flex items-center justify-center bg-neo-navy relative">
      <PlayfulBackground intensity="medium" colorScheme="game" />
      <div className="relative z-10">
        <PageLoader size="lg" text="Loading Blast Mode..." />
      </div>
    </div>
  );
}

const BlastEngineView = nextDynamic(
  () => import('@/components/blastEngine/BlastEngineView').then((m) => ({ default: m.BlastEngineView })),
  { loading: LoadingFallback, ssr: false },
);

export default function BlastPageClient(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BlastEngineView />
    </Suspense>
  );
}
