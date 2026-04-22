/**
 * BlastContinueModal — rewarded-ad "continue from dead-end" offer.
 * Uses useRewardedFeatureUnlock to gate the revive behind an ad, offers
 * +5 moves, single-use per game (caller enforces).
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

import { BlastContinueModal } from '../BlastContinueModal';

const t = (key: string, vars?: Record<string, string | number>) => {
  if (!vars) return key;
  let out = key;
  let substituted = false;
  for (const [k, v] of Object.entries(vars)) {
    const tok = `{${k}}`;
    if (out.includes(tok)) { out = out.split(tok).join(String(v)); substituted = true; }
  }
  if (!substituted) out = `${out} ${Object.values(vars).join(' ')}`;
  return out;
};

describe('BlastContinueModal', () => {
  beforeEach(() => {
    offerMock.mockClear();
    unlockOpts = null;
    hookReturn.canShowAd = true;
  });

  it('renders when isOpen=true', () => {
    render(
      <BlastContinueModal
        isOpen
        bonusMoves={5}
        onContinue={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('blast-continue-modal')).toBeDefined();
  });

  it('does not render when isOpen=false', () => {
    render(
      <BlastContinueModal
        isOpen={false}
        bonusMoves={5}
        onContinue={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByTestId('blast-continue-modal')).toBeNull();
  });

  it('shows bonus moves amount in CTA', () => {
    render(
      <BlastContinueModal
        isOpen
        bonusMoves={5}
        onContinue={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('blast-continue-cta').textContent).toContain('5');
  });

  it('wires onContinue as the unlock callback', () => {
    const onContinue = vi.fn();
    render(
      <BlastContinueModal
        isOpen
        bonusMoves={5}
        onContinue={onContinue}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(unlockOpts?.placement).toBe('blast_wave_continue');
    unlockOpts?.onUnlock();
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('calls offer() when the CTA is clicked', () => {
    render(
      <BlastContinueModal
        isOpen
        bonusMoves={5}
        onContinue={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    fireEvent.click(screen.getByTestId('blast-continue-cta'));
    expect(offerMock).toHaveBeenCalledTimes(1);
  });

  it('calls onDecline when the skip button is clicked', () => {
    const onDecline = vi.fn();
    render(
      <BlastContinueModal
        isOpen
        bonusMoves={5}
        onContinue={vi.fn()}
        onDecline={onDecline}
        t={t}
      />,
    );
    fireEvent.click(screen.getByTestId('blast-continue-decline'));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('hides the CTA when ad is unavailable but still shows decline', () => {
    hookReturn.canShowAd = false;
    render(
      <BlastContinueModal
        isOpen
        bonusMoves={5}
        onContinue={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByTestId('blast-continue-cta')).toBeNull();
    expect(screen.getByTestId('blast-continue-decline')).toBeDefined();
  });
});
