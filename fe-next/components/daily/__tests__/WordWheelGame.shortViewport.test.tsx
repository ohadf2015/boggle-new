/**
 * Short / landscape viewport regression (e.g. desktop 1136×473).
 *
 * Bug: the wheel's height cap relied solely on container-query units
 * (`max-h-[max(176px,calc(100cqb-116px))]`) with a hard 176px floor. When the
 * flex height-chain doesn't propagate a bounded height — or on a genuinely short
 * viewport — `cqb` resolves large, the cap never binds, and the wheel renders at
 * its fixed `h-96` (384px). That overflows the ~473px viewport, so the
 * `justify-center` cluster pushes the orbit letters into the instruction text
 * above and the FORMAR / action bar below.
 *
 * Fix: on short viewports the wheel is additionally capped by a *viewport*
 * fraction (`svh`) and given a lower floor + tightened chrome, so it always
 * shrinks to fit and can never overlap its siblings.
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

describe('WordWheelGame short-viewport wheel sizing', () => {
  function renderGame() {
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
    return screen.getByTestId('wheel-orbit');
  }

  it('caps the wheel by a viewport fraction (svh) on short viewports so it cannot overflow', () => {
    const orbit = renderGame();
    // A short:-prefixed max-height that references svh — guarantees the wheel is
    // bounded by the viewport even if the flex/cqb height-chain breaks down.
    expect(orbit.className).toMatch(/short:max-h-\[[^\]]*svh/);
    expect(orbit.className).toMatch(/short:max-w-\[[^\]]*svh/);
  });

  it('still keeps the unconstrained (tall-viewport) fixed sizing untouched', () => {
    const orbit = renderGame();
    // Base fixed sizes remain so tall phones/tablets are unchanged.
    expect(orbit.className).toMatch(/\bh-64\b/);
    expect(orbit.className).toMatch(/sm:h-80/);
    expect(orbit.className).toMatch(/md:h-96/);
  });

  it('locks the wheel to a square aspect ratio so it never ovals/stretches on desktop', () => {
    const orbit = renderGame();
    // 1:1 guarantee. The orbit ring + pixi decorations follow the box, so a
    // non-square box was the desktop "stretched / ring detached from letters" bug.
    expect(orbit.className).toMatch(/\baspect-square\b/);
    // It is NOT over-enlarged past the orbit's natural fill (md:w-96). The orbit
    // radius is min(w,h)-capped, so a bigger box only floats the ring away from
    // the centred letters — keep it contained.
    expect(orbit.className).not.toMatch(/lg:w-\[/);
    expect(orbit.className).not.toMatch(/xl:w-\[/);
  });
});

describe('WordWheelGame desktop container sizing', () => {
  it('frames the gameplay column with a centered max-width that grows on desktop', () => {
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
    // The main game container (translate="no") is a centered max-w column that
    // widens on large screens so it reads as an intentional app panel, not a
    // thin ribbon — while the wheel inside stays square (see test above).
    const gameContainer = screen.getByTestId('wheel-orbit').closest('[translate="no"]');
    expect(gameContainer?.className).toMatch(/\bmax-w-lg\b/);
    expect(gameContainer?.className).toMatch(/lg:max-w-/);
  });
});
