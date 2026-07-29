/**
 * Inline submit chip + no-layout-shift slots.
 *
 * UX problem: tap-only players had to thumb-travel from the wheel down
 * to the sticky bottom Submit. The inline ✓ chip puts a primary submit
 * affordance right next to the built word, in flow.
 *
 * Layout-shift fixes: hint text, next-rival pill, and combo chip used
 * to flow in/out and push the wheel/score around. Each gets a reserved
 * slot so the wheel position stays stable.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
  }),
}));

vi.mock('@/hooks/useWordWheelKeyboard', () => ({
  useWordWheelKeyboard: () => ({ keyboardFocused: false }),
}));

vi.mock('../WordWheelPixiRing', () => ({
  __esModule: true,
  default: () => <div data-testid="pixi-ring-stub" />,
}));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="dynamic-stub" />,
}));

vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  isValidWordWheelWord: () => true,
}));

vi.mock('@/utils/dailyChallenge/wordWheelScoring', () => ({
  scoreWord: () => 5,
}));

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

const mountGame = (
  overrides: Partial<React.ComponentProps<typeof WordWheelGame>> = {}
) => {
  const onValidateWord = vi.fn().mockResolvedValue(true);
  const utils = render(
    <WordWheelGame
      puzzle={puzzle}
      duration={60}
      onComplete={vi.fn()}
      onValidateWord={onValidateWord}
      onEffect={vi.fn()}
      language="en"
      {...overrides}
    />
  );
  return { ...utils, onValidateWord };
};

const tap = (selector: string) => {
  const el = document.querySelector(selector) as HTMLButtonElement | null;
  if (!el) throw new Error(`No element matching ${selector}`);
  fireEvent.click(el);
};

describe('WordWheelGame inline submit chip', () => {
  it('does not render the inline submit chip while the word builder is empty', () => {
    mountGame();
    expect(screen.queryByTestId('inline-submit-chip')).toBeNull();
  });

  it('renders the inline submit chip once a letter is added', () => {
    mountGame();
    tap('[data-wheel-index="-1"]'); // center letter A
    expect(screen.getByTestId('inline-submit-chip')).toBeInTheDocument();
  });

  it('clicking the inline submit chip with a valid word calls onValidateWord', async () => {
    const { onValidateWord } = mountGame();
    tap('[data-wheel-letter="C"]');
    tap('[data-wheel-letter="A"]');
    tap('[data-wheel-letter="B"]');
    await act(async () => {
      fireEvent.click(screen.getByTestId('inline-submit-chip'));
    });
    expect(onValidateWord).toHaveBeenCalledWith('CAB');
  });
});

describe('WordWheelGame layout reserves space (no shift)', () => {
  it('renders a reserved slot for the next-rival pill even when no rival is visible', () => {
    mountGame();
    expect(screen.getByTestId('next-rival-slot')).toBeInTheDocument();
  });

  it('renders a reserved slot for the tap-to-remove hint at all times', () => {
    mountGame();
    expect(screen.getByTestId('tap-hint-slot')).toBeInTheDocument();
  });

  it('renders a reserved slot for the combo chip in the top bar', () => {
    mountGame();
    expect(screen.getByTestId('combo-slot')).toBeInTheDocument();
  });
});
