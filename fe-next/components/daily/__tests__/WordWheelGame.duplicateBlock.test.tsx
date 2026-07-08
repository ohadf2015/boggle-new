/**
 * Daily Word Wheel must BLOCK re-submitting a word the player already found.
 *
 * The daily game is single-player: once you've found a word it's yours, and
 * typing it again should be rejected outright (no points, "already found"
 * toast). This differs from multiplayer Wheel Rush, where the same word can be
 * legitimately re-submitted because another player found it first — but that
 * path is server-authoritative (WheelRushView), so the client-side block here
 * is daily-only.
 *
 * Regression guard for the old "repeat bonus" behavior, where the first
 * re-submit of a found word still scored a reduced amount.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
  trackGrowthEvent: vi.fn(),
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

const submitCab = async () => {
  tap('[data-wheel-letter="C"]');
  tap('[data-wheel-letter="A"]');
  tap('[data-wheel-letter="B"]');
  await act(async () => {
    fireEvent.click(screen.getByTestId('inline-submit-chip'));
  });
};

// Reads the live score from the top-bar score span.
const readScore = (container: HTMLElement): number => {
  const el = container.querySelector('span.text-neo-lime');
  return Number(el?.textContent ?? 'NaN');
};

describe('WordWheelGame — daily duplicate word is blocked', () => {
  it('scores the first find but rejects a re-submit of the same word with no extra points', async () => {
    const { container, onValidateWord } = mountGame();

    await submitCab();
    expect(onValidateWord).toHaveBeenCalledTimes(1);
    expect(readScore(container)).toBe(5);

    // Re-submit the exact same word.
    await submitCab();

    // Blocked: the already-found error toast shows, and there is NO reduced
    // "repeat bonus" success toast.
    expect(screen.getByText('wordWheel.alreadyFound')).toBeInTheDocument();
    expect(screen.queryByText('wordWheel.alreadyFoundBonus')).toBeNull();

    // No points awarded for the duplicate — score is unchanged.
    expect(readScore(container)).toBe(5);
  });
});
