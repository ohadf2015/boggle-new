/**
 * DoubleGoldAdButton — end-of-game "Watch ad to DOUBLE your gold" CTA.
 *
 * Psychology: endowment + anchoring. Doubling a number the player just saw
 * earned converts higher than offering a flat amount.
 *
 * Behaviors:
 * - Does not render when canShowAd is false or bonusAmount <= 0.
 * - On ad complete, calls addCoins(bonusAmount, reason) exactly once.
 * - After success, swaps to a "Doubled!" state and does not offer again.
 */
import { render, screen, act } from '@testing-library/react';

const addCoinsMock = vi.fn().mockResolvedValue(1000);
const showAdMock = vi.fn();
const trackOfferedMock = vi.fn();

let mockRewardedAdReturn: {
  status: string;
  canShowAd: boolean;
  isPlaceholderCooldown: boolean;
  _capturedOnReward?: () => void | Promise<void>;
};

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: (opts: { onRewardEarned?: () => void | Promise<void> } = {}) => {
    mockRewardedAdReturn._capturedOnReward = opts.onRewardEarned;
    return {
      status: mockRewardedAdReturn.status,
      canShowAd: mockRewardedAdReturn.canShowAd,
      isPlaceholderCooldown: mockRewardedAdReturn.isPlaceholderCooldown,
      showAd: showAdMock,
      rewardAmount: 250,
      isPlaceholder: false,
    };
  },
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({ addCoins: addCoinsMock }),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdOffered: (...args: unknown[]) => trackOfferedMock(...args),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string | number>) => {
    if (p && 'amount' in p) return `${k}:${p.amount}`;
    return k;
  } }),
}));

import DoubleGoldAdButton from '../DoubleGoldAdButton';

describe('DoubleGoldAdButton', () => {
  beforeEach(() => {
    addCoinsMock.mockClear();
    showAdMock.mockClear();
    trackOfferedMock.mockClear();
    mockRewardedAdReturn = {
      status: 'idle',
      canShowAd: true,
      isPlaceholderCooldown: false,
    };
  });

  it('renders nothing when bonusAmount <= 0', () => {
    const { container } = render(
      <DoubleGoldAdButton earnedAmount={0} surface="sp_results" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when canShowAd is false', () => {
    mockRewardedAdReturn.canShowAd = false;
    const { container } = render(
      <DoubleGoldAdButton earnedAmount={120} surface="sp_results" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the button when offered and tracks the placement once', () => {
    render(<DoubleGoldAdButton earnedAmount={120} surface="sp_results" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(trackOfferedMock).toHaveBeenCalledTimes(1);
    expect(trackOfferedMock).toHaveBeenCalledWith('sp_results', expect.any(Object));
  });

  it('awards exactly the earnedAmount as a bonus on reward (doubling)', async () => {
    render(<DoubleGoldAdButton earnedAmount={120} surface="sp_results" />);
    await act(async () => {
      await mockRewardedAdReturn._capturedOnReward?.();
    });
    expect(addCoinsMock).toHaveBeenCalledTimes(1);
    expect(addCoinsMock).toHaveBeenCalledWith(
      120,
      expect.stringContaining('Double'),
      expect.objectContaining({ surface: 'sp_results' }),
    );
  });

  it('disappears after a successful double to prevent re-offering', async () => {
    const { container } = render(
      <DoubleGoldAdButton earnedAmount={120} surface="sp_results" />,
    );
    expect(container.firstChild).not.toBeNull();
    await act(async () => {
      await mockRewardedAdReturn._capturedOnReward?.();
    });
    expect(container.firstChild).toBeNull();
  });
});
