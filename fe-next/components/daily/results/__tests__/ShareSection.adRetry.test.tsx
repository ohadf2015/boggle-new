/**
 * TDD: ShareSection — Android retry uses Watch-Ad gate, not coins.
 *
 * Bug: On Android, retrying the daily challenge spent coins. Expected:
 * native users watch a rewarded ad (free retry); web users keep the coin path.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/components/ui/button', () => {
  const Button = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>(
    ({ children, onClick, disabled }, ref) => (
      <button ref={ref} onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
  );
  Button.displayName = 'Button';
  return { Button };
});

vi.mock('@/components/ui/CoinBalanceBadge', () => ({
  CoinBalanceBadge: () => <div data-testid="coin-balance-badge" />,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

// Platform detection — toggled per test
const isNativeMock = vi.fn(() => false);
vi.mock('@/utils/platform', () => ({
  isNative: () => isNativeMock(),
}));

// Rewarded ad stub — exposes a manual showAd that triggers onRewardEarned
type AdMockArgs = { onRewardEarned?: () => void };
const adMockState: { onReward?: () => void } = {};
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: (args: AdMockArgs) => {
    adMockState.onReward = args.onRewardEarned;
    return {
      showAd: () => adMockState.onReward?.(),
      status: 'idle',
      isAdAvailable: true,
      isPlaceholderCooldown: false,
      isDailyLimitReached: false,
      error: null,
      rewardAmount: 0,
    };
  },
  AdStatus: {},
}));
vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdOffered: vi.fn(),
}));

import { ShareSection } from '../ShareSection';

const t = (key: string) => key;

const baseProps = {
  solved: false as const,
  onShare: vi.fn(),
  onWhatsApp: vi.fn(),
  onTwitter: vi.fn(),
  onTelegram: vi.fn(),
  onCopy: vi.fn(),
  onDownloadImage: vi.fn(),
  copied: false,
  isGeneratingImage: false,
  retryCost: 200,
  currentCoins: 500,
  canAffordRetry: true,
  t,
};

describe('ShareSection — retry CTA platform branching', () => {
  beforeEach(() => {
    isNativeMock.mockReset();
    isNativeMock.mockReturnValue(false);
    adMockState.onReward = undefined;
  });

  it('Web: renders coin-cost retry button and calls onRetry (coin path)', () => {
    isNativeMock.mockReturnValue(false);
    const onRetry = vi.fn();
    const onRetryFree = vi.fn();

    render(
      <ShareSection
        {...baseProps}
        onRetry={onRetry}
        onRetryFree={onRetryFree}
      />
    );

    // Coin cost label visible on web
    expect(screen.getByText(/200🪙/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/wordHunt.results.retry/));
    expect(onRetry).toHaveBeenCalled();
    expect(onRetryFree).not.toHaveBeenCalled();
  });

  it('Native: renders ad retry button (no coin cost label) and calls onRetryFree on reward', async () => {
    isNativeMock.mockReturnValue(true);
    const onRetry = vi.fn();
    const onRetryFree = vi.fn();

    render(
      <ShareSection
        {...baseProps}
        onRetry={onRetry}
        onRetryFree={onRetryFree}
      />
    );

    // Coin-cost label must NOT appear on native
    expect(screen.queryByText(/200🪙/)).not.toBeInTheDocument();

    // Click triggers ad → reward → onRetryFree
    const adBtn = await screen.findByText(/wordHunt.results.watchAdRetry/);
    fireEvent.click(adBtn);
    await waitFor(() => expect(onRetryFree).toHaveBeenCalled());
    expect(onRetry).not.toHaveBeenCalled();
  });
});
