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

// Calm, dark chips that mirror the daily-challenge found-words language
// (bg-neo-navy-light surface, white text) instead of full-saturation fills.
// Status is encoded by a subtle tinted border + a small accent on the score
// so the list reads as a quiet log, not a distracting rave. Each chip is a
// fixed height so the row never looks ragged. `translate="no"` keeps browser
// auto-translation (e.g. Indonesian turning the letters "I" into "saya") from
// rewriting the player's own words.
const CHIP_TONE: Record<WordEntry['kind'], { chip: string; score: string }> = {
  locked: { chip: 'bg-neo-lime/15 border-neo-lime', score: 'text-neo-lime' },
  closed: { chip: 'bg-neo-navy-light border-neo-black', score: 'text-neo-cyan' },
  stolen: { chip: 'bg-neo-pink/15 border-neo-pink', score: 'text-neo-pink' },
  'stolen-from-me': { chip: 'bg-neo-red/10 border-neo-red text-neo-white/50 line-through', score: 'text-neo-red/70' },
};

export const MyWordsChips: React.FC<MyWordsChipsProps> = ({ words, dir = 'ltr' }) => {
  // Always render a fixed-height slot so the wheel cluster's `flex-1
  // justify-center` doesn't re-center when the first chip lands. Empty
  // state is silent — no header/placeholder, just reserved space.
  return (
    <div
      dir={dir}
      translate="no"
      data-testid="my-words-slot"
      className="notranslate h-16 overflow-y-auto flex flex-wrap content-start gap-1.5 justify-center"
    >
      {words.slice(0, 20).map((w) => {
        const tone = CHIP_TONE[w.kind];
        return (
          <span
            key={w.word}
            data-kind={w.kind}
            dir={dir}
            className={cn(
              'inline-flex items-center h-7 px-2.5 rounded-neo border-2 text-neo-white text-xs font-semibold whitespace-nowrap shadow-hard-xs',
              tone.chip,
            )}
          >
            {w.word}
            {w.score ? <span className={cn('ms-1 font-black', tone.score)}>+{w.score}</span> : null}
          </span>
        );
      })}
    </div>
  );
};
