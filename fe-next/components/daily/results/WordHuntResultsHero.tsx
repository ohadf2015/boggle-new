'use client';

import React from 'react';
import { DailyResultsHero } from './DailyResultsHero';
import { MAX_ATTEMPTS } from '../survival/constants';
import type { WordHuntResult } from '@/utils/dailyChallenge/types';

export interface WordHuntResultsHeroProps {
  result: WordHuntResult;
  puzzleNumber: number;
  /** Fresh completion only: the one count-up + confetti of the finish. */
  celebrate: boolean;
  t: (key: string) => string;
  children?: React.ReactNode;
}

export function WordHuntResultsHero({ result, puzzleNumber, celebrate, t, children }: WordHuntResultsHeroProps) {
  return (
    <DailyResultsHero
      mode="word-hunt"
      outcome={result.solved ? 'win' : 'loss'}
      headline={t(result.solved ? 'daily.solved' : 'wordHunt.results.gameOver')}
      eyebrow={`#${puzzleNumber}`}
      score={result.efficiencyScore ?? 0}
      stats={[
        { value: `${result.attemptsUsed}/${MAX_ATTEMPTS}`, label: t('wordHunt.attempts') },
        { value: result.wordsDiscovered?.length ?? 0, label: t('wordHunt.results.wordsFound') },
        { value: Math.round(result.lifeRemaining ?? 0), label: t('wordHunt.score.lifeLeft') },
      ]}
      celebrate={celebrate}
    >
      {children}
    </DailyResultsHero>
  );
}

export default WordHuntResultsHero;
