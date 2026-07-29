/**
 * Auto-reset on error.
 *
 * UX: when a submitted word is rejected (not in dictionary, missing center,
 * etc.) the player previously had to tap the manual reset/clear button to
 * clear built letters. Now the wheel auto-resets ~2.5s after the error so
 * the message is readable and the next attempt starts fresh — but a fresh
 * tap during that window cancels the pending reset (no mid-typing wipe).
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
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

const buildAndSubmitInvalidWord = async () => {
  tap('[data-wheel-letter="C"]');
  tap('[data-wheel-letter="A"]');
  tap('[data-wheel-letter="B"]');
  await act(async () => {
    fireEvent.click(screen.getByTestId('inline-submit-chip'));
    await Promise.resolve(); // flush onValidateWord
    await Promise.resolve();
  });
};

// WordTile renders one button per built letter, each with aria-label suffix
// `wordWheel.tapToRemove`. Count = number of letters currently in the builder.
const builtLetterCount = () =>
  screen.queryAllByLabelText(/wordWheel\.tapToRemove/).filter(el => {
    // WheelLetter (used outer letters) also carries "tapToRemove" in aria-label
    // when isUsed; restrict to WordTile buttons by excluding wheel data attrs.
    return !el.hasAttribute('data-wheel-letter');
  }).length;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

describe('WordWheelGame auto-reset after invalid submission', () => {
  it('clears the built word ~1.5s after dictionary rejection (tap-mode) without a manual reset click', async () => {
    mountGame(false); // dictionary says invalid

    await buildAndSubmitInvalidWord();

    // Letters still on screen + error toast visible immediately after rejection.
    expect(screen.getByText('wordWheel.notInDictionary')).toBeInTheDocument();
    expect(builtLetterCount()).toBeGreaterThan(0);

    // Just before 1.5s — letters still present.
    await act(async () => { await sleep(1200); });
    expect(builtLetterCount()).toBeGreaterThan(0);

    // After 1.5s — auto-reset fires (for tap/idle mode).
    // The test uses tap submit (not drag), so auto-reset waits 1500ms.
    await waitFor(() => {
      expect(builtLetterCount()).toBe(0);
    }, { timeout: 1000 });
  }, 6000);

  it('cancels the pending auto-reset when the player taps a new letter mid-window', async () => {
    mountGame(false);

    await buildAndSubmitInvalidWord();
    expect(builtLetterCount()).toBeGreaterThan(0);

    // 0.8s into the 1.5s window — player taps a fresh letter to retry.
    // This resets the timeout (any builtLetters change cancels pending auto-reset).
    await act(async () => { await sleep(800); });
    tap('[data-wheel-letter="D"]');

    // Past the original 1.5s mark — the builder must still hold letters
    // (the fresh tap cancelled the pending reset and restarted any auto-reset timer).
    await act(async () => { await sleep(1000); });
    expect(builtLetterCount()).toBeGreaterThan(0);
  }, 6000);
});
