/**
 * Funnel parity: WordWheelGame must emit `trackGameStart('word-wheel')`
 * once on mount to match the existing `trackGameEnd('word-wheel', ...)`
 * emission. Without this, the mode_started→game_completed funnel
 * shows word-wheel with 0 starts / 4 completions.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackGameStart = vi.fn();
const trackGameEnd = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...args: unknown[]) => trackGameStart(...args),
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
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
  isValidWordWheelWord: () => false,
}));

vi.mock('@/utils/dailyChallenge/wordWheelScoring', () => ({
  scoreWord: () => 0,
}));

beforeEach(() => {
  trackGameStart.mockClear();
  trackGameEnd.mockClear();
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
});

import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A',
  outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
  validWords: ['CAB'],
  language: 'en',
} as unknown as WordWheelPuzzle;

describe('WordWheelGame trackGameStart', () => {
  it("emits trackGameStart('word-wheel') once on mount", () => {
    render(
      <WordWheelGame
        puzzle={puzzle}
        duration={60}
        onComplete={vi.fn()}
        onValidateWord={vi.fn().mockResolvedValue(false)}
        onEffect={vi.fn()}
        language="en"
      />
    );
    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart).toHaveBeenCalledWith('word-wheel', expect.any(Object));
  });
});
