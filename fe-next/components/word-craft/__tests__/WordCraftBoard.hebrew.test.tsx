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
      locale="he"
    />
  );
}

// Per product decision: Hebrew tiles on the WordCraft board ALWAYS render the
// regular (non-final) form, even at the visual end of a word. A board tile is
// shared between its across and down word, so a "final" glyph is ambiguous and
// reads as a bug. The bag never holds sofit forms; the board must never show
// them either.
describe('WordCraftBoard Hebrew sofit suppression', () => {
  it('renders the regular form at the end of a horizontal word (no sofit)', () => {
    const board = createBoard(15, { premiums: false });
    placeTiles(board, [
      { row: 7, col: 5, letter: 'י', value: 1, isBlank: false, rackTileId: 'a' },
      { row: 7, col: 6, letter: 'מ', value: 1, isBlank: false, rackTileId: 'b' },
    ]);
    const { container } = renderBoard(board);

    const endCell = container.querySelector('[data-board-cell="7,6"]');
    expect(endCell?.textContent).toContain('מ'); // regular mem
    expect(endCell?.textContent).not.toContain('ם'); // NOT final mem
  });

  it('renders the regular form at the bottom of a vertical word (no sofit)', () => {
    const board = createBoard(15, { premiums: false });
    placeTiles(board, [
      { row: 5, col: 7, letter: 'י', value: 1, isBlank: false, rackTileId: 'c' },
      { row: 6, col: 7, letter: 'נ', value: 1, isBlank: false, rackTileId: 'd' },
    ]);
    const { container } = renderBoard(board);

    const bottomCell = container.querySelector('[data-board-cell="6,7"]');
    expect(bottomCell?.textContent).toContain('נ'); // regular nun
    expect(bottomCell?.textContent).not.toContain('ן'); // NOT final nun
  });

  it('keeps every sofit-eligible letter regular at word-end', () => {
    const pairs: Array<[string, string]> = [
      ['מ', 'ם'],
      ['נ', 'ן'],
      ['פ', 'ף'],
      ['צ', 'ץ'],
      ['כ', 'ך'],
    ];
    for (const [regular, sofit] of pairs) {
      const board = createBoard(15, { premiums: false });
      placeTiles(board, [
        { row: 7, col: 5, letter: 'י', value: 1, isBlank: false, rackTileId: `s-${regular}` },
        { row: 7, col: 6, letter: regular, value: 1, isBlank: false, rackTileId: `e-${regular}` },
      ]);
      const { container } = renderBoard(board);
      const endCell = container.querySelector('[data-board-cell="7,6"]');
      expect(endCell?.textContent, `${regular} must stay regular`).toContain(regular);
      expect(endCell?.textContent, `${regular} must not become ${sofit}`).not.toContain(sofit);
    }
  });
});
