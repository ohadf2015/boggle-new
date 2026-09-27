/**
 * useProgressSnapshot — the inputs for ProgressPulseCard.
 *
 * Snapshot is taken ONCE, in the lazy state initialiser, i.e. during the
 * results screen's first render — before useGameHistory's effect appends the
 * current game. That is what makes "prior scores" genuinely prior. Everything
 * is read defensively: history/stats live in localStorage and may be absent,
 * mocked away, or unreadable, and a missing snapshot must never break results.
 */
import { useState } from 'react';
import { getGameHistory } from '@/utils/gameHistoryManager';
import { getAggregateStats } from '@/utils/playerStats';
import { buildProgressSnapshot, type ProgressSnapshot } from '../progressSnapshot';
import type { SinglePlayerResultsData } from '../../SinglePlayerView';

function readPriorSoloScores(): number[] {
  try {
    const entries = getGameHistory().entries;
    return entries.filter((e) => e.mode === 'single').map((e) => e.score);
  } catch {
    return [];
  }
}

function readTotalGames(): number {
  try {
    return getAggregateStats().totalGames;
  } catch {
    return 0;
  }
}

export function useProgressSnapshot(results: SinglePlayerResultsData): ProgressSnapshot {
  const [snapshot] = useState<ProgressSnapshot>(() => {
    const wordsFound = results.playerWordData?.filter((w) => w.isValid).length ?? results.playerWords?.length ?? 0;
    return buildProgressSnapshot({
      score: results.playerScore,
      isNewHighScore: Boolean(results.isNewHighScore),
      previousHighScore: results.previousHighScore ?? null,
      priorScores: readPriorSoloScores(),
      totalGames: readTotalGames(),
      wordsFound,
      wordsPossible: results.allPossibleWords?.length ?? null,
    });
  });
  return snapshot;
}
