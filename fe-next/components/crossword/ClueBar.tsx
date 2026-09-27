'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight, MoveHorizontal, MoveVertical } from 'lucide-react';
import type { Slot } from '@/lib/crossword/types';

/** Horizontal travel (px) before a drag counts as a clue swipe rather than a tap. */
const SWIPE_MIN_PX = 40;

export interface ClueBarProps {
  slot: Slot | null;
  rtl: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleDir: () => void;
  t: (key: string) => string;
}

export function ClueBar({ slot, rtl, onPrev, onNext, onToggleDir, t }: ClueBarProps) {
  // In RTL the "previous/next" chevrons point the natural reading way.
  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;
  const isAcross = slot?.dir === 'across';
  const dirLabel = slot ? t(`crossword.dir.${slot.dir}`) : '';
  // Axis icon makes the across/down state legible at a glance; the cyan chrome marks it as the
  // single interactive direction control (re-tapping a cell also flips, but that's not discoverable).
  const AxisIcon = isAcross ? MoveHorizontal : MoveVertical;

  // Swipe the clue to move between clues — the standard mobile crossword gesture, and the
  // fast way to reach an arbitrary clue now that the phone layout has no full clue list.
  // Direction follows reading order, so it matches the chevrons either way.
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const p = e.touches[0];
    swipeStart.current = p ? { x: p.clientX, y: p.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = swipeStart.current;
    const p = e.changedTouches[0];
    swipeStart.current = null;
    if (!start || !p) return;
    const dx = p.clientX - start.x;
    const dy = p.clientY - start.y;
    // Ignore taps and mostly-vertical drags so reading or scrolling never changes the clue.
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return;
    const forward = rtl ? dx > 0 : dx < 0;
    if (forward) onNext();
    else onPrev();
  };

  return (
    <div className="flex items-stretch gap-2 w-full max-w-[28rem] mx-auto">
      <button
        type="button"
        aria-label={t('crossword.prevClue')}
        onClick={onPrev}
        className="flex items-center justify-center w-11 bg-neo-cream text-neo-navy border-2 border-black rounded-none shadow-hard active:translate-y-[1px] active:shadow-hard-pressed"
      >
        <PrevIcon size={20} />
      </button>

      {/* Explicit, discoverable horizontal↔vertical toggle. */}
      <button
        type="button"
        aria-label={t('crossword.switchDir')}
        aria-pressed={!isAcross}
        title={t('crossword.switchDir')}
        onClick={onToggleDir}
        className="shrink-0 flex flex-col items-center justify-center gap-0.5 w-14 bg-neo-cyan text-neo-navy border-2 border-black rounded-none shadow-hard active:translate-y-[1px] active:shadow-hard-pressed"
      >
        <AxisIcon size={20} strokeWidth={2.5} aria-hidden />
        <span className="font-neo-display font-extrabold text-[0.6rem] uppercase leading-none">
          {dirLabel}
        </span>
      </button>

      {/* Clue display — read-only. Use the AxisIcon button (left) to toggle direction. */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="flex-1 flex items-center gap-2.5 px-3 py-2.5 bg-[#ffe9a8] text-neo-navy border-2 border-black rounded-none shadow-hard touch-pan-y"
      >
        {slot && (
          <span className="shrink-0 inline-flex items-center font-neo-display font-extrabold text-xs uppercase tracking-wide bg-neo-navy text-neo-cream rounded-none px-2 py-1">
            {slot.number}
          </span>
        )}
        {/* Clamped: an unbounded clue grew this bar to 3+ lines on narrow phones and
            stole that height straight off the board. */}
        <span className="font-neo-body font-semibold text-[0.95rem] leading-snug line-clamp-2">
          {slot?.clue || t('crossword.noClue')}
        </span>
      </div>

      <button
        type="button"
        aria-label={t('crossword.nextClue')}
        onClick={onNext}
        className="flex items-center justify-center w-11 bg-neo-cream text-neo-navy border-2 border-black rounded-none shadow-hard active:translate-y-[1px] active:shadow-hard-pressed"
      >
        <NextIcon size={20} />
      </button>
    </div>
  );
}
