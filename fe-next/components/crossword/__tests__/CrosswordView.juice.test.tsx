// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }) }));
vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => () => {} }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound: vi.fn() }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useCrosswordGame', () => ({
  useCrosswordGame: () => ({
    state: { status: 'playing', revealed: [], entries: {}, active: { row: 0, col: 0 }, dir: 'across', puzzle: { slots: [] } },
    activeSlot: null, elapsedMs: 0,
    focusCell: vi.fn(), toggleDir: vi.fn(), inputLetter: vi.fn(), backspace: vi.fn(),
    moveInSlot: vi.fn(), moveVertical: vi.fn(), revealCell: vi.fn(), revealWord: vi.fn(), checkAll: vi.fn(),
    nextSlot: vi.fn(), focusSlot: vi.fn(), reset: vi.fn(),
  }),
}));
vi.mock('@/lib/crossword/stats', () => ({ crosswordStats: () => ({ percent: 0, wordsSolved: 0, wordsTotal: 4, totalCells: 16, filledCells: 0, correctCells: 0 }), solvedSlotIds: () => [] }));
const grid = vi.hoisted(() => ({ props: null as null | { juice?: string; onComboChange?: (n: number) => void } }));
const mascot = vi.hoisted(() => ({ props: null as null | { mode: string; comboLevel: number } }));
vi.mock('../CrosswordGrid', () => ({
  CrosswordGrid: (p: { juice?: string; onComboChange?: (n: number) => void }) => {
    grid.props = p;
    return <div />;
  },
}));
vi.mock('@/components/mascot/GameMascotReactions', () => ({
  GameMascotReactions: (p: { mode: string; comboLevel: number }) => {
    mascot.props = p;
    return null;
  },
}));
vi.mock('../CrosswordKeyboard', () => ({ CrosswordKeyboard: () => <div data-testid="kbd" /> }));
vi.mock('../ClueBar', () => ({ ClueBar: () => <div /> }));
vi.mock('../CrosswordClueList', () => ({ CrosswordClueList: () => <div /> }));
vi.mock('../CrosswordMasthead', () => ({ CrosswordMasthead: () => <div /> }));
vi.mock('../CrosswordFx', () => ({ CrosswordFx: () => null }));
vi.mock('../ClueScramble', () => ({ ClueScramble: () => null }));

import { CrosswordView } from '../CrosswordView';

const puzzle = { id: 'en-x', locale: 'en', size: 4, rtl: false, cells: [], slots: [], difficulty: 'easy', source: 'generated' } as never;

describe('CrosswordView per-word juice', () => {
  it('Given solo play, the board runs the full reactions and the mascot is mounted for crossword', () => {
    render(<CrosswordView puzzle={puzzle} />);
    expect(grid.props?.juice).toBe('full');
    expect(mascot.props).toEqual({ mode: 'crossword', comboLevel: 0 });
  });

  it('Given a word chain, shows a combo chip that grows with the chain and feeds the mascot', () => {
    render(<CrosswordView puzzle={puzzle} />);
    expect(screen.queryByTestId('cw-combo')).toBeNull();
    act(() => grid.props?.onComboChange?.(1));
    expect(screen.queryByTestId('cw-combo')).toBeNull();
    act(() => grid.props?.onComboChange?.(2));
    const two = screen.getByTestId('cw-combo');
    expect(two.textContent).toContain('crossword.combo');
    expect(two.dataset.tier).toBe('1');
    act(() => grid.props?.onComboChange?.(5));
    expect(screen.getByTestId('cw-combo').dataset.tier).toBe('3');
    expect(mascot.props?.comboLevel).toBe(5);
  });
});
