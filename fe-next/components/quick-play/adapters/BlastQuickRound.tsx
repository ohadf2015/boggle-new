'use client';

/**
 * Blast (legacy) quick-round wrapper. Uses mode="multiplayer" deliberately:
 * that arm is timer-era — no waves, no levels, no objectives, no lives/shop —
 * which is exactly the bare board quick play wants. MP mode expects the
 * PARENT to own the clock and the end-of-round, so this wrapper:
 *  - ticks remainingTime down from durationSec,
 *  - tracks accepted words (onWordWithComboType) and scores them with the
 *    same canonical scoring the perfect total uses,
 *  - finishes on timer 0, dead-end, or board clear — whichever first.
 */
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { hashString } from '@/utils/dailyChallenge/prng';
import { calculateWordScore } from '@/shared/utils/scoring';
import { fromBlast } from './normalizeResult';
import type { QuickRoundConfig, QuickRoundResult } from '../types';

const BlastGame = dynamic(
  () => import('@/components/blast/legacy/BlastGame').then((m) => m.BlastGame),
  { ssr: false }
);

interface BlastQuickRoundProps {
  config: QuickRoundConfig;
  onDone: (result: QuickRoundResult) => void;
  onQuit: () => void;
  /** Parity with other quick modes — BlastGame has no ModeCoach; accepted for contract tests. */
  hideModeCoach?: boolean;
}

export function BlastQuickRound({ config, onDone, onQuit }: BlastQuickRoundProps) {
  const [remaining, setRemaining] = useState(config.durationSec);
  const wordsRef = useRef<string[]>([]);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    const words = wordsRef.current;
    const score = words.reduce((sum, w) => sum + calculateWordScore(w, 0), 0);
    onDone(fromBlast({ score, wordsFound: words }, config));
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          finishRef.current();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <BlastGame
      config={{
        gridSize: config.grid.length || 6,
        specialTileChance: 0.12,
        language: config.language as never,
        // Bare board: cleared tiles stay cleared, matching the sibling
        // multiplayer implementations (BlastView, useBlastMultiplayerBridge).
        // Without this the engine defaults to refill, so the board never
        // empties and cleared tiles are immediately replaced by new ones.
        boardClearMode: 'shrink',
      }}
      mode="multiplayer"
      serverGrid={config.grid as never}
      blastSeed={hashString(config.seed)}
      remainingTime={remaining}
      onWordWithComboType={(word: string) => {
        wordsRef.current.push(word);
      }}
      onMPDeadEnd={() => finishRef.current()}
      onMPBoardCleared={() => finishRef.current()}
      onGameEnd={() => finishRef.current()}
      onQuit={onQuit}
    />
  );
}
