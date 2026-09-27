/**
 * WatchAdForFreezeButton — offered-event fires on mount when below cap.
 * Hides at cap → no offered event when no CTA visible.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { freezeCountRef } = vi.hoisted(() => ({ freezeCountRef: { current: 1 } }));

vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdOffered: vi.fn(),
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    status: 'idle',
    isAdAvailable: true,
    isPlaceholderCooldown: false,
    isDailyLimitReached: false,
    canShowAd: true,
    showAd: vi.fn(),
  }),
  AdStatus: {},
}));

vi.mock('@/hooks/useStreakFreeze', () => ({
  useStreakFreeze: () => ({ freezeCount: freezeCountRef.current, earnFreeze: vi.fn() }),
  MAX_FREEZES: 3,
}));

import WatchAdForFreezeButton from '../WatchAdForFreezeButton';
import { trackRewardedAdOffered } from '@/utils/growthTracking';

describe('WatchAdForFreezeButton analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    freezeCountRef.current = 1;
  });

  it('fires offered on mount when CTA visible', () => {
    render(<WatchAdForFreezeButton t={(k) => k} surface="daily_freeze" />);
    expect(trackRewardedAdOffered).toHaveBeenCalledTimes(1);
    expect(trackRewardedAdOffered).toHaveBeenCalledWith('daily_freeze');
  });

  it('does not fire offered when freezes are at cap (component hidden)', () => {
    freezeCountRef.current = 3;
    render(<WatchAdForFreezeButton t={(k) => k} surface="daily_freeze" />);
    expect(trackRewardedAdOffered).not.toHaveBeenCalled();
  });
});
