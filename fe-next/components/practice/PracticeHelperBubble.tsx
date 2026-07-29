'use client';

import { useEffect } from 'react';
import { Lightbulb, Hand } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HintStage, Cell } from '@/lib/practice/practiceHint';

interface Props {
  stage: HintStage;
  /** Board cell to spotlight when stage is 'reveal-tile' (the riddle answer's start). */
  hintCell?: Cell | null;
  className?: string;
}

/**
 * On-screen FTUE helper. Stays out of the way until the player stalls, then
 * escalates: 'nudge' teaches the drag gesture; 'reveal-tile' spotlights the
 * first tile of the (guaranteed-present) riddle answer — an always-correct
 * push toward a real word. The board cell is highlighted via the same
 * data-row/data-col hooks the live grid exposes.
 */
export default function PracticeHelperBubble({ stage, hintCell, className }: Props) {
  const { t } = useLanguage();
  useEffect(() => {
    if (stage !== 'reveal-tile' || !hintCell) return;
    const el = document.querySelector<HTMLElement>(
      `[data-row="${hintCell.row}"][data-col="${hintCell.col}"]`,
    );
    if (!el) return;
    el.classList.add('practice-hint-cell');
    return () => el.classList.remove('practice-hint-cell');
  }, [stage, hintCell]);

  if (stage === 'none') return null;

  // Only promise the "glowing tile" when there's actually a tile to glow —
  // otherwise fall back to the gesture nudge (defensive; the hint logic already
  // gates reveal on target availability).
  const isReveal = stage === 'reveal-tile' && !!hintCell;
  const Icon = isReveal ? Hand : Lightbulb;
  const message = isReveal ? 'practice.helper.reveal' : 'practice.helper.nudge';

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="practice-helper"
      className={
        className ??
        'mx-auto w-full max-w-md flex items-center gap-2 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-yellow text-neo-black shadow-hard-sm animate-neo-pop'
      }
    >
      <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-neo-black text-neo-yellow">
        <Icon className="w-4 h-4" aria-hidden />
      </span>
      <span className="font-neo-body text-sm font-bold leading-snug flex-1">
        {t(message)}
      </span>
    </div>
  );
}
