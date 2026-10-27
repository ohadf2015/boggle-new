import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { WordCraftBoard } from '../WordCraftBoard';
import { createBoard, placeTiles } from '@/lib/word-craft/board';

describe('WordCraftBoard star squares', () => {
  it('marks empty star cells and hides the star once a tile lands on it', () => {
    const board = createBoard(7, { premiums: false });
    const stars = new Set(['1,1', '1,5', '5,1', '5,5']);
    const { container, rerender } = render(
      <WordCraftBoard board={board} pendingPlacements={[]} onCellClick={() => {}} starCells={stars} />,
    );
    expect(container.querySelectorAll('[data-star="true"]')).toHaveLength(4);

    placeTiles(board, [{ row: 1, col: 1, letter: 'a', value: 1, isBlank: false, rackTileId: 't1' }]);
    rerender(<WordCraftBoard board={board} pendingPlacements={[]} onCellClick={() => {}} starCells={stars} />);
    expect(container.querySelectorAll('[data-star="true"]')).toHaveLength(3);
    expect(container.querySelector('[data-board-cell="1,1"]')?.getAttribute('data-star')).toBeNull();
  });

  it('shows no stars without the modifier', () => {
    const { container } = render(<WordCraftBoard board={createBoard(7, { premiums: false })} pendingPlacements={[]} onCellClick={() => {}} />);
    expect(container.querySelectorAll('[data-star]')).toHaveLength(0);
  });
});
