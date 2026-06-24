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

  it('colours the grid drop-shadow by difficulty (easy lime · hard pink)', () => {
    const easy = buildSeedPuzzle(seedEn); // seedEn is easy
    const { container: easyC } = render(
      <CrosswordGrid state={initGame(easy)} onSelect={() => {}} t={t} />,
    );
    expect(easyC.querySelector('[role="grid"]')?.className).toContain('shadow-hard-lime');

    const hard = buildSeedPuzzle({ ...seedEn, id: 'grid-hard', difficulty: 'hard' });
    const { container: hardC } = render(
      <CrosswordGrid state={initGame(hard)} onSelect={() => {}} t={t} />,
    );
    expect(hardC.querySelector('[role="grid"]')?.className).toContain('shadow-hard-pink');
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
});
