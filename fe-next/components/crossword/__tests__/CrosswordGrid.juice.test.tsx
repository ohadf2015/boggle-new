// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

const juice = vi.hoisted(() => ({ calls: [] as Array<{ intensity: string }>, level: 3 }));
vi.mock('../useCrosswordWordJuice', () => ({
  useCrosswordWordJuice: (o: { intensity: string }) => {
    juice.calls.push(o);
    return { comboLevel: juice.level };
  },
}));

import { CrosswordGrid } from '../CrosswordGrid';
import { initGame } from '@/lib/crossword/gameState';
import { buildSeedPuzzle } from '@/lib/crossword/puzzles/index';

const t = (key: string) => key;
const puzzle = buildSeedPuzzle({
  id: 'grid-juice',
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
});

describe('CrosswordGrid per-word juice', () => {
  it('Given no juice prop (race / classroom), runs the small reactions', () => {
    juice.calls = [];
    render(<CrosswordGrid state={initGame(puzzle)} onSelect={() => {}} t={t} />);
    expect(juice.calls.at(-1)?.intensity).toBe('small');
  });

  it('Given solo, runs the full reactions and reports the combo up', () => {
    juice.calls = [];
    const onComboChange = vi.fn();
    render(<CrosswordGrid state={initGame(puzzle)} onSelect={() => {}} t={t} juice="full" onComboChange={onComboChange} />);
    expect(juice.calls.at(-1)?.intensity).toBe('full');
    expect(onComboChange).toHaveBeenCalledWith(3);
  });

  it('marks every cell so a solved word can be found on the board', () => {
    const { container } = render(<CrosswordGrid state={initGame(puzzle)} onSelect={() => {}} t={t} />);
    expect(container.querySelector('[data-cw-cell="2,3"]')).not.toBeNull();
  });
});
