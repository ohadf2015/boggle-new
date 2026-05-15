import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
  },
}));

import posthog from 'posthog-js';
import {
  trackCascadeWordSubmitted,
  trackCascadeCombo,
  trackCascadeFireWarning,
  trackCascadeFireGameOver,
} from '../cascadeTelemetry';

const capture = vi.mocked(posthog.capture);

describe('cascade/cascadeTelemetry', () => {
  beforeEach(() => capture.mockReset());

  it('emits wordcraft_cascade_word_submitted exactly once per call', () => {
    trackCascadeWordSubmitted({
      round: 1,
      word: 'STAR',
      length: 4,
      baseScore: 4,
      chainCount: 1,
      totalScore: 4,
      comboCountThisRound: 0,
    });
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(
      'wordcraft_cascade_word_submitted',
      expect.objectContaining({ word: 'STAR', length: 4 }),
    );
  });

  it('emits wordcraft_cascade_combo with chain detail', () => {
    trackCascadeCombo({
      round: 2,
      chainCount: 3,
      totalScore: 42,
      chainWords: ['ART', 'STAR'],
    });
    expect(capture).toHaveBeenCalledWith(
      'wordcraft_cascade_combo',
      expect.objectContaining({ chainCount: 3, chainWords: ['ART', 'STAR'] }),
    );
  });

  it('emits wordcraft_cascade_fire_warning', () => {
    trackCascadeFireWarning({
      round: 1,
      fireRow: 4,
      totalRows: 7,
      secondsToTop: 27,
    });
    expect(capture).toHaveBeenCalledWith(
      'wordcraft_cascade_fire_warning',
      expect.objectContaining({ fireRow: 4 }),
    );
  });

  it('emits wordcraft_cascade_fire_gameover', () => {
    trackCascadeFireGameOver({
      round: 3,
      finalScore: 120,
      target: 350,
      passed: false,
    });
    expect(capture).toHaveBeenCalledWith(
      'wordcraft_cascade_fire_gameover',
      expect.objectContaining({ passed: false, round: 3 }),
    );
  });

  it('swallows posthog.capture errors silently', () => {
    capture.mockImplementationOnce(() => {
      throw new Error('posthog offline');
    });
    expect(() =>
      trackCascadeWordSubmitted({
        round: 1,
        word: 'X',
        length: 3,
        baseScore: 1,
        chainCount: 1,
        totalScore: 1,
        comboCountThisRound: 0,
      }),
    ).not.toThrow();
  });
});
