/**
 * CrosswordVersus — render glue over the tested useCrosswordMp + the solo
 * useCrosswordGame engine. The hook, manager, and stateless crossword components
 * are mocked so we assert only THIS wrapper's behavior: waiting gate, standings
 * rail, and progress emission on word-solve.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }),
}));

const submitProgress = vi.fn();
let mp: Record<string, unknown>;
vi.mock('../useCrosswordMp', () => ({ useCrosswordMp: () => ({ ...mp, submitProgress }) }));

// Solo engine — fixed playing state with 1/4 words solved.
vi.mock('@/hooks/useCrosswordGame', () => ({
  useCrosswordGame: () => ({
    state: { status: 'playing', revealed: [], entries: {}, active: { row: 0, col: 0 }, dir: 'across' },
    activeSlot: null, elapsedMs: 10000,
    focusCell: vi.fn(), toggleDir: vi.fn(), inputLetter: vi.fn(), backspace: vi.fn(),
    moveInSlot: vi.fn(), revealCell: vi.fn(), revealWord: vi.fn(), checkAll: vi.fn(),
    nextSlot: vi.fn(), focusSlot: vi.fn(), reset: vi.fn(),
  }),
}));
vi.mock('@/lib/crossword/stats', () => ({ crosswordStats: () => ({ percent: 25, wordsSolved: 1, wordsTotal: 4, totalCells: 20, filledCells: 5, correctCells: 5 }) }));
vi.mock('@/lib/solo/soloReward', () => ({ crosswordScore: () => 30 }));
// Stub heavy daemon components so this stays a unit test of the wrapper.
vi.mock('@/components/crossword/CrosswordGrid', () => ({ CrosswordGrid: () => <div data-testid="grid" /> }));
vi.mock('@/components/crossword/CrosswordKeyboard', () => ({ CrosswordKeyboard: () => <div data-testid="kbd" /> }));
vi.mock('@/components/crossword/ClueBar', () => ({ ClueBar: () => <div data-testid="cluebar" /> }));
vi.mock('@/components/crossword/CrosswordClueList', () => ({ CrosswordClueList: () => <div data-testid="cluelist" /> }));

import { CrosswordVersus } from '../CrosswordVersus';

const PUZZLE = { id: 'en-mini-001', locale: 'en', size: 5, rtl: false, cells: [], slots: [], difficulty: 'easy', source: 'authored' };
const standings = [
  { username: 'me', percent: 25, solved: false, elapsedMs: 10000, score: 0, rank: 1 },
  { username: 'bob', percent: 10, solved: false, elapsedMs: 10000, score: 0, rank: 2 },
];

describe('CrosswordVersus', () => {
  beforeEach(() => { submitProgress.mockClear(); mp = { puzzle: PUZZLE, standings, raceOver: false, ready: true }; });

  it('shows a waiting state before the puzzle arrives', () => {
    mp = { puzzle: null, standings: [], raceOver: false, ready: false };
    render(<CrosswordVersus socket={null} username="me" />);
    expect(screen.getByText('crossword.mp.waiting')).toBeInTheDocument();
  });

  it('renders the grid + standings rail once the puzzle is present', () => {
    render(<CrosswordVersus socket={null} username="me" />);
    expect(screen.getByTestId('grid')).toBeInTheDocument();
    expect(screen.getByText('me')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('emits progress on mount (current word-solved count)', () => {
    render(<CrosswordVersus socket={null} username="me" />);
    expect(submitProgress).toHaveBeenCalledWith(
      expect.objectContaining({ percent: 25, solved: false, elapsedMs: 10000 }),
    );
  });

  it('shows the win banner when the race is over', () => {
    mp = { puzzle: PUZZLE, standings, raceOver: true, ready: true };
    render(<CrosswordVersus socket={null} username="me" />);
    expect(screen.getByText('crossword.mp.youWin')).toBeInTheDocument();
  });
});
