import { describe, it, expect } from 'vitest';
import { fromSpResults, toBlastResultsView } from '@/components/blast/results/blastResultsViewModel';
import type { BlastResultsData } from '@/components/blast/legacy/types';

const oldRecord = {
  finalScore: 820,
  wordsFound: ['CAT', 'DOGS'],
  maxCombo: 2,
  clearPercentage: 40,
  tilesCleared: 14,
  totalTiles: 36,
  wavesCompleted: 2,
  waveResults: [],
  previousBest: 600,
} as unknown as BlastResultsData;

describe('results built from records that predate weekly rank', () => {
  it('renders with no rank block when the fields are absent', () => {
    const view = toBlastResultsView(fromSpResults(oldRecord));
    expect(view.rank).toBeNull();
    expect(view.score).toBe(820);
  });

  it('renders with no rank block or rival goal when the server sent nulls', () => {
    const view = toBlastResultsView(fromSpResults({ ...oldRecord, rank: null, previousRank: null, totalPlayers: null, rival: null }));
    expect(view.rank).toBeNull();
    expect(view.nextGoal?.kind).not.toBe('rival');
  });

  it('shows a rank with no movement arrow on a first ranked run', () => {
    const view = toBlastResultsView(fromSpResults({ ...oldRecord, rank: 4, previousRank: null, totalPlayers: 30 }));
    expect(view.rank).toEqual({ current: 4, total: 30, delta: null });
  });
});
