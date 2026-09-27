import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  classifyInterstitialTerminal,
  classifyRewardedTerminal,
  trackAdClosed,
  noteGameEndedAfterAd,
  resetAdQualityForTests,
  AD_OUTCOME_WINDOW_MS,
} from './adQuality';

const { trackGrowthEventMock } = vi.hoisted(() => ({
  trackGrowthEventMock: vi.fn(),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: trackGrowthEventMock,
}));

function events(name: string) {
  return trackGrowthEventMock.mock.calls.filter((c) => c[0] === name);
}

beforeEach(() => {
  trackGrowthEventMock.mockClear();
  resetAdQualityForTests();
});

afterEach(() => {
  resetAdQualityForTests();
});

describe('classifyInterstitialTerminal', () => {
  it('treats a user-dismissed ad as clean exposure', () => {
    expect(classifyInterstitialTerminal('dismissed')).toBe('clean');
  });

  it('treats no_fill and breadcrumb stages as skipped (no exposure)', () => {
    expect(classifyInterstitialTerminal('no_fill')).toBe('skipped');
    expect(classifyInterstitialTerminal('eligible')).toBe('skipped');
    expect(classifyInterstitialTerminal('prepare_start')).toBe('skipped');
    expect(classifyInterstitialTerminal('prepare_resolved')).toBe('skipped');
    expect(classifyInterstitialTerminal('show_called')).toBe('skipped');
    expect(classifyInterstitialTerminal('show_resolved')).toBe('skipped');
  });

  it('treats stalls and failures as broken (the disruptive class)', () => {
    expect(classifyInterstitialTerminal('safety_timeout')).toBe('broken');
    expect(classifyInterstitialTerminal('failed_to_show')).toBe('broken');
    expect(classifyInterstitialTerminal('failed_to_load')).toBe('broken');
    expect(classifyInterstitialTerminal('error')).toBe('broken');
  });
});

describe('classifyRewardedTerminal', () => {
  it('granted reward is clean regardless of stage', () => {
    expect(classifyRewardedTerminal(true, 'rewarded')).toBe('clean');
    expect(classifyRewardedTerminal(true, null)).toBe('clean');
  });

  it('dismissed without reward is a clean skip — the user skipped a working ad', () => {
    expect(classifyRewardedTerminal(false, 'dismissed')).toBe('clean');
  });

  it('no reward after an SDK failure is broken', () => {
    expect(classifyRewardedTerminal(false, 'failed_to_load')).toBe('broken');
    expect(classifyRewardedTerminal(false, 'safety_timeout')).toBe('broken');
    expect(classifyRewardedTerminal(false, 'visibility_reconcile')).toBe('broken');
    expect(classifyRewardedTerminal(false, null)).toBe('broken');
  });
});

describe('trackAdClosed / noteGameEndedAfterAd — ad_outcome lifecycle', () => {
  it('emits ad_closed immediately with format, terminal and surface', () => {
    trackAdClosed({ format: 'interstitial', terminal: 'clean' });
    const closed = events('ad_closed');
    expect(closed).toHaveLength(1);
    expect(closed[0][1]).toEqual({
      format: 'interstitial',
      terminal: 'clean',
      surface: null,
    });
  });

  it('carries the rewarded surface through both events', () => {
    vi.useFakeTimers();
    try {
      trackAdClosed({ format: 'rewarded', terminal: 'clean', surface: 'streak_freeze' }, 0);
      noteGameEndedAfterAd(60_000);
      const outcome = events('ad_outcome');
      expect(outcome[0][1].surface).toBe('streak_freeze');
      expect(outcome[0][1].played_again_within_5m).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('emits played_again=false when the window expires with no further game', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      trackAdClosed({ format: 'interstitial', terminal: 'clean' });
      vi.setSystemTime(AD_OUTCOME_WINDOW_MS + 1);
      vi.advanceTimersByTime(AD_OUTCOME_WINDOW_MS + 1);
      const outcome = events('ad_outcome');
      expect(outcome).toHaveLength(1);
      expect(outcome[0][1].played_again_within_5m).toBe(false);
      expect(outcome[0][1].minutes_to_next_game).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('emits played_again=true with minutes_to_next_game when the player continues', () => {
    vi.useFakeTimers();
    try {
      trackAdClosed({ format: 'rewarded', terminal: 'clean' }, 0);
      noteGameEndedAfterAd(90_000);
      const outcome = events('ad_outcome');
      expect(outcome).toHaveLength(1);
      expect(outcome[0][1].played_again_within_5m).toBe(true);
      expect(outcome[0][1].minutes_to_next_game).toBe(1.5);
      // Timer was cancelled — advancing past the window must NOT double-emit.
      vi.advanceTimersByTime(AD_OUTCOME_WINDOW_MS * 2);
      expect(events('ad_outcome')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores a game end after the window has expired', () => {
    trackAdClosed({ format: 'interstitial', terminal: 'clean' }, 0);
    noteGameEndedAfterAd(AD_OUTCOME_WINDOW_MS + 1);
    expect(events('ad_outcome')).toHaveLength(0);
  });

  it('skipped terminals arm no outcome window', () => {
    vi.useFakeTimers();
    try {
      trackAdClosed({ format: 'interstitial', terminal: 'skipped' });
      noteGameEndedAfterAd(30_000);
      vi.advanceTimersByTime(AD_OUTCOME_WINDOW_MS * 2);
      expect(events('ad_closed')).toHaveLength(1);
      expect(events('ad_outcome')).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a second close supersedes the first pending window', () => {
    vi.useFakeTimers();
    try {
      trackAdClosed({ format: 'interstitial', terminal: 'clean' }, 0);
      trackAdClosed({ format: 'interstitial', terminal: 'broken' }, 60_000);
      vi.advanceTimersByTime(AD_OUTCOME_WINDOW_MS * 2);
      const outcome = events('ad_outcome');
      expect(outcome).toHaveLength(1);
      expect(outcome[0][1].terminal).toBe('broken');
    } finally {
      vi.useRealTimers();
    }
  });
});
