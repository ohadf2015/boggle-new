'use client';

/**
 * End of a level inside a run — no longer a plain modal:
 *  cleared  → coins + chest, then on into the next level's draft
 *  over     → RUN OVER recap, restart the world's run at level 1
 *  complete → boss down: RUN COMPLETE celebration + trophy skin
 */
import { useState } from 'react';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import type { RunResult as Result } from './useAdventureRun';
import { resultScreen, runSummary } from './run/runSummary';
import { readRunBest, recordRunBest, recordRunWords } from './runStorage';
import LevelCleared from './run/LevelCleared';
import RunOverScreen from './run/RunOverScreen';
import RunCompleteScreen from './run/RunCompleteScreen';

interface Props {
  world: number;
  isBoss?: boolean;
  result: Result;
  /** The run as it stood when this level started. */
  run?: PublicRun | null;
  hasNext: boolean;
  onNext: () => void;
  /** Fresh run from the world's level 1. Falls back to onRetry. */
  onRestartRun?: () => void;
  onRetry: () => void;
  onMap: () => void;
  onEquipSkin: (world: number) => void;
}

export default function RunResult({ world, result, run = null, hasNext, onNext, onRestartRun, onRetry, onMap, onEquipSkin }: Props) {
  const screen = resultScreen(result);
  // Fold this level's best word into the run's (idempotent: keeps the max).
  const [runBest] = useState(() => {
    recordRunBest(world, run?.step ?? 1, runSummary(run, result).bestWord);
    if (result.won) recordRunWords(world, run?.step ?? 1, result.validWords);
    return readRunBest(world);
  });
  if (screen === 'complete') {
    return <RunCompleteScreen world={world} result={result} run={run} runBest={runBest} hasNext={hasNext} onNext={onNext} onMap={onMap} onEquipSkin={onEquipSkin} />;
  }
  if (screen === 'over') {
    return <RunOverScreen result={result} run={run} runBest={runBest} onRestartRun={onRestartRun ?? onRetry} onMap={onMap} />;
  }
  return <LevelCleared result={result} run={run} onNext={hasNext ? onNext : onMap} onMap={onMap} />;
}
