'use client';

import React, { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import StaticGameShell from './StaticGameShell';

const SinglePlayerView = nextDynamic(() => import('@/components/singleplayer/SinglePlayerView'), {
  loading: StaticGameShell,
  ssr: false,
});

export default function BoggleWordShakeGameClient(): React.JSX.Element {
  return (
    <Suspense fallback={<StaticGameShell />}>
      <SinglePlayerView />
    </Suspense>
  );
}
