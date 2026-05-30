import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { WordCraftBoard } from '../WordCraftBoard';
import { createBoard, placeTiles } from '@/lib/word-craft/board';

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

describe('WordCraftBoard chrome', () => {
  it('renders premium squares with brand-color tint classes and multiplier labels', () => {
    const board = createBoard(11);
    const labels = { TW: '3W', DW: '2W', TL: '3L', DL: '2L' } as const;
    const { container } = render(
      <WordCraftBoard
        board={board}
        pendingPlacements={[]}
        onCellClick={() => {}}
        disabled={false}
        premiumLabels={labels}
      />,
    );

    // 11x11 layout: (0,0) is TW (triple word). Tint stays pink; the cell now
    // carries a compact multiplier label so players can tell tiers apart.
    const tw = container.querySelector('[data-board-cell="0,0"]');
    expect(tw).toBeTruthy();
    expect(tw?.className).toMatch(/bg-neo-pink/);
    expect(tw?.textContent).toContain('3W');

    // (2,2) is DW (double word)
    const dw = container.querySelector('[data-board-cell="2,2"]');
    expect(dw?.className).toMatch(/bg-neo-pink/);
    expect(dw?.textContent).toContain('2W');

    // (4,1) is TL (triple letter)
    const tl = container.querySelector('[data-board-cell="4,1"]');
    expect(tl?.className).toMatch(/bg-neo-cyan/);
    expect(tl?.textContent).toContain('3L');

    // (4,3) is DL (double letter)
    const dl = container.querySelector('[data-board-cell="4,3"]');
    expect(dl?.className).toMatch(/bg-neo-cyan/);
    expect(dl?.textContent).toContain('2L');
  });

  it('omits premium labels when premiumLabels prop is not supplied', () => {
    const board = createBoard(11);
    const { container } = renderBoard(board);
    const tw = container.querySelector('[data-board-cell="0,0"]');
    expect(tw?.className).toMatch(/bg-neo-pink/);
    expect(tw?.textContent).toBe('');
  });

  it('center cell has star glyph when empty', () => {
    const board = createBoard(11);
    const { container } = renderBoard(board);

    // 11x11 center is (5,5)
    const center = container.querySelector('[data-board-cell="5,5"]');
    expect(center).toBeTruthy();
    // Center tint
    expect(center?.className).toMatch(/bg-neo-pink/);
    // Star glyph inside
    expect(center?.textContent).toContain('★');
  });

  it('renders placed tile with big letter and score-dot', () => {
    const board = createBoard(11);
    placeTiles(board, [
      { row: 5, col: 5, letter: 'Q', value: 10, isBlank: false, rackTileId: 't-1' },
    ]);
    const { container } = renderBoard(board);

    const cell = container.querySelector('[data-board-cell="5,5"]');
    expect(cell).toBeTruthy();
    // Letter must be visible
    expect(cell?.textContent).toContain('Q');

    // Score-dot must exist
    const dot = cell?.querySelector('[data-score-dot]');
    expect(dot).toBeTruthy();

    // 10pt = legendary tier = neo-yellow
    expect(dot?.className).toMatch(/bg-neo-yellow/);

    // The numeric score (10) must NOT be rendered as visible text on the cell
    // (it's hidden inside the dot, not displayed as a number)
    const cellText = cell?.textContent || '';
    expect(cellText).not.toMatch(/\b10\b/);
  });

  it('score-dot tier color matches point value', () => {
    const board = createBoard(11);

    // Test 1pt = common (cream)
    placeTiles(board, [
      { row: 3, col: 3, letter: 'A', value: 1, isBlank: false, rackTileId: 't-1' },
    ]);
    let { container } = renderBoard(board);
    let dot = container.querySelector('[data-score-dot]');
    expect(dot?.className).toMatch(/bg-neo-cream/);

    // Test 2pt = mid (cyan)
    board.cells[4][4].tile = null;
    board.cells[3][3].tile = null;
    placeTiles(board, [
      { row: 4, col: 4, letter: 'B', value: 2, isBlank: false, rackTileId: 't-2' },
    ]);
    ({ container } = renderBoard(board));
    dot = container.querySelector('[data-score-dot]');
    expect(dot?.className).toMatch(/bg-neo-cyan/);

    // Test 4pt = rare (purple)
    board.cells[4][4].tile = null;
    placeTiles(board, [
      { row: 4, col: 4, letter: 'C', value: 4, isBlank: false, rackTileId: 't-3' },
    ]);
    ({ container } = renderBoard(board));
    dot = container.querySelector('[data-score-dot]');
    expect(dot?.className).toMatch(/bg-neo-purple/);
  });

  it('unassigned joker tile renders the wildcard glyph (not a dot) with score-dot', () => {
    const board = createBoard(11);
    placeTiles(board, [
      { row: 5, col: 5, letter: '_', value: 0, isBlank: true, rackTileId: 't-blank' },
    ]);
    const { container } = renderBoard(board);

    const cell = container.querySelector('[data-board-cell="5,5"]');
    // Blank/joker renders the wildcard glyph '?', never the old confusing '·'.
    expect(cell?.textContent).toContain('?');
    expect(cell?.textContent).not.toContain('·');

    // Score-dot still exists for the 0-point blank
    const dot = cell?.querySelector('[data-score-dot]');
    expect(dot).toBeTruthy();
  });

  it('data-premium attribute set on premium cells', () => {
    const board = createBoard(11);
    const { container } = renderBoard(board);

    const tw = container.querySelector('[data-board-cell="0,0"]');
    expect(tw?.getAttribute('data-premium')).toBe('TW');

    const dw = container.querySelector('[data-board-cell="2,2"]');
    expect(dw?.getAttribute('data-premium')).toBe('DW');

    const center = container.querySelector('[data-board-cell="5,5"]');
    expect(center?.getAttribute('data-premium')).toBe('');
  });
});
