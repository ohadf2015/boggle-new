/**
 * Word Wheel controls — the shuffle ("change letter positions") button has been
 * replaced by a "remove last letter" (backspace) button. Shuffle was redundant
 * (taps/drag + Clear already cover rearranging intent); a single-letter undo is
 * the more useful affordance and matches the MP Wheel Rush controls.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playComboSound: vi.fn(),
    playLegendaryWordSound: vi.fn(),
    playEpicVictorySound: vi.fn(),
    playCountdownBeep: vi.fn(),
    playBoardShuffleSound: vi.fn(),
    playButtonClickSound: vi.fn(),
    playWordLengthSound: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWordWheelKeyboard', () => ({
  useWordWheelKeyboard: () => ({ keyboardFocused: false }),
}));

vi.mock('@/hooks/useEquippedCosmetic', () => ({ useEquippedCosmetic: () => null }));
vi.mock('../WordWheelPixiRing', () => ({ __esModule: true, default: () => <div data-testid="pixi-ring-stub" /> }));
vi.mock('next/dynamic', () => ({ __esModule: true, default: () => () => <div data-testid="dynamic-stub" /> }));

vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({ isValidWordWheelWord: () => true }));
vi.mock('@/utils/dailyChallenge/wordWheelScoring', () => ({ scoreWord: () => 5 }));

import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A',
  outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
  validWords: ['CAB'],
  language: 'en',
} as unknown as WordWheelPuzzle;

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
});

const mountGame = () =>
  render(
    <WordWheelGame
      puzzle={puzzle}
      duration={60}
      onComplete={vi.fn()}
      onValidateWord={vi.fn().mockResolvedValue(true)}
      onEffect={vi.fn()}
      language="en"
    />,
  );

const tap = (selector: string) => {
  const el = document.querySelector(selector) as HTMLButtonElement | null;
  if (!el) throw new Error(`No element matching ${selector}`);
  fireEvent.click(el);
};

const builtLetterCount = () =>
  screen.queryAllByLabelText(/wordWheel\.tapToRemove/).filter(el => !el.hasAttribute('data-wheel-letter')).length;

describe('WordWheelGame controls — remove-letter replaces shuffle', () => {
  it('no longer renders the shuffle button', () => {
    mountGame();
    expect(screen.queryByLabelText('wordWheel.shuffle')).toBeNull();
  });

  it('renders a remove-last-letter button', () => {
    mountGame();
    expect(screen.getByLabelText('wordWheel.removeLetter')).toBeInTheDocument();
  });

  it('removes only the last built letter when tapped (not the whole word)', () => {
    mountGame();
    tap('[data-wheel-letter="C"]');
    tap('[data-wheel-letter="A"]'); // center
    tap('[data-wheel-letter="B"]');
    expect(builtLetterCount()).toBe(3);

    fireEvent.click(screen.getByLabelText('wordWheel.removeLetter'));
    expect(builtLetterCount()).toBe(2);
  });

  it('disables the remove-letter button when nothing is built', () => {
    mountGame();
    expect(screen.getByLabelText('wordWheel.removeLetter')).toBeDisabled();
  });
});
