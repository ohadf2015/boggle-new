import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ClassroomBoardProvider } from '@/components/education/live/classroomBoard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }),
}));

const submitProgress = vi.fn();
const { solvedIds, revealedCells } = vi.hoisted(() => ({ solvedIds: { value: [] as string[] }, revealedCells: { value: [] as string[] } }));
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
      state: { status: 'playing', revealed: revealedCells.value, entries: {}, active: { row: 0, col: 0 }, dir: 'across' },
      activeSlot: null, elapsedMs: 10000,
      focusCell: vi.fn(), toggleDir: vi.fn(), inputLetter, backspace,
      moveInSlot: vi.fn(), moveVertical: vi.fn(), revealCell: vi.fn(), revealWord: vi.fn(), checkAll: vi.fn(),
      nextSlot: vi.fn(), focusSlot: vi.fn(), reset: vi.fn(),
    };
  },
}));
vi.mock('@/lib/crossword/stats', () => ({ crosswordStats: () => ({ percent: 25, wordsSolved: 1, wordsTotal: 4, totalCells: 20, filledCells: 5, correctCells: 5 }), solvedSlotIds: () => solvedIds.value }));
vi.mock('@/lib/solo/soloReward', () => ({ crosswordScore: () => 30 }));
// Stub heavy daemon components so this stays a unit test of the wrapper.
vi.mock('@/components/crossword/CrosswordGrid', () => ({ CrosswordGrid: () => <div data-testid="grid" /> }));
vi.mock('@/components/crossword/CrosswordKeyboard', () => ({ CrosswordKeyboard: () => <div data-testid="kbd" /> }));
vi.mock('@/components/crossword/ClueBar', () => ({ ClueBar: () => <div data-testid="cluebar" /> }));
vi.mock('@/components/crossword/CrosswordClueList', () => ({ CrosswordClueList: () => <div data-testid="cluelist" /> }));
vi.mock('@/components/crossword/CrosswordInputDock', () => ({ CrosswordInputDock: () => <div data-testid="dock" /> }));
vi.mock('@/components/mascot/GameMascotReactions', () => ({ GameMascotReactions: () => null }));

import { CrosswordVersus } from '../CrosswordVersus';

const PUZZLE = { id: 'en-mini-001', locale: 'en', size: 5, rtl: false, cells: [], slots: [], difficulty: 'easy', source: 'authored' };
const standings = [
  { username: 'me', percent: 25, solved: false, elapsedMs: 10000, score: 0, rank: 1 },
  { username: 'bob', percent: 10, solved: true, elapsedMs: 10000, score: 0, rank: 2 },
];
const DARK = /bg-neo-navy|text-neo-white|text-white|text-neo-cream|border-neo-cream|text-neo-cyan(\s|$)|border-neo-cyan(\s|$)/;
const classesOf = (el: Element) => [el, ...el.querySelectorAll('[class]')].map((n) => n.getAttribute('class') ?? '');

function mount(classroom: boolean, state: 'waiting' | 'racing' | 'over', remainingTime = 90) {
  mp = state === 'waiting'
    ? { puzzle: null, standings: [], raceOver: false, ready: false }
    : { puzzle: PUZZLE, standings, raceOver: state === 'over', ready: true, startedAt: 1 };
  const { container } = render(
    <ClassroomBoardProvider value={classroom}>
      <CrosswordVersus socket={null} username="me" remainingTime={remainingTime} onQuit={vi.fn()} />
    </ClassroomBoardProvider>,
  );
  return container.firstElementChild!;
}

describe('CrosswordVersus classroom skin', () => {
  it.each(['waiting', 'racing', 'over'] as const)('arcade %s: the main game keeps its exact classes', (state) => {
    expect(classesOf(mount(false, state))).toMatchSnapshot();
  });

  it('arcade: the last 30 seconds keep the pink clock', () => {
    expect(classesOf(mount(false, 'racing', 10))).toMatchSnapshot();
  });

  it.each(['waiting', 'racing', 'over'] as const)('classroom %s: sky page, cream chrome, no navy or white ink', (state) => {
    const root = mount(true, state);
    expect(root.className).toContain('bg-edu-page');
    expect(classesOf(root).filter((c) => DARK.test(c))).toEqual([]);
  });
});
