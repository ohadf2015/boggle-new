'use client';

import { memo } from 'react';
import type { DragState } from './useWordCraftDrag';

export interface WordCraftDragGhostProps {
  drag: DragState | null;
  /**
   * Callback ref from useWordCraftDrag — the hook writes the live pointer
   * position onto this wrapper as a translate3d transform on each
   * pointermove (rAF-batched), so following the finger costs ZERO React
   * re-renders. React only re-renders this component on begin/end,
   * activation flip, and hover-cell crossings.
   */
  ghostRef: (el: HTMLDivElement | null) => void;
  /** Pass active locale so :lang() typography rules engage on the ghost */
  locale?: string;
}

/**
 * Lift offsets keep the dragged tile clear of the thumb on touch devices
 * (~23 mm above contact) and a smaller bump on mouse/pen so cursor reads
 * naturally near the artwork.
 */
const LIFT_OFFSET_PX: Record<DragState['pointerType'], number> = {
  touch: 88,
  pen: 56,
  mouse: 40,
};

/**
 * Floating tile that follows the user's pointer during a drag-to-place.
 * Two layers: the OUTER wrapper is positioned imperatively by the drag hook
 * (absolute translate3d at the pointer); the INNER tile owns all the visual
 * styling (centering, lift, rotate, scale, transitions).
 * pointer-events: none so the underlying board cells still receive the drop.
 */
function WordCraftDragGhostImpl({ drag, ghostRef, locale = 'en' }: WordCraftDragGhostProps) {
  if (!drag) return null;
  const baseLift = LIFT_OFFSET_PX[drag.pointerType] ?? LIFT_OFFSET_PX.mouse;
  // Short viewports (landscape phones, ~568 px) would float the 88 px touch
  // ghost off-screen at the top — player can no longer see the cell they're
  // targeting. Clamp to a quarter of the viewport height with a 32 px floor.
  const viewportH = typeof window === 'undefined' ? 800 : window.innerHeight;
  const lift = Math.max(32, Math.min(baseLift, Math.floor(viewportH / 4)));
  const locked = drag.hoverCell !== null;
  // Pre-threshold ghost (drag started, finger hasn't moved past 4-6 px yet).
  // Renders smaller, semi-opaque, no lift — gives instant "you grabbed it"
  // feedback so the first ~100 ms of touch isn't dead. Promotes to the
  // full lifted ghost the moment activate flips.
  const pre = !drag.active;
  return (
    <div
      ref={ghostRef}
      aria-hidden
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        // Initial paint at the drag-start point; the hook overwrites this
        // transform imperatively on every subsequent pointermove.
        transform: `translate3d(${drag.x}px, ${drag.y}px, 0)`,
        willChange: 'transform',
        pointerEvents: 'none',
      }}
      className="z-50"
    >
      <div
        lang={locale}
        data-drag-locked={locked ? 'true' : undefined}
        data-drag-pre={pre ? 'true' : undefined}
        style={{
          transform: pre
            ? 'translate(-50%, -50%) rotate(-2deg) scale(0.85)'
            : `translate(-50%, calc(-50% - ${lift}px)) rotate(-4deg) scale(${locked ? 1.22 : 1.15})`,
          opacity: pre ? 0.5 : 1,
          transition: 'transform 120ms ease-out, opacity 100ms linear',
        }}
        className="w-14 h-16 sm:w-16 sm:h-[72px] rounded-neo border-neo-thick border-black bg-neo-lime text-neo-navy flex items-center justify-center shadow-hard-lg"
      >
        <span aria-hidden className="absolute inset-x-1.5 top-1 h-px bg-white/70" />
        <span className="wc-tile-glyph relative text-3xl sm:text-4xl">
          {drag.letter === '_' ? '·' : drag.letter}
        </span>
        <span className="absolute bottom-1 end-1.5 text-[10px] sm:text-[11px] opacity-60 font-bold tabular-nums">
          {drag.value}
        </span>
      </div>
    </div>
  );
}

export const WordCraftDragGhost = memo(WordCraftDragGhostImpl);
