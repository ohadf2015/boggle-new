'use client';

import React from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import type { Language } from '@/types';

export const SOLVED_FLIP_STEP_MS = 90;
const SOLVED_FLIP_MS = 420;

export function solvedRowDurationMs(length: number): number {
  return Math.max(0, length - 1) * SOLVED_FLIP_STEP_MS + SOLVED_FLIP_MS;
}

export interface HuntSolvedRowProps {
  word: string;
  sizeClass: string;
  calm: boolean;
  language?: Language;
}

/** The hidden word's boxes turn over one by one to the solved word. */
export function HuntSolvedRow({ word, sizeClass, calm, language }: HuntSolvedRowProps) {
  const shown = language === 'he' ? applyHebrewFinalLetters(word) : word.toUpperCase();
  return (
    <div data-testid="hunt-solved-row" className="flex justify-center flex-nowrap gap-1.5 sm:gap-2.5 [perspective:600px]">
      {Array.from(shown).map((letter, i) => (
        <m.div
          key={`${i}-${letter}`}
          data-testid="hunt-solved-letter"
          data-flip={calm ? 'false' : 'true'}
          data-delay={i * SOLVED_FLIP_STEP_MS}
          initial={calm ? false : { rotateX: -90, scale: 0.9 }}
          animate={{ rotateX: 0, scale: [0.9, 1.12, 1] }}
          transition={{ delay: (i * SOLVED_FLIP_STEP_MS) / 1000, duration: SOLVED_FLIP_MS / 1000, ease: [0.3, 0.9, 0.3, 1] }}
          className={cn(
            'flex items-center justify-center border-2 rounded-neo font-black bg-emerald-400 border-neo-black text-neo-black',
            sizeClass,
          )}
        >
          {letter}
        </m.div>
      ))}
    </div>
  );
}

export default HuntSolvedRow;
