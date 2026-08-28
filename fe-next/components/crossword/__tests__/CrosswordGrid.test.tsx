// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CrosswordGrid } from '../CrosswordGrid';
import { initGame } from '@/lib/crossword/gameState';
import { buildSeedPuzzle } from '@/lib/crossword/puzzles/index';
import type { SeedPuzzle } from '@/lib/crossword/puzzles/seed';

const t = (key: string, p?: Record<string, string | number>) =>
  p ? `${key}:${Object.values(p).join(',')}` : key;

const seedEn: SeedPuzzle = {
  id: 'grid-en',
  locale: 'en',
  difficulty: 'easy',
  rtl: false,
  grid: [
    ['b', 'i', 'r', 'd'],
    ['i', 'd', 'e', 'a'],
    ['r', 'e', 's', 't'],
    ['d', 'a', 't', 'e'],
  ],
  clues: { bird: 'b', idea: 'i', rest: 'r', date: 'd' },
};

const seedHe: SeedPuzzle = {
  id: 'grid-he',
  locale: 'he',
  difficulty: 'easy',
  rtl: true,
  grid: [
    ['א', 'י', 'ש'],
    ['י', 'ו', 'מ'],
    ['ש', 'מ', 'ש'],
  ],
  clues: { איש: 'a', יומ: 'b', שמש: 'c' },
};

/**
 * A newspaper-scale board. Only its DIMENSION matters here — the pan/zoom affordances key off
 * grid size, not the fill — so the letters are filler rather than a real puzzle.
 */
function buildBigPuzzle() {
  const N = 11;
  const grid = Array.from({ length: N }, (_, r) =>
    Array.from({ length: N }, (_, c) => String.fromCharCode(97 + ((r + c) % 26))),
  );
  return buildSeedPuzzle({
    id: 'grid-big',
    locale: 'en',
    difficulty: 'medium',
    rtl: false,
    grid,
    clues: {},
  });
}

describe('CrosswordGrid', () => {
  it('renders one gridcell per fillable cell and selects on click', () => {
    const puzzle = buildSeedPuzzle(seedEn);
    const onSelect = vi.fn();
    render(<CrosswordGrid state={initGame(puzzle)} onSelect={onSelect} t={t} />);

    const cells = screen.getAllByRole('gridcell');
    expect(cells.length).toBe(16); // 4x4 all fillable
    fireEvent.click(cells[5]);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows the entered letter and marks the active cell selected', () => {
    const puzzle = buildSeedPuzzle(seedEn);
    let state = initGame(puzzle);
    state = { ...state, entries: { '0,0': 'b' }, active: { row: 0, col: 0 } };
    render(<CrosswordGrid state={state} onSelect={() => {}} t={t} />);
    const active = screen.getByRole('gridcell', { selected: true });
    expect(active.textContent).toContain('b');
  });

  // The shadow lives on the clip box, not the transformed layer: inside the box it would be
  // cut off by overflow-hidden and would grow with the zoom scale.
  it('colours the board drop-shadow by difficulty (easy lime · hard pink)', () => {
    const easy = buildSeedPuzzle(seedEn); // seedEn is easy
    const { container: easyC } = render(
      <CrosswordGrid state={initGame(easy)} onSelect={() => {}} t={t} />,
    );
    expect(easyC.querySelector('[data-crossword-board]')?.className).toContain('shadow-hard-lime');

    const hard = buildSeedPuzzle({ ...seedEn, id: 'grid-hard', difficulty: 'hard' });
    const { container: hardC } = render(
      <CrosswordGrid state={initGame(hard)} onSelect={() => {}} t={t} />,
    );
    expect(hardC.querySelector('[data-crossword-board]')?.className).toContain('shadow-hard-pink');
  });

  it('leaves a mini un-pannable so a fitted board cannot be dragged off-centre', () => {
    const puzzle = buildSeedPuzzle(seedEn); // 4×4 — always fits
    const { container } = render(
      <CrosswordGrid state={initGame(puzzle)} onSelect={() => {}} t={t} />,
    );
    const board = container.querySelector('[data-crossword-board]');
    expect(board?.getAttribute('data-pannable')).toBe('false');
    // and no zoom chrome to clutter a board that never needs it
    expect(container.querySelector('[aria-label="crossword.zoomIn"]')).toBeNull();
  });

  it('opens a newspaper-size board zoomed, pannable, with zoom controls', () => {
    const { container } = render(
      <CrosswordGrid state={initGame(buildBigPuzzle())} onSelect={() => {}} t={t} />,
    );
    const board = container.querySelector('[data-crossword-board]');
    expect(board?.getAttribute('data-pannable')).toBe('true');
    expect(container.querySelector('[aria-label="crossword.zoomIn"]')).not.toBeNull();
  });

  /**
   * The clamp maths is unit-tested pure, but the chain that matters at runtime is
   * `active` → effect → commit → inline transform. Nothing else covers it: keyboard navigation
   * would walk the cursor off a zoomed board with the view sitting still, and every pure test
   * would still pass.
   */
  it('pans the board when focus moves to an off-screen cell', () => {
    // jsdom reports every element as 0×0, and the board measures itself in its ref callback —
    // so the width has to exist BEFORE render, not after.
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => 350,
    });
    try {
      let state = { ...initGame(buildBigPuzzle()), active: { row: 0, col: 0 } };
      const { container, rerender } = render(
        <CrosswordGrid state={state} onSelect={() => {}} t={t} />,
      );
      const board = container.querySelector('[data-crossword-board]') as HTMLElement;
      const layer = board.firstElementChild as HTMLElement;
      const atOrigin = layer.style.transform;

      state = { ...state, active: { row: 10, col: 10 } };
      rerender(<CrosswordGrid state={state} onSelect={() => {}} t={t} />);
      expect(layer.style.transform).not.toBe(atOrigin);
      expect(layer.style.transform).toMatch(/translate3d\(-\d/); // moved up-left to the corner
    } finally {
      if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
    }
  });

  it('does not select a cell when the press was a drag', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <CrosswordGrid state={initGame(buildBigPuzzle())} onSelect={onSelect} t={t} />,
    );
    const board = container.querySelector('[data-crossword-board]') as HTMLElement;
    // jsdom has no layout, so give the box a width for the pan math to work against.
    Object.defineProperty(board, 'clientWidth', { value: 350, configurable: true });
    board.getBoundingClientRect = () => ({ left: 0, top: 0, width: 350, height: 350 }) as DOMRect;

    const cell = screen.getAllByRole('gridcell')[0];
    fireEvent.pointerDown(board, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(board, { pointerId: 1, clientX: 160, clientY: 140 });
    fireEvent.pointerUp(board, { pointerId: 1, clientX: 160, clientY: 140 });
    fireEvent.click(cell);
    expect(onSelect).not.toHaveBeenCalled();

    // a press that barely moves is still a tap
    fireEvent.pointerDown(board, { pointerId: 2, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(board, { pointerId: 2, clientX: 101, clientY: 100 });
    fireEvent.click(cell);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders a Hebrew grid in RTL with final-form letter at word end', () => {
    const puzzle = buildSeedPuzzle(seedHe);
    // fill the bottom-right cell (last of a word) so sofit display applies
    let state = initGame(puzzle);
    state = { ...state, entries: { '0,2': 'ש' }, active: { row: 0, col: 2 } };
    const { container } = render(<CrosswordGrid state={state} onSelect={() => {}} t={t} />);
    const grid = container.querySelector('[role="grid"]');
    expect(grid?.getAttribute('dir')).toBe('rtl');
  });

  // RTL must be applied EXACTLY ONCE. The grid container carries dir="rtl", which already reverses
  // the CSS grid inline axis so column line 1 is the right edge; a cell that ALSO mirrors its own
  // column index flips a second time and the board comes out left-to-right — Hebrew across answers
  // read backwards. lib/crossword/viewport.ts assumes this same dir-only convention, so the cell is
  // the piece that has to stay un-mirrored.
  it('does not mirror cell columns on top of dir="rtl" (double-flip would undo RTL)', () => {
    const puzzle = buildSeedPuzzle(seedHe);
    const { container } = render(
      <CrosswordGrid state={initGame(puzzle)} onSelect={() => {}} t={t} />,
    );
    const grid = container.querySelector('[role="grid"]');
    expect(grid?.getAttribute('dir')).toBe('rtl');

    // Logical col 0 is the FIRST letter of 1-across; under dir="rtl" that is grid column line 1.
    const first = screen.getAllByRole('gridcell')[0];
    expect(first.getAttribute('aria-label')).toBe('crossword.cellLabel:1,1'); // row 1, col 1
    expect((first as HTMLElement).style.gridColumn).toBe('1');
  });

  it('keeps LTR grids un-mirrored too', () => {
    const puzzle = buildSeedPuzzle(seedEn);
    const { container } = render(
      <CrosswordGrid state={initGame(puzzle)} onSelect={() => {}} t={t} />,
    );
    expect(container.querySelector('[role="grid"]')?.getAttribute('dir')).toBe('ltr');
    const first = screen.getAllByRole('gridcell')[0];
    expect((first as HTMLElement).style.gridColumn).toBe('1');
  });
});
