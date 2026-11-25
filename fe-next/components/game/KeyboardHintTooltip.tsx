'use client';

import { Keyboard } from 'lucide-react';
import { useTypeWordHint } from '@/lib/input/typedWordHint';

interface KeyboardHintTooltipProps {
  /** Words accepted so far this round; a rise right after a typed submit retires the hint. */
  acceptedCount: number;
  t: (key: string) => string;
}

/** Desktop-only pill: "just type the word, press Enter", until a typed word is accepted. */
export function KeyboardHintTooltip({ acceptedCount, t }: KeyboardHintTooltipProps) {
  const show = useTypeWordHint(acceptedCount);
  if (!show) return null;

  return (
    <div
      data-testid="type-word-hint"
      data-keyboard-speed-tip
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-neo border-2 border-neo-black bg-neo-cyan px-3 py-1.5 text-xs font-bold text-neo-black shadow-hard-sm"
    >
      <Keyboard className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t('keyboardHint.typeAndEnter')}</span>
    </div>
  );
}

export default KeyboardHintTooltip;
