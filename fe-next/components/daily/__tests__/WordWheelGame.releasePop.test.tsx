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
    expect(screen.getByTestId('word-builder').dataset.state).toBe('checking');
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

  it('given an accepted word, then the wheel stays put and the spelled letters light up in place, one after another', async () => {
    mountGame(Promise.resolve(true));
    ['C', 'A', 'B'].forEach(tap);
    await act(async () => { fireEvent.click(screen.getByTestId('inline-submit-chip')); });

    const ring = screen.getByTestId('wheel-letters');
    expect(ring.dataset.spin).toBeUndefined();
    expect(ring.className).not.toMatch(/spin/);
    const lit = Array.from(document.querySelectorAll<HTMLElement>('[data-wheel-celebrate="true"]'));
    const bySpelling = lit.sort((x, y) => Number(x.style.getPropertyValue('--ww-order')) - Number(y.style.getPropertyValue('--ww-order')));
    expect(bySpelling.map((el) => el.dataset.wheelLetter)).toEqual(['C', 'A', 'B']);
    expect(bySpelling.map((el) => el.style.getPropertyValue('--ww-order'))).toEqual(['0', '1', '2']);
  });

  it('given letters still celebrating, when the next swipe starts, then the glow clears under the finger', async () => {
    mountGame(Promise.resolve(true));
    ['C', 'A', 'B'].forEach(tap);
    await act(async () => { fireEvent.click(screen.getByTestId('inline-submit-chip')); });
    expect(document.querySelectorAll('[data-wheel-celebrate="true"]')).toHaveLength(3);
    fireEvent.pointerDown(screen.getByTestId('wheel-orbit'), { clientX: 0, clientY: 0 });
    expect(document.querySelectorAll('[data-wheel-celebrate="true"]')).toHaveLength(0);
  });

  it('given the wheel at rest, then no decorative layer rotates', () => {
    mountGame(Promise.resolve(true));
    const face = screen.getByTestId('wheel-face');
    expect(face.querySelector('[class*="animate-[spin"]')).toBeNull();
  });

  it('given a rejected word, then no letter celebrates and the release gives way to the red reaction', async () => {
    const verdict = deferred();
    mountGame(verdict.promise);
    const orbit = drag(['A', 'C', 'B']);
    await act(async () => { fireEvent.pointerUp(orbit); });
    await act(async () => { verdict.resolve(false); });
    expect(screen.queryByTestId('wheel-release')).toBeNull();
    expect(screen.getByTestId('wheel-disc-fx').dataset.kind).toBe('bad');
    expect(document.querySelectorAll('[data-wheel-celebrate="true"]')).toHaveLength(0);
  });
});
