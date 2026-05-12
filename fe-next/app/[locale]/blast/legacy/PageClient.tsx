'use client';

import React, { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { PageLoader } from '@/components/ui/PageLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';

function LoadingFallback(): React.JSX.Element {
  return (
    <div className="flex-1 flex relative">
      <PlayfulBackground intensity="medium" colorScheme="game" />
      <PageLoader size="lg" text="Loading Blast Mode..." mascotVariant="bomber" className="relative z-10" />
    </div>
  );
}

const BlastView = nextDynamic(
  () => import('@/components/blast/legacy/BlastView').then((m) => ({ default: m.BlastView })),
  { loading: LoadingFallback, ssr: false },
);

export default function BlastPageClient(): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Suspense fallback={<LoadingFallback />}>
        <BlastView />
      </Suspense>
    </div>
  );
}
