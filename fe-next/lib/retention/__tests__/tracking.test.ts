/**
 * Retention tracking tests — verifies the PostHog events the D1 dashboard
 * reads actually fire with the right payloads, and that the module never
 * throws when analytics/storage are unavailable.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
const setUserPropsMock = vi.fn();

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));

vi.mock('@/utils/posthogEngagement', () => ({
  setPostHogUserProps: (...args: unknown[]) => setUserPropsMock(...args),
}));

import { trackRetentionPlay } from '../tracking';
import { __resetRetentionStreakCache } from '../streak';

const events = (): string[] => captureMock.mock.calls.map((c) => c[0] as string);
const propsFor = (name: string) =>
  captureMock.mock.calls.find((c) => c[0] === name)?.[1] as Record<string, unknown>;

describe('trackRetentionPlay', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetRetentionStreakCache();
    captureMock.mockClear();
    setUserPropsMock.mockClear();
  });

  it('emits streak_day_recorded with outcome on a new day', () => {
    trackRetentionPlay({ mode: 'blast', todayISO: '2026-08-10' });
    expect(events()).toEqual(['streak_day_recorded']);
    expect(propsFor('streak_day_recorded')).toMatchObject({
      mode: 'blast',
      streak: 1,
      best: 1,
      outcome: 'started',
      freeze_available: true,
    });
    expect(setUserPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({ current_streak: 1, best_streak: 1 }),
    );
  });

  it('is a no-op (no events) on a second call the same day', () => {
    trackRetentionPlay({ mode: 'blast', todayISO: '2026-08-10' });
    captureMock.mockClear();
    trackRetentionPlay({ mode: 'practice_riddle', todayISO: '2026-08-10' });
    expect(events()).toEqual([]);
  });

  it('emits streak_freeze_used when the weekly freeze absorbs a missed day', () => {
    trackRetentionPlay({ mode: 'daily', todayISO: '2026-08-08' });
    captureMock.mockClear();
    trackRetentionPlay({ mode: 'daily', todayISO: '2026-08-10' });
    expect(events()).toEqual(['streak_day_recorded', 'streak_freeze_used']);
    expect(propsFor('streak_day_recorded')).toMatchObject({
      outcome: 'freeze-consumed',
      streak: 2,
      freeze_available: false,
    });
    expect(propsFor('streak_freeze_used')).toMatchObject({ streak: 2, days_missed: 1 });
  });

  it('emits streak_broken with the lost streak length on a real lapse', () => {
    // streak_broken is guarded to previousStreak > 1 — resetting a 1-day
    // streak is not a loss worth an event.
    trackRetentionPlay({ mode: 'daily', todayISO: '2026-08-04' });
    trackRetentionPlay({ mode: 'daily', todayISO: '2026-08-05' });
    captureMock.mockClear();
    trackRetentionPlay({ mode: 'daily', todayISO: '2026-08-10' });
    expect(events()).toEqual(['streak_day_recorded', 'streak_broken']);
    expect(propsFor('streak_broken')).toMatchObject({ lost_streak: 2 });
  });

  it('emits streak_milestone at 3/7/14/... days', () => {
    for (let d = 7; d <= 10; d++) {
      trackRetentionPlay({ mode: 'classic', todayISO: `2026-08-0${d}` });
    }
    expect(events()).toContain('streak_milestone');
    expect(propsFor('streak_milestone')).toMatchObject({ streakDays: 3 });
  });

  it('never throws when posthog.capture blows up', () => {
    captureMock.mockImplementation(() => {
      throw new Error('network down');
    });
    expect(() => trackRetentionPlay({ mode: 'blast', todayISO: '2026-08-10' })).not.toThrow();
  });
});
