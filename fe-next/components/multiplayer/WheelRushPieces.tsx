'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface WordEntry {
  word: string;
  kind: 'locked' | 'stolen' | 'closed' | 'stolen-from-me';
  score?: number;
  lockUntil?: number;
  stolenFrom?: string;
  ts: number;
}

interface MyWordsChipsProps {
  words: WordEntry[];
  /** Text direction for the words, driven by the GAME language (not the UI
   *  locale) so English words read LTR even for a Hebrew-UI player. */
  dir?: 'rtl' | 'ltr';
}

export const MyWordsChips: React.FC<MyWordsChipsProps> = ({ words, dir = 'ltr' }) => {
  // Always render a fixed-height slot so the wheel cluster's `flex-1
  // justify-center` doesn't re-center when the first chip lands. Empty
  // state is silent — no header/placeholder, just reserved space.
  return (
    <div
      dir={dir}
      data-testid="my-words-slot"
      className="h-16 overflow-y-auto flex flex-wrap gap-1.5 justify-center"
    >
      {words.slice(0, 20).map((w, i) => (
        <span
          key={`${w.word}-${i}`}
          data-kind={w.kind}
          dir={dir}
          className={cn(
            'px-2 py-0.5 rounded border-2 border-neo-black text-xs font-neo-body font-bold',
            w.kind === 'stolen-from-me' ? 'bg-neo-red text-neo-white line-through' :
            w.kind === 'stolen' ? 'bg-neo-pink text-neo-white' :
            w.kind === 'closed' ? 'bg-neo-cyan text-neo-black' :
            'bg-neo-lime text-neo-black',
          )}
        >
          {w.word}{w.score ? ` +${w.score}` : ''}
        </span>
      ))}
    </div>
  );
};
