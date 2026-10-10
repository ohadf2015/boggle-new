'use client';

import React from 'react';
import type { LetterGrid } from '@/types';
import type { WordDiscovery } from '../types';
import { HuntBoard } from './HuntBoard';
import { HuntWordStage } from './HuntWordStage';
import type { HuntCell, HuntStageState } from './huntStage';

type TFn = (key: string, params?: Record<string, string | number> | string) => string;

export interface HuntPlayfieldProps {
  grid: LetterGrid;
  isGameOver: boolean;
  eliminatedLetters: Set<string>;
  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  stage: HuntStageState;
  onLive: (word: string) => void;
  onRelease: (word: string, path: HuntCell[]) => void;
  typedWord: string;
  feedbackMessage: string;
  discoveredWords: WordDiscovery[];
  calm: boolean;
  size?: 'phone' | 'desktop';
  t: TFn;
}

function rewardFor(word: string, discoveredWords: WordDiscovery[]): WordDiscovery | null {
  const upper = word.toUpperCase();
  return [...discoveredWords].reverse().find((d) => d.word.toUpperCase() === upper) ?? null;
}

export function HuntPlayfield({
  grid,
  isGameOver,
  eliminatedLetters,
  onWordSubmit,
  onWordChange,
  stage,
  onLive,
  onRelease,
  typedWord,
  feedbackMessage,
  discoveredWords,
  calm,
  size = 'phone',
  t,
}: HuntPlayfieldProps) {
  const typing = stage.phase === 'idle' && typedWord.length > 0;
  const phase = typing ? 'live' : stage.phase;
  const word = typing ? typedWord : stage.word;
  const reward = stage.verdict === 'good' ? rewardFor(stage.word, discoveredWords) : null;
  const points = reward ? reward.lifeGained : null;
  const coins = reward && reward.tokensGained > 0 ? reward.tokensGained : null;

  return (
    <div className="flex w-full flex-col items-center">
      <HuntWordStage
        phase={phase}
        word={word}
        verdict={stage.verdict}
        points={points}
        coins={coins}
        message={feedbackMessage}
        calm={calm}
        size={size}
        t={t as (key: string, params?: Record<string, string | number>) => string}
      />
      <HuntBoard
        grid={grid}
        interactive={!isGameOver}
        eliminatedLetters={eliminatedLetters}
        onWordSubmit={onWordSubmit}
        onWordChange={onWordChange}
        onLive={onLive}
        onRelease={onRelease}
        phase={stage.phase}
        verdict={stage.verdict}
        heldPath={stage.path}
        calm={calm}
        size={size}
        t={t as (key: string, fallback?: string) => string}
      />
    </div>
  );
}

export default HuntPlayfield;
