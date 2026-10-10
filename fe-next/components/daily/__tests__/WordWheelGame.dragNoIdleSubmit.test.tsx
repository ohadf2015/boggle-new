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
    playWordLengthSound: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWordWheelKeyboard', () => ({
  useWordWheelKeyboard: () => ({ keyboardFocused: false }),
}));

vi.mock('@/hooks/useEquippedCosmetic', () => ({
  useEquippedCosmetic: () => null,
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

const mountGame = (validateResult: boolean) => {
  const onValidateWord = vi.fn().mockResolvedValue(validateResult);
  const utils = render(
    <WordWheelGame
      puzzle={puzzle}
      duration={60}
      onComplete={vi.fn()}
      onValidateWord={onValidateWord}
      onEffect={vi.fn()}
      language="en"
    />
  );
  return { ...utils, onValidateWord };
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const pointAt = (letter: string) => {
  vi.spyOn(document, 'elementFromPoint').mockImplementation(
    () => document.querySelector(`[data-wheel-letter="${letter}"]`) as Element,
  );
};

describe('WordWheelGame drag holds off the idle auto-submit', () => {
  it('given a slow drag past three letters, when the finger is still down, then nothing submits until release', async () => {
    const { onValidateWord } = mountGame(true);
    const orbit = screen.getByTestId('wheel-orbit');
    pointAt('C');
    fireEvent.pointerDown(orbit, { clientX: 1, clientY: 1 });
    pointAt('A');
    fireEvent.pointerMove(orbit, { clientX: 2, clientY: 2 });
    await act(async () => { await sleep(200); });
    pointAt('B');
    fireEvent.pointerMove(orbit, { clientX: 3, clientY: 3 });

    await act(async () => { await sleep(1300); });
    expect(onValidateWord).not.toHaveBeenCalled();

    await act(async () => { fireEvent.pointerUp(orbit); });
    await act(async () => { await sleep(50); });
    expect(onValidateWord).toHaveBeenCalledTimes(1);
    expect(onValidateWord).toHaveBeenCalledWith('CAB');
  }, 6000);
});
