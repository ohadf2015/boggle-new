/**
 * CrosswordVersus — render glue over the tested useCrosswordMp + the solo
 * useCrosswordGame engine. The hook, manager, and stateless crossword components
 * are mocked so we assert only THIS wrapper's behavior: waiting gate, standings
 * rail, and progress emission on word-solve.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }),
}));

const submitProgress = vi.fn();
let mp: Record<string, unknown>;
vi.mock('../useCrosswordMp', () => ({ useCrosswordMp: () => ({ ...mp, submitProgress }) }));

// Solo engine — fixed playing state with 1/4 words solved.
const inputLetter = vi.fn();
const backspace = vi.fn();
const useCrosswordGameArgs: unknown[][] = [];
vi.mock('@/hooks/useCrosswordGame', () => ({
  useCrosswordGame: (...args: unknown[]) => {
    useCrosswordGameArgs.push(args);
    return {
      state: { status: 'playing', revealed: [], entries: {}, active: { row: 0, col: 0 }, dir: 'across' },
      activeSlot: null, elapsedMs: 10000,
      focusCell: vi.fn(), toggleDir: vi.fn(), inputLetter, backspace,
      moveInSlot: vi.fn(), moveVertical: vi.fn(), revealCell: vi.fn(), revealWord: vi.fn(), checkAll: vi.fn(),
      nextSlot: vi.fn(), focusSlot: vi.fn(), reset: vi.fn(),
    };
  },
}));
vi.mock('@/lib/crossword/stats', () => ({ crosswordStats: () => ({ percent: 25, wordsSolved: 1, wordsTotal: 4, totalCells: 20, filledCells: 5, correctCells: 5 }), solvedSlotIds: () => [] }));
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
  beforeEach(() => {
    submitProgress.mockClear();
    inputLetter.mockClear();
    backspace.mockClear();
    useCrosswordGameArgs.length = 0;
    mp = { puzzle: PUZZLE, standings, raceOver: false, ready: true, startedAt: 1234 };
  });

  it('shows the round clock counting down the server time', () => {
    render(<CrosswordVersus socket={null} username="me" remainingTime={415} />);
    expect(screen.getByTestId('crossword-timer')).toHaveTextContent('6:55');
  });

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

  it('keeps race progress apart from the solo save of the same puzzle', () => {
    render(<CrosswordVersus socket={null} username="me" />);
    const opts = useCrosswordGameArgs[0][1] as { progressKey?: string; telemetry?: boolean };
    expect(opts.progressKey).toBeTruthy();
    expect(opts.progressKey).not.toBe(PUZZLE.id);
    expect(opts.progressKey).toContain('1234');
    expect(opts.telemetry).toBe(false);
  });

  it('accepts a hardware keyboard (desktop has no on-screen keys)', () => {
    render(<CrosswordVersus socket={null} username="me" />);
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(inputLetter).toHaveBeenCalledWith('a');
    expect(backspace).toHaveBeenCalledTimes(1);
  });

  it('shows the win banner when the race is over', () => {
    mp = { puzzle: PUZZLE, standings, raceOver: true, ready: true };
    render(<CrosswordVersus socket={null} username="me" />);
    expect(screen.getByText('crossword.mp.youWin')).toBeInTheDocument();
  });

  it('keeps the on-screen keyboard touch-only for en, with no IME input', () => {
    render(<CrosswordVersus socket={null} username="me" />);
    expect(screen.getByTestId('kbd').parentElement?.className).toContain('lg:hidden');
    expect(screen.queryByLabelText('crossword.kanaInput')).toBeNull();
  });

  it('ja: shows the kana keyboard on desktop too and mounts the IME input', () => {
    mp = { ...mp, puzzle: { ...PUZZLE, id: 'ja-gen-001', locale: 'ja' } };
    render(<CrosswordVersus socket={null} username="me" />);
    expect(screen.getByTestId('kbd').parentElement?.className).not.toContain('lg:hidden');
    expect(screen.getByLabelText('crossword.kanaInput')).toBeInTheDocument();
  });
});
