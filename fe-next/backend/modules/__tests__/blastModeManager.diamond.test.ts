import { describe, it, expect } from 'vitest';
import {
  initBlastModeState,
  getOrInitPlayerBoard,
  cascadeBlastWord,
  getTilesOnBoardPath,
  recordBlastCollection,
} from '../blastModeManager';
import { processTilesForWord } from '@/components/blast/legacy/utils/clearTilesProcessor';
import { createSeededRandom } from '@/components/blast/legacy/utils/blastLetterGenerator';

const GRID = [
  ['Q', 'U', 'A', 'R', 'T', 'Z'],
  ['E', 'S', 'T', 'O', 'N', 'E'],
  ['L', 'I', 'N', 'E', 'A', 'R'],
  ['M', 'O', 'S', 'T', 'L', 'Y'],
  ['P', 'A', 'R', 'K', 'E', 'D'],
  ['H', 'O', 'U', 'S', 'E', 'S'],
];
const TOP_ROW = GRID[0].map((_, col) => ({ row: 0, col }));

function plainBoard() {
  const state = initBlastModeState(GRID, ['alice'], 1, 99);
  const board = getOrInitPlayerBoard(state, 'alice');
  for (const row of board.tileStates) for (const t of row) t.type = 'standard';
  return { state, board };
}

describe('MP blast diamonds', () => {
  it('spawns the same diamonds on the server as the client predicts for the same seed and move', () => {
    const { board } = plainBoard();
    const clientPrediction = processTilesForWord({
      prev: board.tileStates,
      path: TOP_ROW,
      word: 'quartz',
      baseScore: 5,
      gridSize: 6,
      currentWave: 1,
      rng: createSeededRandom(board.seed + 1),
    });
    const predictedUids = clientPrediction.next.flat().filter(t => t.type === 'diamond').map(t => t.uid).sort();

    cascadeBlastWord(board, TOP_ROW, 'quartz', 1, 'en');

    const serverUids = board.tileStates.flat().filter(t => t.type === 'diamond' && !t.isCleared).map(t => t.uid).sort();
    expect(predictedUids).toHaveLength(2);
    expect(serverUids).toEqual(predictedUids);
  });

  it('reports diamonds collected by the cascade', () => {
    const { board } = plainBoard();
    board.tileStates[0][1].type = 'diamond';
    const result = cascadeBlastWord(board, TOP_ROW.slice(0, 3), 'qua', 1, 'en');
    expect(result.diamondsCollected).toBe(1);
  });

  it('reports bombs popped by the cascade, chains included', () => {
    const { board } = plainBoard();
    board.tileStates[0][1].type = 'bomb';
    board.tileStates[1][2].type = 'bomb';
    const result = cascadeBlastWord(board, TOP_ROW.slice(0, 3), 'qua', 1, 'en');
    expect(result.bombsPopped).toBe(2);
  });

  it('accumulates bombs popped in player stats', () => {
    const { state } = plainBoard();
    recordBlastCollection(state, 'alice', { coins: 0, diamonds: 0, bombs: 2 });
    recordBlastCollection(state, 'alice', { coins: 0, diamonds: 0, bombs: 1 });
    expect(state.playerStats.alice.bombsPopped).toBe(3);
  });

  it('reads tile types from the live board, so a diamond spawned mid-round is scored', () => {
    const { board } = plainBoard();
    board.tileStates[2][3].type = 'diamond';
    expect(getTilesOnBoardPath(board.tileStates, [{ row: 2, col: 3 }, { row: 2, col: 4 }])).toEqual(['diamond', 'standard']);
  });

  it('accumulates diamonds collected in player stats', () => {
    const { state } = plainBoard();
    recordBlastCollection(state, 'alice', { coins: 0, diamonds: 1, bombs: 0 });
    recordBlastCollection(state, 'alice', { coins: 0, diamonds: 2, bombs: 0 });
    expect(state.playerStats.alice.diamondsCollected).toBe(3);
  });
});
