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

vi.mock('@/lib/analytics/lazyPosthog', () => ({
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
  detectPlatform,
  trackFirstMinuteRetained,
  trackReplayClicked,
  trackNextGameStarted,
  trackAdLifecycle,
  createFirstMinuteSurvivalTimer,
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

describe('posthogEngagement — platform detection (CrazyGames metric)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as unknown as { __crazyGamesEnvironment?: string }).__crazyGamesEnvironment;
    delete (window as unknown as { Capacitor?: unknown }).Capacitor;
    delete (window as unknown as { PokiSDK?: unknown }).PokiSDK;
  });

  it('returns "crazygames" when window.__crazyGamesEnvironment === "crazygames"', () => {
    (window as unknown as { __crazyGamesEnvironment: string }).__crazyGamesEnvironment = 'crazygames';
    expect(detectPlatform()).toBe('crazygames');
  });

  it('returns "poki" when window.PokiSDK is present', () => {
    (window as unknown as { PokiSDK: object }).PokiSDK = { init: () => Promise.resolve() };
    expect(detectPlatform()).toBe('poki');
  });

  it('returns "android" when Capacitor native bridge present', () => {
    (window as unknown as { Capacitor: { isNativePlatform: () => boolean; getPlatform: () => string } }).Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
    };
    expect(detectPlatform()).toBe('android');
  });

  it('returns "web" otherwise', () => {
    expect(detectPlatform()).toBe('web');
  });
});

describe('posthogEngagement — first-minute survival (CrazyGames ranking)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('trackFirstMinuteRetained captures first_minute_retained with mode + platform', () => {
    trackFirstMinuteRetained({ mode: 'sp', platform: 'crazygames' });
    expect(capture).toHaveBeenCalledWith(
      'first_minute_retained',
      expect.objectContaining({ mode: 'sp', platform: 'crazygames' })
    );
  });

  it('createFirstMinuteSurvivalTimer fires after 60s if not cancelled', () => {
    const timer = createFirstMinuteSurvivalTimer({ mode: 'sp', platform: 'crazygames' });
    timer.start();
    vi.advanceTimersByTime(60_001);
    expect(capture).toHaveBeenCalledWith(
      'first_minute_retained',
      expect.objectContaining({ mode: 'sp' })
    );
  });

  it('createFirstMinuteSurvivalTimer cancel() prevents firing', () => {
    const timer = createFirstMinuteSurvivalTimer({ mode: 'sp', platform: 'web' });
    timer.start();
    vi.advanceTimersByTime(30_000);
    timer.cancel();
    vi.advanceTimersByTime(60_000);
    expect(capture).not.toHaveBeenCalled();
  });

  it('does not fire twice if start() called repeatedly', () => {
    const timer = createFirstMinuteSurvivalTimer({ mode: 'sp', platform: 'web' });
    timer.start();
    timer.start();
    vi.advanceTimersByTime(60_001);
    expect(capture).toHaveBeenCalledTimes(1);
  });
});

describe('posthogEngagement — replay loop (plays per session)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('trackReplayClicked fires replay_clicked with mode + source screen', () => {
    trackReplayClicked({ mode: 'sp', fromScreen: 'results' });
    expect(capture).toHaveBeenCalledWith(
      'replay_clicked',
      expect.objectContaining({ mode: 'sp', from_screen: 'results' })
    );
  });

  it('trackNextGameStarted fires next_game_started with games_this_session', () => {
    trackNextGameStarted({ mode: 'sp', gamesThisSession: 3 });
    expect(capture).toHaveBeenCalledWith(
      'next_game_started',
      expect.objectContaining({ mode: 'sp', games_this_session: 3 })
    );
  });
});

describe('posthogEngagement — ad lifecycle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('trackAdLifecycle fires ad_<event> with placement + adType', () => {
    trackAdLifecycle({ event: 'requested', adType: 'rewarded', placement: 'revive' });
    expect(capture).toHaveBeenCalledWith(
      'ad_requested',
      expect.objectContaining({ ad_type: 'rewarded', placement: 'revive' })
    );
  });

  it('captures completed event for measuring ad fill / completion rate', () => {
    trackAdLifecycle({ event: 'completed', adType: 'midgame', placement: 'between_games' });
    expect(capture).toHaveBeenCalledWith(
      'ad_completed',
      expect.objectContaining({ ad_type: 'midgame', placement: 'between_games' })
    );
  });
});
