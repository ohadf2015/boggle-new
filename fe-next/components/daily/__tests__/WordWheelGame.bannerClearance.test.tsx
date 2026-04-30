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
 * to the wheel, no sticky). Clearance is owned solely by the playing
 * wrapper's `pb-bottom-stack` reservation. The container's own
 * `pb-bottom-stack` + the inline-submit-chip near the word-builder cover
 * the case where the found-words list scrolls the inline action-bar out of
 * view.
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
  it('action-bar is inline (not sticky); container reserves --bottom-stack-height', () => {
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

    // Game container reserves bottom-stack height so the inline bar (and the
    // found-words list below it) clear the AdMob banner.
    const container = bar.closest('div.pb-bottom-stack') as HTMLElement | null;
    expect(container).not.toBeNull();
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
