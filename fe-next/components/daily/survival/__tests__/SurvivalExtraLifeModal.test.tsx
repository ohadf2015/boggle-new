/**
 * SurvivalExtraLifeModal — rewarded-ad "restore life" offer when HP hits 0.
 * Mirrors BlastContinueModal: gated by useRewardedFeatureUnlock, single-use
 * per game (caller enforces via declined/used state).
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

import { SurvivalExtraLifeModal } from '../SurvivalExtraLifeModal';

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

describe('SurvivalExtraLifeModal', () => {
  beforeEach(() => {
    offerMock.mockClear();
    unlockOpts = null;
    hookReturn.canShowAd = true;
  });

  it('renders when isOpen=true', () => {
    render(
      <SurvivalExtraLifeModal
        isOpen
        restoreAmount={50}
        onRestore={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('survival-extralife-modal')).toBeDefined();
  });

  it('does not render when isOpen=false', () => {
    render(
      <SurvivalExtraLifeModal
        isOpen={false}
        restoreAmount={50}
        onRestore={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByTestId('survival-extralife-modal')).toBeNull();
  });

  it('shows restore amount in CTA', () => {
    render(
      <SurvivalExtraLifeModal
        isOpen
        restoreAmount={50}
        onRestore={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('survival-extralife-cta').textContent).toContain('50');
  });

  it('wires onRestore as the unlock callback with correct placement', () => {
    const onRestore = vi.fn();
    render(
      <SurvivalExtraLifeModal
        isOpen
        restoreAmount={50}
        onRestore={onRestore}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(unlockOpts?.placement).toBe('daily_survival_extra_life');
    unlockOpts?.onUnlock();
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  it('calls offer() when the CTA is clicked', () => {
    render(
      <SurvivalExtraLifeModal
        isOpen
        restoreAmount={50}
        onRestore={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    fireEvent.click(screen.getByTestId('survival-extralife-cta'));
    expect(offerMock).toHaveBeenCalledTimes(1);
  });

  it('calls onDecline when the skip button is clicked', () => {
    const onDecline = vi.fn();
    render(
      <SurvivalExtraLifeModal
        isOpen
        restoreAmount={50}
        onRestore={vi.fn()}
        onDecline={onDecline}
        t={t}
      />,
    );
    fireEvent.click(screen.getByTestId('survival-extralife-decline'));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('hides the CTA when ad is unavailable but still shows decline', () => {
    hookReturn.canShowAd = false;
    render(
      <SurvivalExtraLifeModal
        isOpen
        restoreAmount={50}
        onRestore={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByTestId('survival-extralife-cta')).toBeNull();
    expect(screen.getByTestId('survival-extralife-decline')).toBeDefined();
  });

  it('shows coin-spend CTA when ad unavailable and player can afford', () => {
    hookReturn.canShowAd = false;
    render(
      <SurvivalExtraLifeModal
        isOpen
        restoreAmount={50}
        onRestore={vi.fn()}
        onDecline={vi.fn()}
        coinCost={50}
        canAffordCoinRestore
        onCoinRestore={vi.fn()}
        t={t}
      />,
    );
    const coinCta = screen.getByTestId('survival-extralife-coin-cta');
    expect(coinCta).toBeDefined();
    expect(coinCta.textContent).toContain('50');
  });

  it('calls onCoinRestore when coin CTA clicked', () => {
    hookReturn.canShowAd = false;
    const onCoinRestore = vi.fn();
    render(
      <SurvivalExtraLifeModal
        isOpen
        restoreAmount={50}
        onRestore={vi.fn()}
        onDecline={vi.fn()}
        coinCost={50}
        canAffordCoinRestore
        onCoinRestore={onCoinRestore}
        t={t}
      />,
    );
    fireEvent.click(screen.getByTestId('survival-extralife-coin-cta'));
    expect(onCoinRestore).toHaveBeenCalledTimes(1);
  });

  it('hides coin CTA when player cannot afford', () => {
    hookReturn.canShowAd = false;
    render(
      <SurvivalExtraLifeModal
        isOpen
        restoreAmount={50}
        onRestore={vi.fn()}
        onDecline={vi.fn()}
        coinCost={50}
        canAffordCoinRestore={false}
        onCoinRestore={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByTestId('survival-extralife-coin-cta')).toBeNull();
  });

  it('hides coin CTA when ad is available (prefers ad path)', () => {
    hookReturn.canShowAd = true;
    render(
      <SurvivalExtraLifeModal
        isOpen
        restoreAmount={50}
        onRestore={vi.fn()}
        onDecline={vi.fn()}
        coinCost={50}
        canAffordCoinRestore
        onCoinRestore={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('survival-extralife-cta')).toBeDefined();
    expect(screen.queryByTestId('survival-extralife-coin-cta')).toBeNull();
  });
});
