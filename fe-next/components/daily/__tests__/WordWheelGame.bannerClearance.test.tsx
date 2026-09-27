/**
 * Banner-clearance regression: the action-button bar (Clear / Submit / Shuffle)
 * must remain visible above the AdMob banner as the found-words list grows.
 *
 * Original bug: the playing wrapper used `pb-4` and the sticky bar used
 * `bottom: var(--bottom-stack-height)`. Because the wrapper is its own
 * scroll container (`overflow-y-auto`), `body.screen-fit` padding never
 * reaches it, so its scroll-viewport bottom sat behind the ad.
 *
 * Current layout: action-bar lives INSIDE the flex-1 wheel cluster (glued
 * to the wheel, no sticky).
 *
 * Clearance is reserved EXACTLY ONCE, by `body.screen-fit-locked` in
 * globals.css. This file used to also require the game container to carry
 * `pb-bottom-stack` "for defence in depth" — but padding is additive, not
 * idempotent, so body + challenge playing wrapper + game container reserved
 * the band three times. Measured on Android-sized viewport with an AdMob
 * banner (--bottom-stack-height 154px): 3 x 154 = 462px lost from an 832px
 * viewport. The wheel cluster collapsed 434px -> 126px, its shrink-0 orbit
 * overflowed by 64px, and Submit rendered 60px on top of the found-words
 * chips. After reserving once: overlap 0, content bottom 678/832.
 *
 * So the assertion below is inverted on purpose: the game container must NOT
 * re-reserve. The inline-submit-chip near the word-builder still covers the
 * case where the found-words list scrolls the action-bar out of view.
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
  it('action-bar is inline (not sticky) and the container does NOT re-reserve the bottom stack', () => {
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

    // Inline action-bar testid lives next to wheel inside the flex cluster.
    const bar = screen.getByTestId('word-wheel-action-bar');
    expect(bar).toBeTruthy();
    const cls = bar.className;
    // No sticky positioning — would double-count against parent pb-bottom-stack
    // and create a 100–250px gap to the wheel on tall viewports.
    expect(cls).not.toMatch(/(?:^|\s)sticky(?:\s|$)/);
    expect(cls).not.toMatch(/(?:^|\s)bottom-0(?:\s|$)/);
    expect(cls).not.toMatch(/bottom-\[var\(--bottom-stack-height/);
    expect(bar.style.bottom).toBe('');

    // The bottom stack is reserved once, by body.screen-fit-locked. Nothing in
    // this component may reserve it again — see the file header for the 462px
    // triple-reservation this guards against.
    const doubleReserved = bar.closest('div.pb-bottom-stack') as HTMLElement | null;
    expect(
      doubleReserved,
      'WordWheelGame re-reserves --bottom-stack-height; body.screen-fit-locked ' +
        'already does. Padding is additive — this compounds into hundreds of ' +
        'lost px on Android with an AdMob banner.',
    ).toBeNull();
  });

  it('inline-submit-chip remains accessible as a primary CTA when word is built', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
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
    // Tap a wheel letter so the chip mounts (chip is gated on builtLetters.length > 0).
    const a = screen.getByRole('button', { name: 'A' });
    await user.click(a);
    expect(screen.getByTestId('inline-submit-chip')).toBeTruthy();
  });
});
