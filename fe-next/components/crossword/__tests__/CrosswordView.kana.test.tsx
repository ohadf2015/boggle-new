// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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
vi.mock('../CrosswordGrid', () => ({ CrosswordGrid: () => <div /> }));
vi.mock('../CrosswordKeyboard', () => ({ CrosswordKeyboard: () => <div data-testid="kbd" /> }));
vi.mock('../ClueBar', () => ({ ClueBar: () => <div /> }));
vi.mock('../CrosswordClueList', () => ({ CrosswordClueList: () => <div /> }));
vi.mock('../CrosswordMasthead', () => ({ CrosswordMasthead: () => <div /> }));
vi.mock('../CrosswordFx', () => ({ CrosswordFx: () => null }));
vi.mock('../ClueScramble', () => ({ ClueScramble: () => null }));

import { CrosswordView } from '../CrosswordView';

const puzzle = (locale: 'en' | 'ja') =>
  ({ id: `${locale}-x`, locale, size: 4, rtl: false, cells: [], slots: [], difficulty: 'easy', source: 'generated' }) as never;

describe('CrosswordView keyboard per locale', () => {
  it('en: the on-screen keyboard is touch-only and there is no IME input', () => {
    render(<CrosswordView puzzle={puzzle('en')} />);
    expect(screen.getByTestId('kbd').parentElement?.className).toContain('lg:hidden');
    expect(screen.queryByLabelText('crossword.kanaInput')).toBeNull();
  });

  it('ja: the kana keyboard stays on desktop and the IME input is mounted', () => {
    render(<CrosswordView puzzle={puzzle('ja')} />);
    expect(screen.getByTestId('kbd').parentElement?.className).not.toContain('lg:hidden');
    expect(screen.getByLabelText('crossword.kanaInput')).toBeInTheDocument();
  });
});
