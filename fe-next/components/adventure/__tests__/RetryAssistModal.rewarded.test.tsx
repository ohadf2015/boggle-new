/**
 * R4 — Adventure retry rewarded ad.
 * Watch-ad button grants bonus-time retry without failure threshold.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const { showAd, capturedRewardRef } = vi.hoisted(() => ({
  showAd: vi.fn(),
  capturedRewardRef: { current: undefined as (() => void) | undefined },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
vi.mock('@/hooks/useFocusTrap', () => ({ useFocusTrap: () => {} }));
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: (opts: { onRewardEarned?: () => void }) => {
    capturedRewardRef.current = opts.onRewardEarned;
    return {
      showAd,
      status: 'idle',
      isAdAvailable: true,
      isDailyLimitReached: false,
      canShowAd: true,
    };
  },
  AdStatus: {},
}));

import RetryAssistModal from '../RetryAssistModal';

const baseProps = {
  isOpen: true,
  consecutiveFailures: 0,
  bestWords: 0,
  bestScore: 0,
  attemptCount: 1,
  onRetry: vi.fn(),
  onRetryWithBonus: vi.fn(),
  onRetryWithHint: vi.fn(),
  onExit: vi.fn(),
};

describe('RetryAssistModal — rewarded retry (R4)', () => {
  beforeEach(() => { showAd.mockClear(); capturedRewardRef.current = undefined; });

  it('renders rewarded retry button on first failure', () => {
    render(<RetryAssistModal {...baseProps} />);
    expect(screen.getByTestId('rewarded-retry-btn')).toBeInTheDocument();
  });

  it('clicking triggers showAd and reward grants bonus-time retry', () => {
    const onRetryWithBonus = vi.fn();
    render(<RetryAssistModal {...baseProps} onRetryWithBonus={onRetryWithBonus} />);
    fireEvent.click(screen.getByTestId('rewarded-retry-btn'));
    expect(showAd).toHaveBeenCalledTimes(1);
    capturedRewardRef.current?.();
    expect(onRetryWithBonus).toHaveBeenCalledTimes(1);
  });
});
