'use client';

import React from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WheelFoundWordsProps {
  words: string[];
  /** The word just found; its tiles drop in and stay lime for a beat. */
  fresh: string | null;
  score: (word: string) => number;
  dir: 'ltr' | 'rtl';
  reducedMotion: boolean;
}

const DROP = { type: 'spring' as const, stiffness: 620, damping: 18 };

/** The haul so far, each word laid out in small tiles like a filled crossword slot. */
const WheelFoundWords: React.FC<WheelFoundWordsProps> = ({ words, fresh, score, dir, reducedMotion }) => (
  <div className="flex flex-wrap content-start gap-x-2.5 gap-y-2 overflow-y-auto pe-1 pt-1 flex-1 min-h-0">
    {words.map((word) => {
      const isFresh = word === fresh;
      return (
        <div
          key={word}
          data-testid="found-word"
          data-fresh={isFresh ? 'true' : 'false'}
          className="relative flex items-center h-fit"
        >
          <span dir={dir} className="flex gap-[2px] lg:gap-[3px]">
            {Array.from(word).map((ch, i) => (
              <m.span
                key={i}
                data-testid="found-word-tile"
                className={cn(
                  'w-5 h-6 lg:w-7 lg:h-8 flex items-center justify-center rounded-[4px] border-2 border-neo-black',
                  'font-neo-display font-black text-xs lg:text-sm uppercase leading-none',
                  isFresh ? 'bg-neo-lime text-neo-black shadow-[1px_2px_0_#000]' : 'bg-neo-cream text-neo-navy shadow-[1px_1px_0_#000]',
                )}
                initial={isFresh && !reducedMotion ? { y: -14, scale: 0, rotate: i % 2 ? 10 : -10 } : false}
                animate={{ y: 0, scale: 1, rotate: 0 }}
                transition={{ ...DROP, delay: isFresh ? 0.18 + i * 0.045 : 0 }}
              >
                {ch}
              </m.span>
            ))}
          </span>
          <span className="ms-1 lg:ms-2 font-neo-display font-black text-[11px] lg:text-sm text-neo-lime leading-none">
            +{score(word)}
          </span>
        </div>
      );
    })}
  </div>
);

export default WheelFoundWords;
