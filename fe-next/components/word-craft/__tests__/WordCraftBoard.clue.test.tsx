import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WordCraftBoard } from '../WordCraftBoard';
import { createBoard, placeTiles } from '@/lib/word-craft/board';

const tile = (row: number, col: number, letter: string) => ({ row, col, letter, value: 1, isBlank: false, rackTileId: `b${row}${col}` });

describe('WordCraftBoard — clue path', () => {
  it('Given a clue, When rendered, Then empty path cells are marked with a ghost letter and board letters are marked as the anchor', () => {
    const board = createBoard(11);
    placeTiles(board, [tile(5, 5, 'A')]);
    render(
      <WordCraftBoard
        board={board}
        pendingPlacements={[]}
        onCellClick={() => {}}
        clue={{
          cells: [
            { row: 5, col: 4, letter: 'C' },
            { row: 5, col: 5, letter: 'A' },
            { row: 5, col: 6, letter: 'T' },
          ],
          anchors: [{ row: 5, col: 5, letter: 'A' }],
        }}
      />,
    );
    const path = document.querySelectorAll('[data-clue="path"]');
    expect(Array.from(path).map((el) => (el as HTMLElement).dataset.boardCell)).toEqual(['5,4', '5,6']);
    expect(path[0].textContent).toBe('C');
    const anchor = document.querySelector('[data-clue="anchor"]') as HTMLElement;
    expect(anchor.dataset.boardCell).toBe('5,5');
  });

  it('Given a pending tile already on a clue cell, Then the pending letter wins over the ghost', () => {
    render(
      <WordCraftBoard
        board={createBoard(11)}
        pendingPlacements={[tile(5, 4, 'X')]}
        onCellClick={() => {}}
        clue={{ cells: [{ row: 5, col: 4, letter: 'C' }], anchors: [] }}
      />,
    );
    const cell = document.querySelector('[data-board-cell="5,4"]') as HTMLElement;
    expect(cell.dataset.clue).toBeUndefined();
    expect(cell.textContent).toBe('X');
  });
});
