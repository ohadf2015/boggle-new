/**
 * WordCraft must emit the CANONICAL `game_started`, not only its bespoke event.
 *
 * THE DEFECT: `trackWordCraftGameStarted` captured `word_craft_game_started`
 * and nothing else, while completion routed through the shared `trackGameEnd`
 * (which emits `game_completed`). PostHog 30d therefore showed word-craft with
 * **0 starts and 11 completions** — the mode is invisible in every
 * started→completed funnel, and a completion with no matching start silently
 * corrupts any aggregate computed across modes.
 *
 * `crossword` had the identical shape (0 starts, N completions) and is fixed
 * alongside this in `lib/crossword/telemetry.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackGameStart = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...args: unknown[]) => trackGameStart(...args),
  trackGameEnd: vi.fn(),
}));

const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  __esModule: true,
  default: { capture: (...args: unknown[]) => capture(...args) },
}));

import { trackWordCraftGameStarted } from '../wordCraftTelemetry';

beforeEach(() => {
  trackGameStart.mockClear();
  capture.mockClear();
});

describe('trackWordCraftGameStarted', () => {
  it('emits the canonical game_started so the mode appears in funnels', () => {
    trackWordCraftGameStarted({ locale: 'en' });

    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart.mock.calls[0][0]).toBe('word-craft');
  });

  it('still emits the bespoke word_craft_game_started event', () => {
    trackWordCraftGameStarted({ locale: 'he' });

    const names = capture.mock.calls.map((c) => c[0]);
    expect(names).toContain('word_craft_game_started');
  });
});
