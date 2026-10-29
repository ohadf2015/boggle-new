'use client';

import React from 'react';
import type { LetterGrid } from '@/types';
import type { WordDiscovery } from '../types';
import { HuntBoard } from './HuntBoard';
import { HuntWordStage } from './HuntWordStage';
import stageStyles from './HuntWordStage.module.css';
import { isGoodVerdict, type HuntCell, type HuntStageState } from './huntStage';
import type { LiveWordStore } from './liveWord';

type TFn = (key: string, params?: Record<string, string | number> | string) => string;

export interface HuntPlayfieldProps {
  grid: LetterGrid;
  isGameOver: boolean;
  eliminatedLetters: Set<string>;
  onWordSubmit: (word: string) => void;
  onWordChange?: (word: string, count: number) => void;
  stage: HuntStageState;
  liveWord?: LiveWordStore;
  onLive: (word: string) => void;
  onRelease: (word: string, path: HuntCell[]) => void;
  typedWord: string;
  feedbackMessage: string;
  discoveredWords: WordDiscovery[];
  calm: boolean;
  size?: 'phone' | 'desktop';
  stageOverlay?: React.ReactNode;
  t: TFn;
}

function rewardFor(word: string, discoveredWords: WordDiscovery[]): WordDiscovery | null {
  const upper = word.toUpperCase();
  return [...discoveredWords].reverse().find((d) => d.word.toUpperCase() === upper) ?? null;
}

function HuntPlayfieldInner({
  grid,
  isGameOver,
  eliminatedLetters,
  onWordSubmit,
  onWordChange,
  stage,
  liveWord,
  onLive,
  onRelease,
  typedWord,
  feedbackMessage,
  discoveredWords,
  calm,
  size = 'phone',
  stageOverlay,
  t,
}: HuntPlayfieldProps) {
  const typing =
    typedWord.length > 0 &&
    (stage.phase === 'idle' || (stage.phase === 'pending' && typedWord.toUpperCase() !== stage.word.toUpperCase()));
  const phase = typing ? 'live' : stage.phase;
  const word = typing ? typedWord : stage.word;
  const reward = isGoodVerdict(stage.verdict) ? rewardFor(stage.word, discoveredWords) : null;
  const points = reward ? reward.lifeGained : null;
  const coins = reward && reward.tokensGained > 0 ? reward.tokensGained : null;

  return (
    <div
      data-testid="hunt-playfield"
      data-size={size}
      className={`${stageStyles.field} flex w-full flex-1 min-h-0 flex-col items-center justify-center [container-type:size]`}
    >
      <div className="relative w-full shrink-0">
        {stageOverlay}
        <HuntWordStage
          phase={phase}
          word={word}
          verdict={stage.verdict}
          points={points}
          coins={coins}
          message={feedbackMessage}
          calm={calm}
          size={size}
          live={typing ? undefined : liveWord}
          t={t as (key: string, params?: Record<string, string | number>) => string}
        />
      </div>
      <div data-testid="hunt-board-box" className="w-[min(100cqw,calc(100cqh-var(--hunt-stage-h)))] shrink-0">
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
          t={t}
        />
      </div>
    </div>
  );
}

/** Memoised: the life drain re-renders the game screen every second, and none of it reaches the board. */
export const HuntPlayfield = React.memo(HuntPlayfieldInner);

export default HuntPlayfield;
