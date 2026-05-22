'use client';

import { memo } from 'react';

export interface WordCraftHandoffLabels {
  /** "Pass the device to {name}" — `{name}` is substituted with incomingName. */
  passTo: string;
  /** Sub-line reassuring that the previous player's rack is hidden. */
  tapReady: string;
  /** Start-turn button label. */
  start: string;
}

export interface WordCraftHandoffProps {
  incomingName: string;
  onReady: () => void;
  labels: WordCraftHandoffLabels;
}

/**
 * Pass-and-play hand-off curtain. A full-screen blocking overlay shown between
 * turns in hot-seat mode so the incoming human can't see the outgoing human's
 * rack. Pink (multiplayer) accent per the design system.
 */
function WordCraftHandoffImpl({ incomingName, onReady, labels }: WordCraftHandoffProps) {
  const heading = labels.passTo.replace('{name}', incomingName);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-neo-navy/95 texture-halftone p-6 text-center"
    >
      <div className="font-neo-display text-2xl sm:text-3xl font-black text-neo-pink drop-shadow-[2px_2px_0_rgba(0,0,0,0.9)]">
        {heading}
      </div>
      <p className="font-neo-body text-sm text-neo-cream/80 max-w-xs">{labels.tapReady}</p>
      <button
        type="button"
        onClick={onReady}
        autoFocus
        className="font-neo-display text-lg font-black text-neo-navy bg-neo-pink border-neo-thick border-black rounded-neo px-8 py-3 shadow-hard-lg active:shadow-hard-pressed active:translate-x-[1px] active:translate-y-[1px] animate-neo-pop"
      >
        {labels.start}
      </button>
    </div>
  );
}

export const WordCraftHandoff = memo(WordCraftHandoffImpl);
