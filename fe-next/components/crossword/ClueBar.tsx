'use client';

import { ChevronLeft, ChevronRight, MoveHorizontal, MoveVertical } from 'lucide-react';
import type { Slot } from '@/lib/crossword/types';

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

  return (
    <div className="flex items-stretch gap-2 w-full max-w-[34rem] mx-auto">
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
        className="flex-1 flex items-center gap-2.5 px-3 py-2.5 bg-[#ffe9a8] text-neo-navy border-2 border-black rounded-none shadow-hard"
      >
        {slot && (
          <span className="shrink-0 inline-flex items-center font-neo-display font-extrabold text-xs uppercase tracking-wide bg-neo-navy text-neo-cream rounded-none px-2 py-1">
            {slot.number}
          </span>
        )}
        <span className="font-neo-body font-semibold text-[0.95rem] leading-snug">
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
