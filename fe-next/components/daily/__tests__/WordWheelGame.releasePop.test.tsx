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

const mountGame = (verdict: Promise<boolean>) => {
  const onValidateWord = vi.fn().mockReturnValue(verdict);
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

const deferred = () => {
  let resolve: (v: boolean) => void = () => {};
  const promise = new Promise<boolean>((r) => { resolve = r; });
  return { promise, resolve };
};

describe('WordWheelGame release reaction', () => {
  it('given a word still out for a verdict, when the drag is released, then the wheel answers at once', async () => {
    const verdict = deferred();
    mountGame(verdict.promise);
    const orbit = drag(['A', 'C', 'B']);
    await act(async () => { fireEvent.pointerUp(orbit); });

    const release = screen.getByTestId('wheel-release');
    expect(release.dataset.word).toBe('ACB');
    expect(screen.getByTestId('word-tray').dataset.releasing).toBe('true');
    expect(screen.queryByTestId('wheel-disc-fx')).toBeNull();

    await act(async () => { verdict.resolve(true); });
    expect(screen.queryByTestId('wheel-release')).toBeNull();
    expect(screen.getByTestId('wheel-disc-fx').dataset.kind).toBe('good');
  });

  it('given a word still out for a verdict, then its letters pulse in the checking colour, not the accepted lime, one after another', async () => {
    const verdict = deferred();
    mountGame(verdict.promise);
    const orbit = drag(['A', 'C', 'B']);
    await act(async () => { fireEvent.pointerUp(orbit); });

    const rings = Array.from(screen.getByTestId('wheel-release').querySelectorAll<HTMLElement>('.ww-release-ring'));
    expect(rings).toHaveLength(3);
    rings.forEach((r) => {
      expect(r.className).toContain('border-neo-cyan');
      expect(r.className).not.toContain('border-neo-lime');
    });
    expect(rings.map((r) => r.style.animationDelay)).toEqual(['0ms', '70ms', '140ms']);
    await act(async () => { verdict.resolve(false); });
  });

  it('given an accepted word, then the letter ring spins once around the hub', async () => {
    mountGame(Promise.resolve(true));
    expect(screen.getByTestId('wheel-spin').dataset.spin).toBe('false');
    ['C', 'A', 'B'].forEach(tap);
    await act(async () => { fireEvent.click(screen.getByTestId('inline-submit-chip')); });
    expect(screen.getByTestId('wheel-spin').dataset.spin).toBe('true');
  });

  it('given a spin in flight, when the next swipe starts, then the letters snap home under the finger', async () => {
    mountGame(Promise.resolve(true));
    ['C', 'A', 'B'].forEach(tap);
    await act(async () => { fireEvent.click(screen.getByTestId('inline-submit-chip')); });
    expect(screen.getByTestId('wheel-spin').dataset.spin).toBe('true');
    fireEvent.pointerDown(screen.getByTestId('wheel-orbit'), { clientX: 0, clientY: 0 });
    expect(screen.getByTestId('wheel-spin').dataset.spin).toBe('false');
  });

  it('given a rejected word, then the ring does not spin and the release gives way to the red reaction', async () => {
    const verdict = deferred();
    mountGame(verdict.promise);
    const orbit = drag(['A', 'C', 'B']);
    await act(async () => { fireEvent.pointerUp(orbit); });
    await act(async () => { verdict.resolve(false); });
    expect(screen.queryByTestId('wheel-release')).toBeNull();
    expect(screen.getByTestId('wheel-disc-fx').dataset.kind).toBe('bad');
    expect(screen.getByTestId('wheel-spin').dataset.spin).toBe('false');
  });
});
