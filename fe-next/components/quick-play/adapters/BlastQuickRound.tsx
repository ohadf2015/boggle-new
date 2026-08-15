'use client';

/**
 * Blast (legacy) quick-round wrapper. Uses mode="multiplayer" deliberately:
 * that arm is timer-era — no waves, no levels, no objectives, no lives/shop —
 * which is exactly the bare board quick play wants. MP mode expects the
 * PARENT to own the clock and the end-of-round, so this wrapper:
 *  - ticks remainingTime down from durationSec (and passes totalTime so HUD
 *    shows the countdown),
 *  - feeds a synthetic solo leaderboard so the MP score path doesn't stay 0
 *    (selectMyBlastScore returns 0 without username/LB),
 *  - tracks accepted words and scores them with the same canonical scoring
 *    the perfect total uses,
 *  - finishes on timer 0, dead-end, or board clear — whichever first.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { hashString } from '@/utils/dailyChallenge/prng';
import { calculateWordScore } from '@/shared/utils/scoring';
import { fromBlast } from './normalizeResult';
import { buildGhostRows } from '@/lib/quickPlay/ghostRivals';
import type { QuickRoundConfig, QuickRoundResult } from '../types';

const BlastGame = dynamic(
  () => import('@/components/blast/legacy/BlastGame').then((m) => m.BlastGame),
  { ssr: false }
);

/** Identity used for the synthetic solo leaderboard (HUD score path). */
export const BLAST_QUICK_SOLO_USERNAME = 'you';

interface BlastQuickRoundProps {
  config: QuickRoundConfig;
  onDone: (result: QuickRoundResult) => void;
  onQuit: () => void;
  /** Parity with other quick modes — BlastGame has no ModeCoach; accepted for contract tests. */
  hideModeCoach?: boolean;
}

export function BlastQuickRound({ config, onDone, onQuit }: BlastQuickRoundProps) {
  const [remaining, setRemaining] = useState(config.durationSec);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const wordsRef = useRef<string[]>([]);
  const doneRef = useRef(false);

  const liveScore = useMemo(
    () => foundWords.reduce((sum, w) => sum + calculateWordScore(w, 0), 0),
    [foundWords]
  );

  // Solo self-entry plus any ghost rivals. Blast's own standings strip
  // (BlastMPLeaderboard) and closest-rivals gap already read this exact prop in
  // real MP, so racing recent players needs no blast-side changes — just rows.
  const leaderboard = useMemo(
    () => [
      {
        username: BLAST_QUICK_SOLO_USERNAME,
        score: liveScore,
        wordCount: foundWords.length,
      },
      ...buildGhostRows(config.ghosts ?? [], {
        perfectScore: config.perfectScore,
        totalWords: config.totalWords,
        progress: config.durationSec > 0 ? 1 - remaining / config.durationSec : 0,
        selfUsername: BLAST_QUICK_SOLO_USERNAME,
      }),
    ],
    [
      liveScore,
      foundWords.length,
      remaining,
      config.ghosts,
      config.perfectScore,
      config.totalWords,
      config.durationSec,
    ]
  );

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
      // Required for BlastHUD to show the countdown (showTimer needs totalTime > 0).
      totalTime={config.durationSec}
      // Synthetic solo LB so MP displayScore path is non-zero without a server.
      username={BLAST_QUICK_SOLO_USERNAME}
      leaderboard={leaderboard}
      onWordWithComboType={(word: string) => {
        wordsRef.current.push(word);
        setFoundWords((prev) => [...prev, word]);
      }}
      onMPDeadEnd={() => finishRef.current()}
      onMPBoardCleared={() => finishRef.current()}
      onGameEnd={() => finishRef.current()}
      onQuit={onQuit}
    />
  );
}
