'use client';

import dynamic from 'next/dynamic';

/**
 * Pixi touches `window` at import time, so the game must never be server
 * rendered. `ssr: false` is only legal inside a Client Component, which is what
 * this wrapper exists to provide — the same shape v1 uses.
 */
const WordTowerV2 = dynamic(() => import('@/components/wordTowerV2/WordTowerV2'), {
  ssr: false,
});

export function WordTowerV2PageClient() {
  return <WordTowerV2 />;
}
