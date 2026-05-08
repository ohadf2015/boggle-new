'use client';

import { memo } from 'react';
import type { DragState } from './useWordCraftDrag';

export interface WordCraftDragGhostProps {
  drag: DragState | null;
  /** Pass active locale so :lang() typography rules engage on the ghost */
  locale?: string;
}

/**
 * Floating tile that follows the user's pointer during a drag-to-place.
 * Rendered into a viewport-fixed layer; pointer-events: none so the underlying
 * board cells still receive hover/move detection.
 */
function WordCraftDragGhostImpl({ drag, locale = 'en' }: WordCraftDragGhostProps) {
  if (!drag || !drag.active) return null;
  return (
    <div
      aria-hidden
      lang={locale}
      style={{
        position: 'fixed',
        left: drag.x,
        top: drag.y,
        transform: 'translate(-50%, -50%) rotate(-4deg) scale(1.15)',
        pointerEvents: 'none',
      }}
      className="z-50 w-14 h-16 sm:w-16 sm:h-[72px] rounded-neo border-neo-thick border-black bg-neo-lime text-neo-navy flex items-center justify-center shadow-hard-lg"
    >
      <span aria-hidden className="absolute inset-x-1.5 top-1 h-px bg-white/70" />
      <span className="wc-tile-glyph relative text-3xl sm:text-4xl">
        {drag.letter === '_' ? '·' : drag.letter}
      </span>
      <span className="absolute bottom-1 end-1.5 text-[10px] sm:text-[11px] opacity-60 font-bold tabular-nums">
        {drag.value}
      </span>
    </div>
  );
}

export const WordCraftDragGhost = memo(WordCraftDragGhostImpl);
