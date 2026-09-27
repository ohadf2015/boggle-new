'use client';

/**
 * End of a level inside a run — no longer a plain modal:
 *  cleared  → coins + chest, then on into the next level's draft
 *  over     → RUN OVER recap, restart the world's run at level 1
 *  complete → boss down: RUN COMPLETE celebration + trophy skin
 */
import { useState } from 'react';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import type { RunMap } from '@/lib/adventure/play/runMap';
import type { RunResult as Result } from './useAdventureRun';
import { resultScreen, runSummary, runWordCount } from './run/runSummary';
import { readRunBest, readRunWords, recordRunBest, recordRunWords } from './runStorage';
import LevelCleared from './run/LevelCleared';
import RunOverScreen from './run/RunOverScreen';
import RunCompleteScreen from './run/RunCompleteScreen';

interface Props {
  world: number;
  isBoss?: boolean;
  result: Result;
  /** The run as it stood when this level started. */
  run?: PublicRun | null;
  /** The act map this run walked — the win ledger counts its node kinds. */
  map?: RunMap | null;
  /** Hearts left after this node (live — the run token's hp predates the fight). */
  hpLeft?: number;
  maxHp?: number;
  hasNext: boolean;
  onNext: () => void;
  /** Fresh run from the world's level 1. Falls back to onRetry. */
  onRestartRun?: () => void;
  onRetry: () => void;
  onMap: () => void;
  onEquipSkin: (world: number) => void;
}

export default function RunResult({ world, result, run = null, map = null, hpLeft, maxHp, hasNext, onNext, onRestartRun, onRetry, onMap, onEquipSkin }: Props) {
  const screen = resultScreen(result);
  // Fold this level's best word into the run's (idempotent: keeps the max).
  // Recorded once, then read back: `runWords` is the run-wide word count the
  // ledger scores, folded in the same pass as the best word so both screens see
  // this level included.
  const [{ runBest, runWords }] = useState(() => {
    recordRunBest(world, run?.step ?? 1, runSummary(run, result).bestWord);
    if (result.won) recordRunWords(world, run?.step ?? 1, result.validWords);
    // A LOST node banks nothing (the run is over, nothing will replay it), but
    // the words were still found — the ledger scored a death at zero words by
    // construction, which is why a first-node death used to close on one line.
    return { runBest: readRunBest(world), runWords: runWordCount(readRunWords(world), result) };
  });
  if (screen === 'complete') {
    return <RunCompleteScreen world={world} result={result} run={run} map={map} hpLeft={hpLeft} maxHp={maxHp} runWords={runWords} runBest={runBest} hasNext={hasNext} onNext={onNext} onMap={onMap} onEquipSkin={onEquipSkin} />;
  }
  if (screen === 'over') {
    return <RunOverScreen result={result} run={run} map={map} runWords={runWords} runBest={runBest} onRestartRun={onRestartRun ?? onRetry} onMap={onMap} />;
  }
  return <LevelCleared result={result} run={run} onNext={hasNext ? onNext : onMap} onMap={onMap} />;
}
