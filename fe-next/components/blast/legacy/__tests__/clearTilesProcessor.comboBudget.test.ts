/**
 * Combo clears must obey the SAME chain-clear budget as bomb/lightning chains.
 *
 * Bug ("blast all the board for no reason or animation"): combo effects were
 * invoked with the RAW markCleared closure, bypassing chainBudget entirely — so
 * `prism_prism` (and any board-wide combo) wiped every tile at once, exceeding the
 * codebase's own "never clear more than ~half the board" invariant and swamping
 * the FX layer so the clear looked instant/unanimated.
 */
import { describe, it, expect } from 'vitest';
import { processTilesForWord } from '../utils/clearTilesProcessor';
import type { BlastTileState } from '@/shared/types/blast';
import { BLAST_MAX_CHAIN_CLEAR_FRACTION, BLAST_MIN_CHAIN_CLEAR_CAP } from '../types';

const GRID = 6;

function tile(row: number, col: number, type: BlastTileState['type'] = 'standard', overrides?: Partial<BlastTileState>): BlastTileState {
  return {
    uid: `${row}-${col}`,
    row, col, type,
    isCleared: false,
    activationEffect: null,
    hitsRemaining: 0,
    ...overrides,
  };
}

describe('combo clear budget', () => {
  it('prism_prism does NOT wipe the whole board — bounded by the chain-clear cap', () => {
    // All standard, except two adjacent prisms on the path → detects prism_prism.
    const prev = Array.from({ length: GRID }, (_, r) =>
      Array.from({ length: GRID }, (_, c) => tile(r, c)),
    );
    // Prisms on their FINAL hit so the combo clears rather than just cracking.
    prev[2][2] = tile(2, 2, 'prism', { hitsRemaining: 1 });
    prev[2][3] = tile(2, 3, 'prism', { hitsRemaining: 1 });
    const path = [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }];

    const res = processTilesForWord({
      prev, path, word: 'ABC', baseScore: 5, gridSize: GRID, currentWave: 12, rng: () => 0.5,
    });

    const maxCleared = Math.max(BLAST_MIN_CHAIN_CLEAR_CAP, Math.floor(GRID * GRID * BLAST_MAX_CHAIN_CLEAR_FRACTION));
    // The combo must fire (clears more than just the word path)…
    expect(res.newlyClearedCount).toBeGreaterThan(path.length);
    // …but MUST NOT clear the entire board…
    expect(res.newlyClearedCount).toBeLessThan(GRID * GRID);
    // …and stays within the shared chain-clear ceiling (+ the always-clearing word path).
    expect(res.newlyClearedCount).toBeLessThanOrEqual(maxCleared + path.length);
  });
});
