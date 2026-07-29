/**
 * BlastRetryWaveModal — rewarded-ad "retry this wave" offer shown after
 * a wave loss (clearPct < 90% on game-end). One-shot per run; declining
 * lets the existing results summary render with "Play Again" → wave 1.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const offerMock = vi.fn();
let unlockOpts: { placement: string; onUnlock: () => void; disabled?: boolean } | null = null;
const hookReturn = { canShowAd: true, status: 'idle' as const, rewardAmount: 0, isPlaceholder: false };

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

import { BlastRetryWaveModal } from '../BlastRetryWaveModal';

const t = (key: string, vars?: Record<string, string | number>) => {
  if (!vars) return key;
  let out = key;
  for (const [k, v] of Object.entries(vars)) {
    const tok = `{${k}}`;
    if (out.includes(tok)) out = out.split(tok).join(String(v));
    else out += ` ${v}`;
  }
  return out;
};

describe('BlastRetryWaveModal', () => {
  beforeEach(() => {
    offerMock.mockClear();
    unlockOpts = null;
    hookReturn.canShowAd = true;
  });

  it('renders when isOpen=true', () => {
    render(
      <BlastRetryWaveModal
        isOpen
        waveNumber={3}
        clearPct={62}
        onRetry={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('blast-retry-wave-modal')).toBeDefined();
  });

  it('does not render when isOpen=false', () => {
    render(
      <BlastRetryWaveModal
        isOpen={false}
        waveNumber={3}
        clearPct={62}
        onRetry={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByTestId('blast-retry-wave-modal')).toBeNull();
  });

  it('shows the failed wave number in the body', () => {
    render(
      <BlastRetryWaveModal
        isOpen
        waveNumber={4}
        clearPct={71}
        onRetry={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByTestId('blast-retry-wave-modal').textContent).toContain('4');
  });

  it('wires onRetry as the unlock callback with a distinct ad placement', () => {
    const onRetry = vi.fn();
    render(
      <BlastRetryWaveModal
        isOpen
        waveNumber={2}
        clearPct={50}
        onRetry={onRetry}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(unlockOpts?.placement).toBe('blast_wave_retry');
    unlockOpts?.onUnlock();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls offer() when the retry CTA is clicked', () => {
    render(
      <BlastRetryWaveModal
        isOpen
        waveNumber={2}
        clearPct={50}
        onRetry={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    fireEvent.click(screen.getByTestId('blast-retry-wave-cta'));
    expect(offerMock).toHaveBeenCalledTimes(1);
  });

  it('calls onDecline when the "restart from beginning" button is clicked', () => {
    const onDecline = vi.fn();
    render(
      <BlastRetryWaveModal
        isOpen
        waveNumber={2}
        clearPct={50}
        onRetry={vi.fn()}
        onDecline={onDecline}
        t={t}
      />,
    );
    fireEvent.click(screen.getByTestId('blast-retry-wave-decline'));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('hides the retry CTA when ad is unavailable but still shows decline', () => {
    hookReturn.canShowAd = false;
    render(
      <BlastRetryWaveModal
        isOpen
        waveNumber={2}
        clearPct={50}
        onRetry={vi.fn()}
        onDecline={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByTestId('blast-retry-wave-cta')).toBeNull();
    expect(screen.getByTestId('blast-retry-wave-decline')).toBeDefined();
  });
});
