import { describe, it, expect } from 'vitest';
import {
  initBlastModeState,
  getOrInitPlayerBoard,
  cascadeBlastWord,
  recordBlastCollection,
} from '../blastModeManager';
import { blastMode } from '../../modes/blast';
import { BLAST_COIN_POINTS, BLAST_DIAMOND_POINTS } from '@/shared/utils/blastCollectionScore';
import type { GameState } from '@/shared/types/game';

const GRID = [
  ['C', 'A', 'T', 'S'],
  ['D', 'O', 'G', 'S'],
  ['B', 'I', 'N', 'S'],
  ['M', 'A', 'T', 'S'],
];

function plainState() {
  const state = initBlastModeState(GRID, ['alice', 'bob'], 1, 7);
  for (const name of ['alice', 'bob']) {
    const board = getOrInitPlayerBoard(state, name);
    for (const row of board.tileStates) for (const t of row) t.type = 'standard';
  }
  return state;
}

describe('MP blast collection', () => {
  it('counts coins the cascade cleared, including ones a bomb caught', () => {
    const state = plainState();
    const board = getOrInitPlayerBoard(state, 'alice');
    board.tileStates[0][0].type = 'gold';
    board.tileStates[0][1].type = 'bomb';
    board.tileStates[1][2].type = 'gold';
    const result = cascadeBlastWord(board, [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], 'cat', 1, 'en');
    expect(result.coinsCollected).toBe(2);
  });

  it('records coins, diamonds and bombs and returns the points this word earned', () => {
    const state = plainState();
    const points = recordBlastCollection(state, 'alice', { coins: 2, diamonds: 1, bombs: 1 });
    recordBlastCollection(state, 'alice', { coins: 1, diamonds: 0, bombs: 0 });
    expect(points).toBe(2 * BLAST_COIN_POINTS + BLAST_DIAMOND_POINTS);
    expect(state.playerStats.alice).toMatchObject({ coinsCollected: 3, diamondsCollected: 1, gemsCollected: 1, bombsPopped: 1 });
  });

  it('puts each player\'s collection breakdown on the results summary', () => {
    const state = plainState();
    recordBlastCollection(state, 'alice', { coins: 2, diamonds: 1, bombs: 0 });
    const summary = blastMode.resultsSummary!({ blastModeState: state } as unknown as GameState) as {
      blastSummary: { collection: Record<string, { total: number; breakdown: { coins: { count: number } } }> };
    };
    expect(summary.blastSummary.collection.alice.total).toBe(2 * BLAST_COIN_POINTS + BLAST_DIAMOND_POINTS);
    expect(summary.blastSummary.collection.alice.breakdown.coins.count).toBe(2);
    expect(summary.blastSummary.collection.bob.total).toBe(0);
  });
});
