/**
 * RetryAssistModal — offered-event fires when rewarded-retry CTA visible
 * (i.e. isOpen + canShowAd + not daily-limited).
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { canShowAdRef, isDailyLimitReachedRef } = vi.hoisted(() => ({
  canShowAdRef: { current: true },
  isDailyLimitReachedRef: { current: false },
}));

vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdOffered: vi.fn(),
}));

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    showAd: vi.fn(),
    status: 'idle',
    isAdAvailable: true,
    canShowAd: canShowAdRef.current,
    isDailyLimitReached: isDailyLimitReachedRef.current,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => {},
}));

import RetryAssistModal from '../RetryAssistModal';
import { trackRewardedAdOffered } from '@/utils/growthTracking';

const baseProps = {
  consecutiveFailures: 0,
  bestWords: 0,
  bestScore: 0,
  attemptCount: 1,
  onRetry: () => {},
  onRetryWithBonus: () => {},
  onRetryWithHint: () => {},
  onExit: () => {},
};

describe('RetryAssistModal analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canShowAdRef.current = true;
    isDailyLimitReachedRef.current = false;
  });

  it('fires offered when modal opens with CTA visible', () => {
    const { rerender } = render(
      <RetryAssistModal isOpen={false} {...baseProps} />,
    );
    expect(trackRewardedAdOffered).not.toHaveBeenCalled();
    rerender(<RetryAssistModal isOpen={true} {...baseProps} />);
    expect(trackRewardedAdOffered).toHaveBeenCalledTimes(1);
    expect(trackRewardedAdOffered).toHaveBeenCalledWith('retry_assist');
  });

  it('does not fire while modal stays closed', () => {
    render(<RetryAssistModal isOpen={false} {...baseProps} />);
    expect(trackRewardedAdOffered).not.toHaveBeenCalled();
  });

  it('does not fire when daily limit reached (CTA hidden)', () => {
    isDailyLimitReachedRef.current = true;
    render(<RetryAssistModal isOpen={true} {...baseProps} />);
    expect(trackRewardedAdOffered).not.toHaveBeenCalled();
  });

  it('does not re-fire if isOpen stays true across rerender', () => {
    const { rerender } = render(
      <RetryAssistModal isOpen={true} {...baseProps} />,
    );
    expect(trackRewardedAdOffered).toHaveBeenCalledTimes(1);
    rerender(<RetryAssistModal isOpen={true} {...baseProps} consecutiveFailures={1} />);
    expect(trackRewardedAdOffered).toHaveBeenCalledTimes(1);
  });
});
