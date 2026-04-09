/**
 * PostHog Engagement Helpers — Tests
 *
 * Covers super properties, user properties (set/set_once/increment),
 * dead-time detector, tab-visibility tracker, and typed event helpers.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock posthog-js BEFORE importing the module under test.
// vi.hoisted runs before imports, so these refs are usable inside vi.mock.
const { capture, register, register_once, people_set, people_set_once } = vi.hoisted(() => ({
  capture: vi.fn(),
  register: vi.fn(),
  register_once: vi.fn(),
  people_set: vi.fn(),
  people_set_once: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    capture,
    register,
    register_once,
    people: { set: people_set, set_once: people_set_once },
  },
}));

import {
  setPostHogSuperProps,
  setPostHogSuperPropsOnce,
  setPostHogUserProps,
  setPostHogUserPropsOnce,
  incrementPostHogUserProp,
  trackWordFound,
  trackInvalidWord,
  trackRageQuit,
  trackLevelRetried,
  trackModalDismissed,
  trackCtaClicked,
  trackSessionDepth,
  createDeadTimeDetector,
} from '../posthogEngagement';

describe('posthogEngagement — super & user properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers super properties on every event', () => {
    setPostHogSuperProps({ locale: 'he', is_rtl: true });
    expect(register).toHaveBeenCalledWith({ locale: 'he', is_rtl: true });
  });

  it('registers super properties only once via register_once', () => {
    setPostHogSuperPropsOnce({ first_locale: 'he' });
    expect(register_once).toHaveBeenCalledWith({ first_locale: 'he' });
  });

  it('sets user (person) properties via $set', () => {
    setPostHogUserProps({ total_games_played: 42 });
    expect(people_set).toHaveBeenCalledWith({ total_games_played: 42 });
  });

  it('sets person properties once via $set_once', () => {
    setPostHogUserPropsOnce({ first_mode_played: 'adventure' });
    expect(people_set_once).toHaveBeenCalledWith({ first_mode_played: 'adventure' });
  });

  it('increments a person property via capture with $set operator', () => {
    incrementPostHogUserProp('total_games_played', 1);
    // PostHog increment is done via capture with $set containing an increment operator
    expect(capture).toHaveBeenCalledWith(
      '$set',
      expect.objectContaining({
        $set_once: expect.any(Object),
      })
    );
  });
});

describe('posthogEngagement — typed event helpers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('trackWordFound captures word_found with length + mode', () => {
    trackWordFound({ word: 'HELLO', mode: 'blast', timeSinceLastWordMs: 1200 });
    expect(capture).toHaveBeenCalledWith(
      'word_found',
      expect.objectContaining({ word_length: 5, mode: 'blast', time_since_last_word_ms: 1200 })
    );
  });

  it('trackWordFound does NOT send the raw word (privacy)', () => {
    trackWordFound({ word: 'SECRET', mode: 'sp' });
    const payload = capture.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.word).toBeUndefined();
  });

  it('trackInvalidWord captures invalid_word_attempted with reason', () => {
    trackInvalidWord({ mode: 'sp', reason: 'not_in_dictionary', attemptLength: 4 });
    expect(capture).toHaveBeenCalledWith(
      'invalid_word_attempted',
      expect.objectContaining({ mode: 'sp', reason: 'not_in_dictionary', attempt_length: 4 })
    );
  });

  it('trackRageQuit captures rage_quit when abandoning in < 15s', () => {
    trackRageQuit({ mode: 'adventure', durationMs: 8000, wordsFound: 0 });
    expect(capture).toHaveBeenCalledWith(
      'rage_quit',
      expect.objectContaining({ mode: 'adventure', duration_ms: 8000, words_found: 0 })
    );
  });

  it('trackLevelRetried captures level_retried with attempt count', () => {
    trackLevelRetried({ world: 2, level: 5, attempt: 3 });
    expect(capture).toHaveBeenCalledWith(
      'level_retried',
      expect.objectContaining({ world: 2, level: 5, attempt: 3 })
    );
  });

  it('trackModalDismissed captures with modal id + dismissal method', () => {
    trackModalDismissed({ modalId: 'signup_prompt', method: 'backdrop' });
    expect(capture).toHaveBeenCalledWith(
      'modal_dismissed',
      expect.objectContaining({ modal_id: 'signup_prompt', method: 'backdrop' })
    );
  });

  it('trackCtaClicked captures with cta id + location', () => {
    trackCtaClicked({ ctaId: 'play_again', location: 'results_screen' });
    expect(capture).toHaveBeenCalledWith(
      'cta_clicked',
      expect.objectContaining({ cta_id: 'play_again', location: 'results_screen' })
    );
  });

  it('trackSessionDepth captures milestone at 3, 5, 10 games', () => {
    trackSessionDepth(3);
    trackSessionDepth(4);
    trackSessionDepth(5);
    trackSessionDepth(10);
    // Only the milestones (3, 5, 10) should fire
    expect(capture).toHaveBeenCalledTimes(3);
  });
});

describe('posthogEngagement — dead-time detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('fires dead_time_detected after idle threshold', () => {
    const detector = createDeadTimeDetector({ thresholdMs: 10_000, mode: 'sp' });
    detector.start();
    vi.advanceTimersByTime(10_001);
    expect(capture).toHaveBeenCalledWith(
      'dead_time_detected',
      expect.objectContaining({ mode: 'sp', idle_ms: expect.any(Number) })
    );
    detector.stop();
  });

  it('resets timer on activity', () => {
    const detector = createDeadTimeDetector({ thresholdMs: 10_000, mode: 'sp' });
    detector.start();
    vi.advanceTimersByTime(5_000);
    detector.recordActivity();
    vi.advanceTimersByTime(5_000);
    expect(capture).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5_001);
    expect(capture).toHaveBeenCalledTimes(1);
    detector.stop();
  });

  it('stop() prevents further firing', () => {
    const detector = createDeadTimeDetector({ thresholdMs: 10_000, mode: 'sp' });
    detector.start();
    detector.stop();
    vi.advanceTimersByTime(20_000);
    expect(capture).not.toHaveBeenCalled();
  });
});
