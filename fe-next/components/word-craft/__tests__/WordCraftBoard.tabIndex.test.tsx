import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WordCraftBoard } from '../WordCraftBoard';
import { createBoard } from '@/lib/word-craft/board';
import type { PlacedTile } from '@/lib/word-craft/types';

describe('WordCraftBoard — roving tabindex (desktop keyboard nav)', () => {
  function tabbableCount(): number {
    return document.querySelectorAll('[data-board-cell][tabindex="0"]').length;
  }
  function tabbableKey(): string | null {
    const el = document.querySelector('[data-board-cell][tabindex="0"]') as HTMLElement | null;
    return el?.dataset.boardCell ?? null;
  }

  it('with no reticle, exactly one cell is tabbable and it is the center', () => {
    render(
      <WordCraftBoard
        board={createBoard(15)}
        pendingPlacements={[]}
        onCellClick={() => {}}
      />,
    );
    expect(tabbableCount()).toBe(1);
    expect(tabbableKey()).toBe('7,7');
  });

  it('reticle set on (3, 5) makes that cell the sole tab anchor', () => {
    render(
      <WordCraftBoard
        board={createBoard(15)}
        pendingPlacements={[]}
        onCellClick={() => {}}
        reticle={{ row: 3, col: 5 }}
      />,
    );
    expect(tabbableCount()).toBe(1);
    expect(tabbableKey()).toBe('3,5');
  });

  it('if center is occupied and no reticle, the first empty row-major cell takes the anchor', () => {
    const board = createBoard(15);
    board.cells[7][7].tile = { row: 7, col: 7, letter: 'A', value: 1, isBlank: false, rackTileId: 'r-a' };
    render(
      <WordCraftBoard
        board={board}
        pendingPlacements={[]}
        onCellClick={() => {}}
      />,
    );
    expect(tabbableCount()).toBe(1);
    expect(tabbableKey()).toBe('0,0');
  });

  it('pending tiles do not block the anchor — only fully-placed tiles do', () => {
    const pending: PlacedTile[] = [
      { row: 7, col: 7, letter: 'A', value: 1, isBlank: false, rackTileId: 'r-a' },
    ];
    render(
      <WordCraftBoard
        board={createBoard(15)}
        pendingPlacements={pending}
        onCellClick={() => {}}
      />,
    );
    expect(tabbableCount()).toBe(1);
    // center still empty per board.cells.tile (pending lives outside the
    // committed board), so center remains the anchor.
    expect(tabbableKey()).toBe('7,7');
  });
});
