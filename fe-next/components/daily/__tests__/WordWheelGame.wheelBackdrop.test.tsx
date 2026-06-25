/**
 * Wheel backdrop depth regression.
 *
 * Bug: the circular play area behind the letter wheel read as flat solid
 * black. The wheel-orbit box itself carries no background — it relied on the
 * stage-level radial gradient showing through. But the wheel sits lower than
 * the stage gradient's bright center and is ringed by additive glow, so the
 * disc behind the letters read as near-black instead of the gradient depth it
 * used to have.
 *
 * Fix contract: the wheel-orbit must contain an always-on radial-gradient
 * backdrop disc (centered on the wheel) so the letters sit on visible depth
 * regardless of the stage gradient or pixi layer.
 */
import React from 'react';
import { render } from '@testing-library/react';
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

const puzzle = {
  centerLetter: 'A',
  outerLetters: ['C', 'T', 'R', 'S', 'N', 'E'],
  allLetters: ['A', 'C', 'T', 'R', 'S', 'N', 'E'],
} as unknown as Parameters<typeof WordWheelGame>[0]['puzzle'];

describe('WordWheelGame — wheel backdrop depth', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  it('renders an always-on radial-gradient backdrop disc behind the wheel', () => {
    const { container } = render(
      <WordWheelGame
        puzzle={puzzle}
        duration={120}
        onComplete={vi.fn()}
        onValidateWord={vi.fn().mockResolvedValue(true)}
        onEffect={vi.fn()}
        language="en"
      />,
    );

    const orbit = container.querySelector('[data-testid="wheel-orbit"]')!;
    expect(orbit).toBeTruthy();

    const backdrop = orbit.querySelector('[data-testid="wheel-backdrop"]') as HTMLElement | null;
    expect(backdrop).toBeTruthy();

    // A radial gradient that lifts the disc center above the flat-black navy
    // edge — NOT a solid fill.
    expect(backdrop!.style.background).toContain('radial-gradient');
    expect(backdrop!.style.background).toContain('--neo-navy-elevated');
  });
});
