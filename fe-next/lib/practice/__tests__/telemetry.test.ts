/**
 * Practice telemetry helper tests.
 *
 * Mirrors the drill telemetry shape (`drill_*` → `practice_*`) so funnels
 * are consistent across the app: we want started/completed pairs so the
 * funnel "tile tap → start → complete → chain" is computable.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captureMock = vi.fn();

vi.mock('posthog-js', () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    __loaded: true,
  },
}));

import {
  trackPracticeStarted,
  trackPracticeWordFound,
  trackPracticeCompleted,
  trackPracticeChainClicked,
} from '../telemetry';

describe('practice telemetry', () => {
  beforeEach(() => {
    captureMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('practice_started fires with mode + locale when sandbox mounts', () => {
    trackPracticeStarted({ mode: 'classic', locale: 'en' });

    expect(captureMock).toHaveBeenCalledWith('practice_started', {
      mode: 'classic',
      locale: 'en',
    });
  });

  it('practice_word_found fires per accepted word with running count', () => {
    trackPracticeWordFound({
      mode: 'classic',
      locale: 'he',
      word: 'שלום',
      wordsFound: 2,
    });

    expect(captureMock).toHaveBeenCalledWith('practice_word_found', {
      mode: 'classic',
      locale: 'he',
      word: 'שלום',
      words_found: 2,
    });
  });

  it('practice_completed mirrors session payload at goal-hit moment', () => {
    trackPracticeCompleted({
      mode: 'wheelRush',
      locale: 'es',
      wordsFound: 3,
      durationSeconds: 47,
      streakDay: 5,
    });

    expect(captureMock).toHaveBeenCalledWith('practice_completed', {
      mode: 'wheelRush',
      locale: 'es',
      words_found: 3,
      duration_seconds: 47,
      streak_day: 5,
    });
  });

  it('practice_chain_clicked tags from-mode + to-mode (or null at chain-end)', () => {
    trackPracticeChainClicked({ fromMode: 'classic', toMode: 'wordHunt' });
    expect(captureMock).toHaveBeenCalledWith('practice_chain_clicked', {
      from_mode: 'classic',
      to_mode: 'wordHunt',
    });

    trackPracticeChainClicked({ fromMode: 'wheelRush', toMode: null });
    expect(captureMock).toHaveBeenCalledWith('practice_chain_clicked', {
      from_mode: 'wheelRush',
      to_mode: null,
    });
  });

  it('never throws if posthog.capture itself throws', () => {
    captureMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    expect(() =>
      trackPracticeStarted({ mode: 'classic', locale: 'en' })
    ).not.toThrow();
  });
});
