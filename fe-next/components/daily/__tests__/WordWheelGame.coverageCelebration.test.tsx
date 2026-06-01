/**
 * Daily Word Wheel — "you used the whole wheel" celebration.
 *
 * The daily game shipped with a dead pangram check (`word.length >= 9`), which
 * is unreachable: a 7-letter wheel caps valid words at 7 chars. MP Wheel Rush
 * already had the real feat celebration (classifyLetterCoverage + the
 * WheelRushCelebration banner). These tests lock the daily game onto that same
 * shared path:
 *   - a word covering ALL distinct wheel letters → tier="all" banner,
 *     legendary sound, and the dormant Pixi `pangram` mega-burst effect.
 *   - a word covering all-but-one (≥5) → tier="almost" banner (lighter touch).
 *   - an ordinary word → no banner.
 */
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

const { legendarySpy, fireConfettiSpy } = vi.hoisted(() => ({
  legendarySpy: vi.fn(),
  fireConfettiSpy: vi.fn(),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playComboSound: vi.fn(),
    playLegendaryWordSound: legendarySpy,
    playEpicVictorySound: vi.fn(),
    playCountdownBeep: vi.fn(),
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

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: fireConfettiSpy }));

// Real letter-validity (so coverage reflects the actual wheel); dictionary is
// the async onValidateWord prop, mocked true below.
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', async () => {
  const actual = await vi.importActual<typeof import('@/utils/dailyChallenge/wordWheelGeneration')>(
    '@/utils/dailyChallenge/wordWheelGeneration',
  );
  return { ...actual };
});

import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A',
  outerLetters: ['C', 'T', 'R', 'S', 'N', 'E'],
  allLetters: ['A', 'C', 'T', 'R', 'S', 'N', 'E'],
  puzzleDate: '2026-06-01',
  language: 'en',
  puzzleNumber: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
});

const mountGame = (overrides: Partial<React.ComponentProps<typeof WordWheelGame>> = {}) => {
  const onValidateWord = vi.fn().mockResolvedValue(true);
  const onEffect = vi.fn();
  const utils = render(
    <WordWheelGame
      puzzle={puzzle}
      duration={60}
      onComplete={vi.fn()}
      onValidateWord={onValidateWord}
      onEffect={onEffect}
      language="en"
      {...overrides}
    />,
  );
  return { ...utils, onValidateWord, onEffect };
};

const tapLetter = (letter: string) => {
  const el = document.querySelector(`[data-wheel-letter="${letter}"]`) as HTMLButtonElement | null;
  if (!el) throw new Error(`No wheel letter ${letter}`);
  fireEvent.click(el);
};

const buildAndSubmit = async (word: string) => {
  for (const ch of word) tapLetter(ch);
  await act(async () => {
    fireEvent.click(screen.getByTestId('inline-submit-chip'));
  });
};

describe('WordWheelGame coverage celebration', () => {
  it('shows the ALL-letters banner + pangram effect + legendary sound for a full-wheel word', async () => {
    const { onEffect } = mountGame();
    await buildAndSubmit('CANTERS'); // A C N T E R S → all 7 distinct wheel letters

    const banner = await screen.findByTestId('wheel-celebration');
    expect(banner).toHaveAttribute('data-tier', 'all');
    expect(legendarySpy).toHaveBeenCalled();
    expect(onEffect).toHaveBeenCalledWith(expect.objectContaining({ type: 'pangram' }));
  });

  it('shows the ALMOST banner (lighter) for an all-but-one word', async () => {
    mountGame();
    await buildAndSubmit('CANTER'); // C A N T E R → 6 of 7 distinct

    const banner = await screen.findByTestId('wheel-celebration');
    expect(banner).toHaveAttribute('data-tier', 'almost');
    // Lighter touch: no legendary sound, no pangram mega-burst for "almost".
    expect(legendarySpy).not.toHaveBeenCalled();
  });

  it('does not celebrate an ordinary word', async () => {
    const { onEffect } = mountGame();
    await buildAndSubmit('CAR'); // 3 distinct → none

    expect(screen.queryByTestId('wheel-celebration')).toBeNull();
    expect(onEffect).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'pangram' }));
  });
});
