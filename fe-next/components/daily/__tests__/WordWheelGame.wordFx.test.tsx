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

const tap = (letter: string) => fireEvent.click(document.querySelector(`[data-wheel-letter="${letter}"]`)!);

const drag = (letters: string[]) => {
  const orbit = screen.getByTestId('wheel-orbit');
  const at = (l: string) => vi.spyOn(document, 'elementFromPoint').mockImplementation(
    () => document.querySelector(`[data-wheel-letter="${l}"]`) as Element,
  );
  at(letters[0]);
  fireEvent.pointerDown(orbit, { clientX: 0, clientY: 0 });
  letters.slice(1).forEach((l, i) => { at(l); fireEvent.pointerMove(orbit, { clientX: i + 1, clientY: 0 }); });
  return orbit;
};

describe('WordWheelGame word reactions', () => {
  it('given an accepted five-letter word, then the disc stamps it, flies the points and launches the tiles', async () => {
    mountGame(true);
    ['C', 'A', 'B', 'E', 'D'].forEach(tap);
    await act(async () => { fireEvent.click(screen.getByTestId('inline-submit-chip')); });

    const fx = screen.getByTestId('wheel-disc-fx');
    expect(fx.dataset.kind).toBe('good');
    expect(screen.getByTestId('wheel-praise').textContent).toBe('wordWheel.praise.great');
    expect(screen.getByTestId('wheel-points-fly').textContent).toBe('+5');
    expect(screen.getAllByTestId('wheel-launch-letter').map(el => el.textContent)).toEqual(['C', 'A', 'B', 'E', 'D']);
    expect(screen.getAllByTestId('wheel-letter-burst')).toHaveLength(5);
    expect(screen.queryAllByTestId('built-letter-tile')).toHaveLength(0);
  });

  it('given a three-letter word, then there is no praise stamp but the points still fly', async () => {
    mountGame(true);
    ['C', 'A', 'B'].forEach(tap);
    await act(async () => { fireEvent.click(screen.getByTestId('inline-submit-chip')); });
    expect(screen.queryByTestId('wheel-praise')).toBeNull();
    expect(screen.getByTestId('wheel-points-fly')).toBeInTheDocument();
  });

  it('given a word that uses all but one wheel letter, then the coverage banner owns the moment and no stamp shows', async () => {
    mountGame(true);
    ['C', 'A', 'B', 'E', 'D', 'F'].forEach(tap);
    await act(async () => { fireEvent.click(screen.getByTestId('inline-submit-chip')); });
    expect(screen.getByTestId('wheel-disc-fx').dataset.kind).toBe('good');
    expect(screen.queryByTestId('wheel-praise')).toBeNull();
  });

  it('given a rejected drag, then the wheel flashes red, the trail ghost shakes red and the tiles drop off the tray', async () => {
    mountGame(false);
    const orbit = drag(['C', 'B', 'D']);
    await act(async () => { fireEvent.pointerUp(orbit); });

    expect(screen.getByTestId('wheel-disc-fx').dataset.kind).toBe('bad');
    expect(screen.getByTestId('wheel-trail-ghost').dataset.kind).toBe('bad');
    expect(screen.getByTestId('wheel-launch-fx').dataset.kind).toBe('bad');
    expect(screen.getAllByTestId('wheel-launch-letter')).toHaveLength(3);
    expect(screen.queryAllByTestId('built-letter-tile')).toHaveLength(0);
  });

  it('given a mid-drag word, then the live trail runs through the chosen letters', () => {
    mountGame(true);
    drag(['C', 'B', 'D']);
    expect(screen.getByTestId('wheel-trail-live').querySelectorAll('polyline')).toHaveLength(3);
    expect(document.querySelectorAll('[data-wheel-used="true"]')).toHaveLength(3);
  });
});
