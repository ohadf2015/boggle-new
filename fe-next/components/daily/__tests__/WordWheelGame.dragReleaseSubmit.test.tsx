import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
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

const letterEl = (l: string) => document.querySelector(`[data-wheel-letter="${l}"]`) as HTMLButtonElement;

describe('WordWheelGame — drag release submits the word on screen', () => {
  it('validates every dragged letter even when release lands before a re-render', async () => {
    const { onValidateWord } = mountGame();
    const orbit = document.querySelector('[data-testid="wheel-orbit"]') as HTMLElement;
    const path = ['C', 'B', 'A'];
    let at = path[0];
    document.elementFromPoint = vi.fn(() => letterEl(at)) as unknown as typeof document.elementFromPoint;

    await act(async () => {
      fireEvent.pointerDown(orbit, { clientX: 1, clientY: 1 });
      for (const l of path.slice(1)) {
        at = l;
        fireEvent.pointerMove(orbit, { clientX: 2, clientY: 2 });
      }
      fireEvent.pointerUp(orbit);
    });

    expect(onValidateWord).toHaveBeenCalledTimes(1);
    expect(onValidateWord).toHaveBeenCalledWith('CBA');
  });

  it('a slow drag is not auto-submitted while the finger is still down', async () => {
    vi.useFakeTimers();
    try {
      const { onValidateWord } = mountGame();
      const orbit = document.querySelector('[data-testid="wheel-orbit"]') as HTMLElement;
      let at = 'C';
      document.elementFromPoint = vi.fn(() => letterEl(at)) as unknown as typeof document.elementFromPoint;

      act(() => { fireEvent.pointerDown(orbit, { clientX: 1, clientY: 1 }); });
      for (const l of ['B', 'A']) {
        at = l;
        act(() => { fireEvent.pointerMove(orbit, { clientX: 2, clientY: 2 }); });
      }
      act(() => { vi.advanceTimersByTime(1500); });
      expect(onValidateWord).not.toHaveBeenCalled();

      await act(async () => { fireEvent.pointerUp(orbit); });
      expect(onValidateWord).toHaveBeenCalledTimes(1);
      expect(onValidateWord).toHaveBeenCalledWith('CBA');
    } finally {
      vi.useRealTimers();
    }
  });
});
