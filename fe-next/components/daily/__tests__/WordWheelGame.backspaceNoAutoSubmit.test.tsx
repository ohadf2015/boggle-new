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

const tap = (selector: string) => {
  const el = document.querySelector(selector) as HTMLButtonElement | null;
  if (!el) throw new Error(`No element matching ${selector}`);
  fireEvent.click(el);
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('WordWheelGame backspace does not race the idle auto-submit', () => {
  it('leaves a word trimmed by backspace on the board instead of submitting it 1s later', async () => {
    const { onValidateWord } = mountGame(true);
    tap('[data-wheel-letter="C"]');
    tap('[data-wheel-letter="A"]');
    tap('[data-wheel-letter="B"]');
    tap('[data-wheel-letter="D"]');
    fireEvent.click(screen.getByLabelText('wordWheel.removeLetter'));

    await act(async () => { await sleep(1300); });
    expect(onValidateWord).not.toHaveBeenCalled();
    expect(screen.getAllByLabelText(/wordWheel\.tapToRemove/).filter(el => !el.hasAttribute('data-wheel-letter'))).toHaveLength(3);
  }, 5000);

  it('re-arms the idle auto-submit once the player adds a letter again', async () => {
    const { onValidateWord } = mountGame(true);
    tap('[data-wheel-letter="C"]');
    tap('[data-wheel-letter="A"]');
    tap('[data-wheel-letter="B"]');
    tap('[data-wheel-letter="D"]');
    fireEvent.click(screen.getByLabelText('wordWheel.removeLetter'));
    tap('[data-wheel-letter="E"]');

    await act(async () => { await sleep(1300); });
    expect(onValidateWord).toHaveBeenCalledTimes(1);
  }, 5000);
});
