'use client';

import React, { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { PageLoader } from '@/components/ui/PageLoader';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';

function LoadingFallback(): React.JSX.Element {
  return (
    <div className="flex h-full relative">
      <PlayfulBackground intensity="medium" colorScheme="game" />
      <PageLoader size="lg" text="Loading Boggle Word Shake..." className="relative z-10" />
    </div>
  );
}

const SinglePlayerView = nextDynamic(() => import('@/components/singleplayer/SinglePlayerView'), {
  loading: LoadingFallback,
  ssr: false,
});

export default function BoggleWordShakeGameClient(): React.JSX.Element {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SinglePlayerView preset="standard" embedded />
    </Suspense>
  );
}
