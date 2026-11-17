'use client';

import React from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

interface FeedbackLegendProps {
  t: (key: string) => string;
}

export const FeedbackLegend: React.FC<FeedbackLegendProps> = ({ t }) => (
  <AdaptiveMotion.div
    key="feedback-legend"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    className="flex items-center justify-center gap-2 mt-1 text-[10px] sm:text-xs"
    data-testid="clue-legend"
  >
    <span className="flex items-center gap-1">
      <span className="w-3 h-3 sm:w-4 sm:h-4 bg-emerald-400 rounded border border-neo-black"></span>
      <span className="text-neo-white">{t('wordHunt.feedback.correct')}</span>
    </span>
    <span className="flex items-center gap-1">
      <span className="w-3 h-3 sm:w-4 sm:h-4 bg-amber-400 rounded border border-neo-black"></span>
      <span className="text-neo-white">{t('wordHunt.feedback.wrongPlace')}</span>
    </span>
    <span className="flex items-center gap-1">
      <span className="w-3 h-3 sm:w-4 sm:h-4 bg-slate-500 rounded border border-neo-black"></span>
      <span className="text-neo-white">{t('wordHunt.feedback.notInWord')}</span>
    </span>
  </AdaptiveMotion.div>
);

interface KnownLettersDisplayProps {
  knownLetters: Set<string>;
  /** No clues revealed yet → prompt the player to spell board words. */
  noCluesYet?: boolean;
  /** The empty-state line. */
  cue: string;
  t: (key: string) => string;
}

export const KnownLettersDisplay: React.FC<KnownLettersDisplayProps> = ({ knownLetters, noCluesYet, cue, t }) => (
  <AdaptiveMotion.div
    key="known-letters"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    className="flex flex-col items-center gap-0.5 mt-0.5"
  >
    {/* Empty-state cue: the blank boxes don't explain themselves, so when no
        clue has been revealed yet we say HOW to reveal them — spell words on the
        grid. This is the in-context rule (tutorials get ignored). */}
    {noCluesYet && (
      <span
        data-testid="clue-empty-cue"
        className="text-[10px] sm:text-xs font-bold text-neo-cyan animate-pulse text-center leading-snug"
        role="status"
        aria-live="polite"
      >
        🔍 {cue}
      </span>
    )}
    {knownLetters.size > 0 && (
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-1 text-[10px] sm:text-xs"
      >
        <span className="text-amber-300 font-bold">
          {t('wordHunt.survival.knownLetters')}
        </span>
        <div className="flex gap-0.5">
          {Array.from(knownLetters).map((letter) => (
            <span
              key={letter}
              className="w-7 h-7 cramped:w-5 cramped:h-5 flex items-center justify-center bg-amber-400 border-2 border-neo-black rounded text-neo-black font-black text-sm cramped:text-xs"
            >
              {letter}
            </span>
          ))}
        </div>
      </AdaptiveMotion.div>
    )}
  </AdaptiveMotion.div>
);
