import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/hooks/gameState';
import { applyBlastBoardUpdate } from '../applyBlastBoardUpdate';

const base = { grid: [['A']], tileStates: [[{ isCleared: false, powerUp: null }]], word: '', clearedCount: 0, totalMoves: 3 };

describe('applyBlastBoardUpdate', () => {
  beforeEach(() => useGameStore.setState({ blastBoardUpdate: null, blastTileOverlay: [], blastSeed: null } as never));

  it('hands the snapshot to the board', () => {
    applyBlastBoardUpdate({ ...base, clearedBy: 'ana', word: 'a' } as never);
    expect(useGameStore.getState().blastBoardUpdate?.clearedBy).toBe('ana');
  });

  it('adopts a regenerated overlay and seed', () => {
    const overlay = [{ row: 0, col: 0, type: 'jelly' }];
    applyBlastBoardUpdate({ ...base, clearedBy: '__board_regenerated__', overlay, seed: 9 } as never);
    expect(useGameStore.getState().blastSeed).toBe(9);
    expect(useGameStore.getState().blastTileOverlay).toEqual(overlay);
  });
});

describe('both seats apply server Blast boards through one path', () => {
  const read = (p: string) => readFileSync(resolve(__dirname, '../../..', p), 'utf8');

  it.each(['player/hooks/socket/usePlayerGameEvents.ts', 'host/hooks/socket/useHostGameEvents.ts'])(
    '%s listens for blastBoardUpdate with the shared handler',
    (file) => {
      const src = read(file);
      expect(src).toMatch(/socket\.on\('blastBoardUpdate', applyBlastBoardUpdate\)/);
      expect(src).toMatch(/socket\.off\('blastBoardUpdate', applyBlastBoardUpdate\)/);
    }
  );
});
