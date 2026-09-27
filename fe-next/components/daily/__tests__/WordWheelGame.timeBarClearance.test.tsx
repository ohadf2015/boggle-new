/**
 * Time-bar clearance regression.
 *
 * UX bug (reported from a live session): on the daily Word Wheel, the
 * built-word tiles render a red "×" remove badge at `-top-1.5` (see
 * WordWheelParts → WordTile). The word-builder is an immediate sibling of
 * the timer/score block, whose last child is the thin `h-1.5` time progress
 * bar — with NO gap between them. The badge therefore sits flush against the
 * time bar, and the builder's `scale` growth animation pushes the badges up
 * over it. The letter-tile feedback visually hides the time bar.
 *
 * Fix contract:
 *   - The word-builder must reserve top margin so the tile feedback (× badges)
 *     clears the time progress bar above it.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
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
  scoreWord: (w: string) => w.length,
}));

import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle: WordWheelPuzzle = {
  centerLetter: 'A',
  outerLetters: ['C', 'T', 'R', 'S', 'N', 'E'],
  allLetters: ['A', 'C', 'T', 'R', 'S', 'N', 'E'],
} as unknown as WordWheelPuzzle;

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
});

describe('WordWheelGame — time-bar clearance', () => {
  it('word-builder reserves top margin so the × tile badges clear the time bar', () => {
    render(
      <WordWheelGame
        puzzle={puzzle}
        duration={120}
        onComplete={vi.fn()}
        onValidateWord={vi.fn().mockResolvedValue(true)}
        onEffect={vi.fn()}
        language="en"
      />,
    );

    const builder = screen.getByTestId('word-builder');
    // A top margin separates the tile feedback (× badges at -top-1.5) from the
    // thin time progress bar directly above it.
    expect(builder.className).toMatch(/(?:^|\s)mt-2(?:\s|$)/);
  });
});
