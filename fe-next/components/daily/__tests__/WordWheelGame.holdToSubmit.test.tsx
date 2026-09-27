/**
 * Hold-to-submit ring: once the built word is already at the minimum length,
 * press-and-holding a wheel letter for HOLD_SUBMIT_MS auto-submits the word.
 * Unused held letters are eager-added on pointerdown; quick release / drag
 * do not trigger a submit.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  validWords: ['CAB', 'CABD'],
  language: 'en',
} as unknown as WordWheelPuzzle;

const mountGame = (
  overrides: Partial<React.ComponentProps<typeof WordWheelGame>> = {},
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
    />,
  );
  return { ...utils, onValidateWord };
};

const getBtn = (selector: string) => {
  const el = document.querySelector(selector) as HTMLButtonElement | null;
  if (!el) throw new Error(`No element matching ${selector}`);
  return el;
};

const tap = (selector: string) => {
  fireEvent.click(getBtn(selector));
};

const builtTileCount = () =>
  document.querySelectorAll('[data-testid="built-letter-tile"]').length;

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
  vi.useFakeTimers({ shouldAdvanceTime: false });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('WordWheelGame hold-to-submit', () => {
  it('does not show the ring or submit when the word is below minimum length', async () => {
    const { onValidateWord } = mountGame();
    tap('[data-wheel-letter="C"]');
    tap('[data-wheel-letter="A"]'); // length = 2
    await act(async () => {
      fireEvent.pointerDown(getBtn('[data-wheel-letter="B"]'));
      await vi.advanceTimersByTimeAsync(1200);
    });
    expect(screen.queryByTestId('hold-ring')).toBeNull();
    expect(onValidateWord).not.toHaveBeenCalled();
  });

  it('shows the ring on pointerdown of a letter once the word is at minimum length', async () => {
    mountGame();
    tap('[data-wheel-letter="C"]');
    tap('[data-wheel-letter="A"]');
    tap('[data-wheel-letter="B"]'); // length = 3
    await act(async () => {
      fireEvent.pointerDown(getBtn('[data-wheel-letter="D"]'));
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(screen.getByTestId('hold-ring')).toBeInTheDocument();
  });

  it('eager-adds the held letter so the submitted word includes it', async () => {
    const { onValidateWord } = mountGame();
    tap('[data-wheel-letter="C"]');
    tap('[data-wheel-letter="A"]');
    tap('[data-wheel-letter="B"]');
    await act(async () => {
      fireEvent.pointerDown(getBtn('[data-wheel-letter="D"]'));
      await vi.advanceTimersByTimeAsync(850); // > 800ms HOLD_SUBMIT_MS
    });
    expect(onValidateWord).toHaveBeenCalledWith('CABD');
  });

  it('quick release keeps the eager-added letter but does not submit', async () => {
    const { onValidateWord } = mountGame();
    tap('[data-wheel-letter="C"]');
    tap('[data-wheel-letter="A"]');
    tap('[data-wheel-letter="B"]');
    const btnD = getBtn('[data-wheel-letter="D"]');
    await act(async () => {
      fireEvent.pointerDown(btnD);
      await vi.advanceTimersByTimeAsync(200);
      fireEvent.pointerUp(btnD);
      fireEvent.click(btnD); // trailing onClick must be suppressed
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(onValidateWord).not.toHaveBeenCalled();
    expect(builtTileCount()).toBe(4); // C A B D
  });

  it('quick release on an already-used letter still removes it', async () => {
    mountGame();
    tap('[data-wheel-letter="C"]');
    tap('[data-wheel-letter="A"]');
    tap('[data-wheel-letter="B"]');
    const btnC = getBtn('[data-wheel-letter="C"]');
    await act(async () => {
      fireEvent.pointerDown(btnC);
      await vi.advanceTimersByTimeAsync(150);
      fireEvent.pointerUp(btnC);
      fireEvent.click(btnC);
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(builtTileCount()).toBe(2); // C removed → A B
  });

  it('hold-complete on an already-used letter submits without removing it', async () => {
    const { onValidateWord } = mountGame();
    tap('[data-wheel-letter="C"]');
    tap('[data-wheel-letter="A"]');
    tap('[data-wheel-letter="B"]');
    const btnC = getBtn('[data-wheel-letter="C"]');
    await act(async () => {
      fireEvent.pointerDown(btnC);
      await vi.advanceTimersByTimeAsync(850);
      fireEvent.pointerUp(btnC);
      fireEvent.click(btnC); // trailing onClick must be suppressed
    });
    expect(onValidateWord).toHaveBeenCalledWith('CAB');
  });
});
