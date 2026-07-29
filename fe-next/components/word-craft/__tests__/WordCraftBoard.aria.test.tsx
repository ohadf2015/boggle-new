import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WordCraftBoard } from '../WordCraftBoard';
import { createBoard } from '@/lib/word-craft/board';
import type { PlacedTile } from '@/lib/word-craft/types';

describe('WordCraftBoard — aria-label tile state for screen readers', () => {
  it('empty cell reads "empty"', () => {
    render(
      <WordCraftBoard
        board={createBoard(15)}
        pendingPlacements={[]}
        onCellClick={() => {}}
      />,
    );
    const cell = document.querySelector('[data-board-cell="0,0"]') as HTMLElement;
    expect(cell.getAttribute('aria-label')).toContain('empty');
  });

  it('pending cell announces letter and pending state', () => {
    const pending: PlacedTile[] = [
      { row: 7, col: 7, letter: 'A', value: 1, isBlank: false, rackTileId: 'r-1' },
    ];
    render(
      <WordCraftBoard
        board={createBoard(15)}
        pendingPlacements={pending}
        onCellClick={() => {}}
      />,
    );
    const cell = document.querySelector('[data-board-cell="7,7"]') as HTMLElement;
    const label = cell.getAttribute('aria-label') ?? '';
    expect(label).toContain('pending A');
  });

  it('placed cell announces letter and value', () => {
    const board = createBoard(15);
    board.cells[5][5].tile = { row: 5, col: 5, letter: 'Q', value: 10, isBlank: false, rackTileId: 'r-q' };
    render(
      <WordCraftBoard
        board={board}
        pendingPlacements={[]}
        onCellClick={() => {}}
      />,
    );
    const cell = document.querySelector('[data-board-cell="5,5"]') as HTMLElement;
    const label = cell.getAttribute('aria-label') ?? '';
    expect(label).toContain('letter Q');
    expect(label).toContain('value 10');
  });

  it('center cell announces "center start" on the empty first move', () => {
    render(
      <WordCraftBoard
        board={createBoard(15)}
        pendingPlacements={[]}
        onCellClick={() => {}}
        isFirstMove
      />,
    );
    const cell = document.querySelector('[data-board-cell="7,7"]') as HTMLElement;
    const label = cell.getAttribute('aria-label') ?? '';
    expect(label).toContain('center start');
  });

  it('center cell after first move no longer announces "center start"', () => {
    render(
      <WordCraftBoard
        board={createBoard(15)}
        pendingPlacements={[]}
        onCellClick={() => {}}
        isFirstMove={false}
      />,
    );
    const cell = document.querySelector('[data-board-cell="7,7"]') as HTMLElement;
    const label = cell.getAttribute('aria-label') ?? '';
    expect(label).not.toContain('center start');
  });
});
