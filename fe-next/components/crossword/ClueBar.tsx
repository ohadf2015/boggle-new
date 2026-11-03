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
    <div className="flex w-full items-stretch overflow-hidden rounded-neo border-neo border-black bg-[#ffe9a8] text-neo-navy shadow-hard">
      <button
        type="button"
        aria-label={t('crossword.prevClue')}
        onClick={onPrev}
        className="grid w-10 shrink-0 place-items-center border-e-2 border-black/70 active:bg-black/10"
      >
        <PrevIcon size={20} />
      </button>

      {/* Number + direction in ONE chip: it is the clue's label AND the across/down switch. */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="flex min-h-[3.25rem] min-w-0 flex-1 items-center gap-2.5 px-2.5 py-1.5 touch-pan-y"
      >
        <button
          type="button"
          aria-label={t('crossword.switchDir')}
          aria-pressed={!isAcross}
          title={t('crossword.switchDir')}
          onClick={onToggleDir}
          className="flex shrink-0 items-center gap-1 rounded-full bg-neo-navy px-2.5 py-1.5 font-neo-display text-xs font-extrabold uppercase leading-none text-neo-cyan active:translate-y-[1px]"
        >
          <AxisIcon size={14} strokeWidth={2.75} aria-hidden />
          {slot && <span className="tabular-nums">{slot.number}</span>}
          <span className="text-neo-cream">{dirLabel}</span>
        </button>
        {/* Clamped: an unbounded clue grew this bar to 3+ lines on narrow phones and
            stole that height straight off the board. */}
        <span className="font-neo-body text-[0.95rem] font-semibold leading-snug line-clamp-2 lg:text-base">
          {slot?.clue || t('crossword.noClue')}
        </span>
      </div>

      <button
        type="button"
        aria-label={t('crossword.nextClue')}
        onClick={onNext}
        className="grid w-10 shrink-0 place-items-center border-s-2 border-black/70 active:bg-black/10"
      >
        <NextIcon size={20} />
      </button>
    </div>
  );
}
