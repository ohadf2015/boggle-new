/**
 * Banner-clearance regression: the action-button bar (Clear / Submit / Shuffle)
 * must remain visible above the AdMob banner as the found-words list grows.
 *
 * Bug: the playing wrapper used `pb-4` and the sticky bar used
 * `bottom: var(--bottom-stack-height)`. Because the wrapper is its own
 * scroll container (`overflow-y-auto`), `body.screen-fit` padding never
 * reaches it, so its scroll-viewport bottom sat behind the ad. The sticky
 * pin point ended up under the banner.
 *
 * Fix: opt the playing wrapper into `pb-bottom-stack` and pin the sticky
 * bar to `bottom-0` (no double-counting).
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

describe('WordWheelGame action-bar banner clearance', () => {
  it('sticky action-bar uses bottom-0 (parent wrapper supplies stack-height padding)', () => {
    render(
      <WordWheelGame
        puzzle={puzzle}
        duration={60}
        onComplete={vi.fn()}
        onValidateWord={vi.fn().mockResolvedValue(true)}
        onEffect={vi.fn()}
        language="en"
      />
    );

    const submit = screen.getByText('wordWheel.submit');
    const bar = submit.closest('div.sticky') as HTMLElement | null;
    expect(bar).not.toBeNull();

    const cls = bar!.className;
    // Must pin to bottom-0 so the parent's pb-bottom-stack reservation governs
    // clearance — never `bottom-[var(--bottom-stack-height,...)]` (double count).
    expect(cls).toMatch(/(?:^|\s)bottom-0(?:\s|$)/);
    expect(cls).not.toMatch(/bottom-\[var\(--bottom-stack-height/);

    // Inline style must NOT specify a bottom (regression on the prior fix).
    expect(bar!.style.bottom).toBe('');
  });
});
