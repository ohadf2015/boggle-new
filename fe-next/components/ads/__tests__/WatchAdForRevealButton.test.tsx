/**
 * WatchAdForRevealButton — softens the "not enough coins" paywall by
 * offering a free reveal via rewarded ad. Psychology: variable-ratio
 * reward / free-value fallback avoids the hard dead-end.
 *
 * Contract:
 * - Renders null when canShowAd is false.
 * - Renders null after the reveal has already happened (revealed=true).
 * - Calls onReveal exactly once on reward.
 */
import { render, screen, act } from '@testing-library/react';

const offerMock = vi.fn();
const trackOfferedMock = vi.fn();

let mockUnlock: {
  canShowAd: boolean;
  status: string;
  _captured?: () => void | Promise<void>;
};

vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: (opts: { onUnlock: () => void | Promise<void> }) => {
    mockUnlock._captured = opts.onUnlock;
    return {
      offer: offerMock,
      canShowAd: mockUnlock.canShowAd,
      status: mockUnlock.status,
      rewardAmount: 0,
      isPlaceholder: false,
    };
  },
}));

vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdOffered: (...args: unknown[]) => trackOfferedMock(...args),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

import WatchAdForRevealButton from '../WatchAdForRevealButton';

describe('WatchAdForRevealButton', () => {
  beforeEach(() => {
    offerMock.mockClear();
    trackOfferedMock.mockClear();
    mockUnlock = { canShowAd: true, status: 'idle' };
  });

  it('renders a button when canShowAd=true and revealed=false', () => {
    render(
      <WatchAdForRevealButton
        onReveal={vi.fn()}
        revealed={false}
        placement="reveal_target_word"
      />,
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders null when revealed=true', () => {
    const { container } = render(
      <WatchAdForRevealButton
        onReveal={vi.fn()}
        revealed={true}
        placement="reveal_target_word"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null when canShowAd=false', () => {
    mockUnlock.canShowAd = false;
    const { container } = render(
      <WatchAdForRevealButton
        onReveal={vi.fn()}
        revealed={false}
        placement="reveal_target_word"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls onReveal exactly once on reward', async () => {
    const onReveal = vi.fn();
    render(
      <WatchAdForRevealButton
        onReveal={onReveal}
        revealed={false}
        placement="reveal_target_word"
      />,
    );
    await act(async () => {
      await mockUnlock._captured?.();
    });
    expect(onReveal).toHaveBeenCalledTimes(1);
  });
});
