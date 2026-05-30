/**
 * TimeLowAdPrompt — mid-game rewarded-ad CTA that appears when the timer
 * drops to a critical threshold.
 *
 * Psychology: loss aversion + sunk-cost. Peak-intent moment in the entire
 * game loop — the player doesn't want their investment to end.
 *
 * Contract:
 * - Renders only when timeRemaining <= threshold (and > 0), canShowAd=true,
 *   and this game hasn't already been extended.
 * - On reward, calls onExtend(bonusSeconds) exactly once and hides.
 * - Does not re-offer on subsequent low-timer ticks within the same mount.
 */
import { render, screen, act } from '@testing-library/react';

const showAdMock = vi.fn();
const trackOfferedMock = vi.fn();

let mockReturn: {
  status: string;
  canShowAd: boolean;
  _captured?: () => void | Promise<void>;
};

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: (opts: { onRewardEarned?: () => void | Promise<void> } = {}) => {
    mockReturn._captured = opts.onRewardEarned;
    return {
      status: mockReturn.status,
      canShowAd: mockReturn.canShowAd,
      showAd: showAdMock,
      isPlaceholderCooldown: false,
      isPlaceholder: false,
      rewardAmount: 0,
    };
  },
}));

vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdOffered: (...args: unknown[]) => trackOfferedMock(...args),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, string | number>) => {
    if (p && 'seconds' in p) return `${k}:${p.seconds}`;
    return k;
  } }),
}));

let mockCosy = false;
vi.mock('@/contexts/AccessibilityContext', () => ({
  useCosyMode: () => mockCosy,
}));

import TimeLowAdPrompt from '../TimeLowAdPrompt';

describe('TimeLowAdPrompt', () => {
  beforeEach(() => {
    showAdMock.mockClear();
    trackOfferedMock.mockClear();
    mockReturn = { status: 'idle', canShowAd: true };
    mockCosy = false;
  });

  it('does not render under Cozy / Calm Mode — the loss-aversion nag is suppressed', () => {
    mockCosy = true;
    const { container } = render(
      <TimeLowAdPrompt timeRemaining={6} threshold={10} bonusSeconds={30} onExtend={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
    expect(trackOfferedMock).not.toHaveBeenCalled();
  });

  it('does not render when timeRemaining is above threshold', () => {
    const { container } = render(
      <TimeLowAdPrompt
        timeRemaining={30}
        threshold={10}
        bonusSeconds={30}
        onExtend={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render when timeRemaining has hit zero', () => {
    const { container } = render(
      <TimeLowAdPrompt
        timeRemaining={0}
        threshold={10}
        bonusSeconds={30}
        onExtend={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render when canShowAd is false', () => {
    mockReturn.canShowAd = false;
    const { container } = render(
      <TimeLowAdPrompt
        timeRemaining={6}
        threshold={10}
        bonusSeconds={30}
        onExtend={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders and tracks offered once when time crosses threshold', () => {
    render(
      <TimeLowAdPrompt
        timeRemaining={8}
        threshold={10}
        bonusSeconds={30}
        onExtend={vi.fn()}
      />,
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(trackOfferedMock).toHaveBeenCalledTimes(1);
    expect(trackOfferedMock).toHaveBeenCalledWith(
      'time_low_extend',
      expect.any(Object),
    );
  });

  it('invokes onExtend with bonusSeconds on reward and disappears afterward', async () => {
    const onExtend = vi.fn();
    const { container } = render(
      <TimeLowAdPrompt
        timeRemaining={6}
        threshold={10}
        bonusSeconds={30}
        onExtend={onExtend}
      />,
    );
    expect(container.firstChild).not.toBeNull();
    await act(async () => {
      await mockReturn._captured?.();
    });
    expect(onExtend).toHaveBeenCalledTimes(1);
    expect(onExtend).toHaveBeenCalledWith(30);
    expect(container.firstChild).toBeNull();
  });
});
