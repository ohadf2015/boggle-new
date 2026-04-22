/**
 * DailyPartClaimModal — rewarded-ad "claim daily premium part" offer.
 * Placement: avatar_daily_free_part. Modal is dumb: parent owns fetch call.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const offerMock = vi.fn();
let unlockOpts: { placement: string; onUnlock: () => void; disabled?: boolean } | null = null;
const hookReturn = {
  canShowAd: true,
  status: 'idle' as const,
  rewardAmount: 0,
  isPlaceholder: false,
};

vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: (opts: { placement: string; onUnlock: () => void; disabled?: boolean }) => {
    unlockOpts = opts;
    return { offer: offerMock, ...hookReturn };
  },
}));

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const passthrough = () => {
    const Comp = ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, ...rest } = props;
      void initial; void animate; void exit; void transition;
      return <div {...rest}>{children}</div>;
    };
    return Comp;
  };
  return {
    AdaptiveMotion: new Proxy({}, { get: () => passthrough() }),
    AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

import { DailyPartClaimModal } from '../DailyPartClaimModal';

const t = (key: string, vars?: Record<string, string | number>) => {
  if (!vars) return key;
  let out = key;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
};

describe('DailyPartClaimModal', () => {
  beforeEach(() => {
    offerMock.mockClear();
    unlockOpts = null;
    hookReturn.canShowAd = true;
  });

  it('renders when isOpen=true', () => {
    render(
      <DailyPartClaimModal
        isOpen
        onClaim={vi.fn()}
        onClose={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('avatar-daily-claim-modal')).toBeDefined();
  });

  it('does not render when isOpen=false', () => {
    render(
      <DailyPartClaimModal
        isOpen={false}
        onClaim={vi.fn()}
        onClose={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByTestId('avatar-daily-claim-modal')).toBeNull();
  });

  it('wires onClaim as the unlock callback with correct placement', () => {
    const onClaim = vi.fn();
    render(
      <DailyPartClaimModal
        isOpen
        onClaim={onClaim}
        onClose={vi.fn()}
        t={t}
      />,
    );
    expect(unlockOpts?.placement).toBe('avatar_daily_free_part');
    unlockOpts?.onUnlock();
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it('calls offer() when the CTA is clicked', () => {
    render(
      <DailyPartClaimModal
        isOpen
        onClaim={vi.fn()}
        onClose={vi.fn()}
        t={t}
      />,
    );
    fireEvent.click(screen.getByTestId('avatar-daily-claim-cta'));
    expect(offerMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <DailyPartClaimModal
        isOpen
        onClaim={vi.fn()}
        onClose={onClose}
        t={t}
      />,
    );
    fireEvent.click(screen.getByTestId('avatar-daily-claim-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides the CTA when ad is unavailable but still shows close', () => {
    hookReturn.canShowAd = false;
    render(
      <DailyPartClaimModal
        isOpen
        onClaim={vi.fn()}
        onClose={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByTestId('avatar-daily-claim-cta')).toBeNull();
    expect(screen.getByTestId('avatar-daily-claim-close')).toBeDefined();
  });
});
