'use client';

import React, { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { GameLoadingFallback } from '@/components/ui/GameLoadingFallback';

function LoadingFallback(): React.JSX.Element {
  return <GameLoadingFallback mascotVariant="spectating" />;
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
