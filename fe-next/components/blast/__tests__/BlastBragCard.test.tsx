import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { getBragTier, BlastBragCard } from '../BlastBragCard';
import type { BlastResultsData } from '../types';

// Render motion children inline — same pattern as BlastResultsSummary.test.
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

const trackSpy = vi.fn();
vi.mock('../utils/blastTelemetry', () => ({
  trackBlastBrag: (...args: unknown[]) => trackSpy(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const t = (key: string, vars?: Record<string, string | number>) => {
  if (!vars) return key;
  // Append var values so assertions can match interpolated content even
  // though the test sees raw keys instead of translated strings.
  const suffix = Object.values(vars).map(String).join(' ');
  return `${key} ${suffix}`;
};

const baseResults = (overrides: Partial<BlastResultsData> = {}): BlastResultsData => ({
  finalScore: 1234,
  wordsFound: ['HELLO', 'WORLD'],
  wavesCompleted: 3,
  maxCombo: 5,
  bestWord: 'HELLO',
  waveResults: [],
  bestWave: null,
  previousBest: null,
  percentile: 80,
  ...overrides,
} as BlastResultsData);

describe('getBragTier', () => {
  it('returns legend for top 1%', () => {
    expect(getBragTier(99).key).toBe('legend');
    expect(getBragTier(100).key).toBe('legend');
  });

  it('returns elite for top 10%', () => {
    expect(getBragTier(90).key).toBe('elite');
    expect(getBragTier(95).key).toBe('elite');
  });

  it('returns great for top 25%', () => {
    expect(getBragTier(75).key).toBe('great');
    expect(getBragTier(89).key).toBe('great');
  });

  it('returns solid for top 50%', () => {
    expect(getBragTier(50).key).toBe('solid');
    expect(getBragTier(74).key).toBe('solid');
  });

  it('falls back to nice for anything below 50%', () => {
    expect(getBragTier(0).key).toBe('nice');
    expect(getBragTier(49).key).toBe('nice');
    expect(getBragTier(null).key).toBe('nice');
    expect(getBragTier(undefined).key).toBe('nice');
  });

  it('exposes pillClass + glow for every tier', () => {
    for (const p of [99, 90, 75, 50, 10]) {
      const tier = getBragTier(p);
      expect(tier.pillClass).toBeTruthy();
      expect(tier.glow).toContain('3px 3px 0 #000');
    }
  });
});

describe('BlastBragCard', () => {
  beforeEach(() => {
    trackSpy.mockClear();
  });

  it('renders nothing while percentile is null', () => {
    const { container } = render(
      <BlastBragCard results={baseResults({ percentile: null })} t={t} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows tier pill + beats line + stat strip when percentile resolves', () => {
    render(<BlastBragCard results={baseResults({ percentile: 92 })} t={t} />);
    expect(screen.getByTestId('blast-brag-card')).toBeInTheDocument();
    expect(screen.getByTestId('blast-brag-tier-elite')).toBeInTheDocument();
    expect(screen.getByText(/blast\.results\.brag\.beats 92/)).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('x5')).toBeInTheDocument();
    expect(screen.getByText('HELLO')).toBeInTheDocument();
  });

  it('falls back to clipboard share + fires telemetry', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    // Ensure share is NOT on navigator for this test.
    if ('share' in navigator) {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    }

    render(<BlastBragCard results={baseResults({ percentile: 80 })} t={t} />);
    fireEvent.click(screen.getByTestId('blast-brag-share'));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(trackSpy).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'clipboard', finalScore: 1234, percentile: 80 }),
    );
  });

  it('uses Web Share API when available + tags telemetry as share', async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: shareFn,
      configurable: true,
    });

    render(<BlastBragCard results={baseResults({ percentile: 99 })} t={t} />);
    fireEvent.click(screen.getByTestId('blast-brag-share'));

    await waitFor(() => expect(shareFn).toHaveBeenCalledTimes(1));
    expect(trackSpy).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'share', percentile: 99 }),
    );
  });
});
