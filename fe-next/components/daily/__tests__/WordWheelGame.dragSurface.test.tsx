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

const letterEl = (l: string) => document.querySelector(`[data-wheel-letter="${l}"]`) as HTMLButtonElement;

describe('WordWheelGame — a drag never turns into a text selection', () => {
  it('Given the wheel, When a press starts on it, Then the browser default (text selection / native drag) is cancelled', () => {
    mountGame();
    const orbit = document.querySelector('[data-testid="wheel-orbit"]') as HTMLElement;
    document.elementFromPoint = vi.fn(() => letterEl('B')) as unknown as typeof document.elementFromPoint;
    const notPrevented = fireEvent.pointerDown(orbit, { clientX: 1, clientY: 1 });
    expect(notPrevented).toBe(false);
    fireEvent.pointerUp(orbit);
  });

  it('Given a stray page selection, When a drag starts, Then the selection is cleared so the drag owns the pointer', () => {
    mountGame();
    const removeAllRanges = vi.fn();
    const spy = vi.spyOn(window, 'getSelection').mockReturnValue({ removeAllRanges, rangeCount: 1 } as unknown as Selection);
    const orbit = document.querySelector('[data-testid="wheel-orbit"]') as HTMLElement;
    document.elementFromPoint = vi.fn(() => letterEl('B')) as unknown as typeof document.elementFromPoint;
    fireEvent.pointerDown(orbit, { clientX: 1, clientY: 1 });
    expect(removeAllRanges).toHaveBeenCalled();
    fireEvent.pointerUp(orbit);
    spy.mockRestore();
  });

  it('Given the play surface, Then its text is unselectable and letters are not draggable', () => {
    mountGame();
    expect(screen.getByTestId('word-builder').closest('.select-none')).not.toBeNull();
    expect(letterEl('B').getAttribute('draggable')).toBe('false');
  });

  it('Given a first visit, Then no floating coach card covers the wheel', () => {
    vi.useFakeTimers();
    try {
      window.localStorage.clear();
      mountGame();
      act(() => { vi.advanceTimersByTime(2500); });
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('Given a straight swipe across the hub between opposite letters, Then the hub is not added', async () => {
    mountGame();
    const orbit = document.querySelector('[data-testid="wheel-orbit"]') as HTMLElement;
    const at: Record<string, string> = { '0,-100': 'B', '0,-50': 'B', '0,0': 'A', '0,50': 'E', '0,100': 'E', '50,100': 'F' };
    document.elementFromPoint = vi.fn((x: number, y: number) => letterEl(at[`${x},${y}`])) as unknown as typeof document.elementFromPoint;
    await act(async () => {
      fireEvent.pointerDown(orbit, { clientX: 0, clientY: -100 });
      for (const [x, y] of [[0, -50], [0, 0], [0, 50], [0, 100], [50, 100]]) {
        fireEvent.pointerMove(orbit, { clientX: x, clientY: y });
      }
    });
    const built = [...document.querySelectorAll('[data-testid="built-letter-tile"]')].map((el) => el.textContent).join('');
    expect(built).toBe('BEF');
    fireEvent.pointerUp(orbit);
  });
});

