import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { WordCraftBoard } from '../WordCraftBoard';
import { createBoard, placeTiles, type CellOwner } from '@/lib/word-craft/board';

function renderBoard(board: ReturnType<typeof createBoard>) {
  return render(
    <WordCraftBoard
      board={board}
      pendingPlacements={[]}
      onCellClick={() => {}}
      disabled={false}
    />
  );
}

function claim(board: ReturnType<typeof createBoard>, r: number, c: number, owner: CellOwner) {
  board.cells[r][c].claim = owner;
}

describe('WordCraftBoard chrome (Conquest)', () => {
  it('has no premium tints, no multiplier labels, and no center star', () => {
    // The conquest board is premium-free; even a legacy premium board must not
    // render Scrabble chrome through the component.
    const board = createBoard(11, { premiums: false });
    const { container } = renderBoard(board);

    // No cell carries a premium data value...
    const premiumCells = container.querySelectorAll('[data-premium]:not([data-premium=""])');
    expect(premiumCells.length).toBe(0);

    // ...and the center cell is plain (no star, no pink premium fill).
    const center = container.querySelector('[data-board-cell="5,5"]');
    expect(center?.textContent).toBe('');
    expect(center?.className).not.toMatch(/bg-neo-pink/);
    expect(center?.getAttribute('data-premium')).toBe('');
  });

  it('floods a player-owned tile with cyan', () => {
    const board = createBoard(11, { premiums: false });
    placeTiles(board, [{ row: 5, col: 5, letter: 'Q', value: 10, isBlank: false, rackTileId: 't-1' }]);
    claim(board, 5, 5, 'player');
    const { container } = renderBoard(board);

    const cell = container.querySelector('[data-board-cell="5,5"]');
    expect(cell?.textContent).toContain('Q');
    expect(cell?.className).toMatch(/bg-neo-cyan/);
    expect(cell?.getAttribute('data-claim')).toBe('player');
    // No score-dot — letter value is no longer a surfaced score signal.
    expect(cell?.querySelector('[data-score-dot]')).toBeNull();
  });

  it('floods a bot-owned tile with pink', () => {
    const board = createBoard(11, { premiums: false });
    placeTiles(board, [{ row: 4, col: 4, letter: 'A', value: 1, isBlank: false, rackTileId: 't-2' }]);
    claim(board, 4, 4, 'bot');
    const { container } = renderBoard(board);

    const cell = container.querySelector('[data-board-cell="4,4"]');
    expect(cell?.className).toMatch(/bg-neo-pink/);
    expect(cell?.getAttribute('data-claim')).toBe('bot');
  });

  it('unassigned joker tile renders the wildcard glyph', () => {
    const board = createBoard(11, { premiums: false });
    placeTiles(board, [{ row: 5, col: 5, letter: '_', value: 0, isBlank: true, rackTileId: 't-blank' }]);
    claim(board, 5, 5, 'player');
    const { container } = renderBoard(board);

    const cell = container.querySelector('[data-board-cell="5,5"]');
    expect(cell?.textContent).toContain('?');
    expect(cell?.textContent).not.toContain('·');
  });
});
