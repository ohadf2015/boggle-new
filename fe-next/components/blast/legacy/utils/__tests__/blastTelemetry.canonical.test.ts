/**
 * Blast telemetry must also emit canonical `game_started` / `game_completed`
 * with `mode: 'blast'` so cross-mode funnels & retention cohorts include
 * Blast runs without special-casing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('posthog-js', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));

import {
  trackBlastRunStarted,
  trackBlastRunEnded,
} from '../blastTelemetry';

describe('blastTelemetry — canonical cross-mode events', () => {
  beforeEach(() => captureMock.mockClear());

  it('emits canonical game_started with mode=blast on run start', () => {
    trackBlastRunStarted({ difficulty: 'hard', language: 'en' });
    expect(captureMock).toHaveBeenCalledWith(
      'game_started',
      expect.objectContaining({ mode: 'blast', difficulty: 'hard', language: 'en' }),
    );
  });

  it('emits canonical game_completed with mode=blast + score + wordCount', () => {
    trackBlastRunEnded({
      finalScore: 9500,
      wavesCompleted: 3,
      maxCombo: 5,
      clearPct: 80,
      wordCount: 20,
      bestWordLength: 7,
      difficulty: 'medium',
    });
    expect(captureMock).toHaveBeenCalledWith(
      'game_completed',
      expect.objectContaining({
        mode: 'blast',
        score: 9500,
        wordCount: 20,
      }),
    );
  });
});
