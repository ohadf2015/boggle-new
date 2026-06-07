/**
 * Blast telemetry must emit canonical cross-mode start/completion through the
 * shared growthTracking helpers (trackGameStart / trackGameEnd) — NOT raw
 * posthog.capture. The helpers persist to analytics_events, the admin game
 * log's source; the prior raw-capture path was PostHog-only, so solo Blast runs
 * never appeared in the admin log.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('posthog-js', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));

const trackGameStart = vi.fn();
const trackGameEnd = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...args: unknown[]) => trackGameStart(...args),
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
}));

import {
  trackBlastRunStarted,
  trackBlastRunEnded,
} from '../blastTelemetry';

describe('blastTelemetry — canonical cross-mode events', () => {
  beforeEach(() => {
    captureMock.mockClear();
    trackGameStart.mockClear();
    trackGameEnd.mockClear();
  });

  it('routes run start through trackGameStart(mode=blast) so it persists to analytics_events', () => {
    trackBlastRunStarted({ difficulty: 'hard', language: 'en' });
    expect(trackGameStart).toHaveBeenCalledWith(
      'blast',
      expect.objectContaining({ difficulty: 'hard', language: 'en' }),
    );
  });

  it('routes run end through trackGameEnd(blast, score, wordCount, completed=true)', () => {
    trackBlastRunEnded({
      finalScore: 9500,
      wavesCompleted: 3,
      maxCombo: 5,
      clearPct: 80,
      wordCount: 20,
      bestWordLength: 7,
      difficulty: 'medium',
    });
    expect(trackGameEnd).toHaveBeenCalledWith(
      'blast',
      9500,
      20,
      true,
      undefined,
      expect.objectContaining({ isWinner: true, difficulty: 'medium', wavesCompleted: 3 }),
    );
  });
});
