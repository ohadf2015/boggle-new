'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { BubblePopGame } from './BubblePopGame';
import { readBest } from './bubblePopLogic';

type T = (path: string, params?: Record<string, string | number>) => string;

interface WaitingGameDockProps {
  t: T;
  /** Applies to the open game panel; the chip always sizes to its label. */
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

/** "Play while you wait": a chip until the player opts in, then the game inline (never over the lobby's controls). */
export function WaitingGameDock({ t, className, onOpenChange }: WaitingGameDockProps) {
  const [open, setOpen] = useState(false);
  const [best, setBest] = useState(0);
  // localStorage is client-only: read after mount so SSR and hydration agree.
  useEffect(() => setBest(readBest()), []);

  const toggle = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  if (open) {
    return (
      <div className={className}>
        <BubblePopGame t={t} best={best} onBest={setBest} onClose={() => toggle(false)} />
      </div>
    );
  }
  return (
    <button
      type="button"
      data-testid="waiting-game-chip"
      onClick={() => toggle(true)}
      className={cn(
        'group inline-flex items-center gap-2 self-center h-10 ps-2 pe-3 rounded-full border-2 border-neo-black bg-neo-pink text-neo-black shadow-hard-sm',
        'font-neo-display text-sm font-bold transition-transform active:translate-x-px active:translate-y-px active:shadow-none',
        'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-white',
      )}
    >
      <span aria-hidden="true" className="relative w-7 h-6 shrink-0 transition-transform group-hover:-rotate-12">
        <i className="absolute start-0 bottom-0 w-4 h-4 rounded-full border-2 border-neo-black bg-neo-cyan" />
        <i className="absolute end-0 top-0 w-3.5 h-3.5 rounded-full border-2 border-neo-black bg-neo-lime" />
        <i className="absolute end-0.5 bottom-0 w-2 h-2 rounded-full border-2 border-neo-black bg-neo-yellow" />
      </span>
      <span>{t('lobby.fun.play')}</span>
      {best > 0 && (
        <span className="rounded-full bg-neo-black/80 px-2 py-0.5 text-[11px] text-neo-yellow tabular-nums">{t('lobby.fun.best', { score: best })}</span>
      )}
    </button>
  );
}
