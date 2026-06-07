'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  const dirLabel = slot ? t(`crossword.dir.${slot.dir}`) : '';

  return (
    <div className="flex items-stretch gap-2 w-full max-w-[34rem] mx-auto">
      <button
        type="button"
        aria-label={t('crossword.prevClue')}
        onClick={onPrev}
        className="flex items-center justify-center w-11 bg-neo-navy-light text-neo-white border-neo border-black rounded-neo shadow-hard active:translate-y-[1px]"
      >
        <PrevIcon size={20} />
      </button>

      <button
        type="button"
        onClick={onToggleDir}
        className="flex-1 flex items-center gap-2.5 px-3 py-2.5 bg-neo-cyan text-neo-navy border-neo border-black rounded-neo shadow-hard text-start active:translate-y-[1px] active:shadow-hard-pressed"
      >
        {slot && (
          <span className="shrink-0 inline-flex items-center font-neo-display font-extrabold text-xs uppercase tracking-wide bg-neo-navy text-neo-cyan rounded-md px-2 py-1">
            {slot.number}
            {dirLabel ? ` ${dirLabel}` : ''}
          </span>
        )}
        <span className="font-neo-body font-semibold text-[0.95rem] leading-snug">
          {slot?.clue || t('crossword.noClue')}
        </span>
      </button>

      <button
        type="button"
        aria-label={t('crossword.nextClue')}
        onClick={onNext}
        className="flex items-center justify-center w-11 bg-neo-navy-light text-neo-white border-neo border-black rounded-neo shadow-hard active:translate-y-[1px]"
      >
        <NextIcon size={20} />
      </button>
    </div>
  );
}
