import React from 'react';
import { PageLoader } from './PageLoader';
import type { MascotVariant } from './mascotData';

interface GameLoadingFallbackProps {
  text?: string;
  mascotVariant?: MascotVariant;
}

/** Shared loading state for game modes and their lazy-loaded views; full height so the game swaps in without a jump. */
export function GameLoadingFallback({ text, mascotVariant }: GameLoadingFallbackProps): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col min-h-[100svh]">
      <PageLoader size="lg" text={text} mascotVariant={mascotVariant} />
    </div>
  );
}

export default GameLoadingFallback;
