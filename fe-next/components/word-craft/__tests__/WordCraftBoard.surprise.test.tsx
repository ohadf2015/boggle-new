import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WordCraftBoard } from '../WordCraftBoard';
import { createBoard } from '@/lib/word-craft/board';

describe('WordCraftBoard — surprise boxes + painted squares', () => {
  it('Given an unopened box, Then its empty cell shows a "?" block (reward hidden)', () => {
    render(
      <WordCraftBoard
        board={createBoard(11)}
        pendingPlacements={[]}
        onCellClick={() => {}}
        surprises={[{ row: 3, col: 4, kind: 'mega' }]}
      />,
    );
    const cell = document.querySelector('[data-board-cell="3,4"]') as HTMLElement;
    expect(cell.dataset.surprise).toBe('true');
    expect(cell.textContent).toBe('?');
    expect(cell.getAttribute('aria-label')).toMatch(/surprise/);
    // The reward kind must not leak into the DOM before it is opened.
    expect(cell.outerHTML).not.toMatch(/mega/);
  });

  it('Given a painted (claimed, empty) square, Then it shows its owner', () => {
    const board = createBoard(11);
    board.cells[2][2].claim = 'player';
    render(<WordCraftBoard board={board} pendingPlacements={[]} onCellClick={() => {}} />);
    const cell = document.querySelector('[data-board-cell="2,2"]') as HTMLElement;
    expect(cell.dataset.claim).toBe('player');
  });
});
