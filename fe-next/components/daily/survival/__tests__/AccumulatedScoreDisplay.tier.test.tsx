import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AccumulatedScoreDisplay } from '../AccumulatedScoreDisplay';

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@react-spring/web', () => ({
  useSpring: () => ({
    val: {
      to: (fn: (v: number) => string) => fn(0),
    },
  }),
  animated: {
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <span {...props}>{children}</span>,
  },
}));

// Minimal t-mock that mirrors the real context's {placeholder} interpolation
const t = (key: string, params?: Record<string, string | number>): string => {
  const dict: Record<string, string> = {
    'wordHunt.survival.score.tier.bronze': 'Bronze',
    'wordHunt.survival.score.tier.silver': 'Silver',
    'wordHunt.survival.score.tier.gold': 'Gold',
    'wordHunt.survival.score.tier.platinum': 'Platinum',
    'wordHunt.survival.score.tier.toNext': '{points} to {next}',
    'wordHunt.survival.score.tier.maxed': 'Legendary',
  };
  let out = dict[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return out;
};

describe('AccumulatedScoreDisplay — tier progress note', () => {
  it('shows Bronze tier + points to Silver when score < 400', () => {
    render(
      <AccumulatedScoreDisplay currentScore={250} lastIncrement={null} isAnimating={false} t={t} />
    );
    expect(screen.getByText(/Bronze/)).toBeInTheDocument();
    // 400 - 250 = 150
    expect(screen.getByText(/150 to Silver/)).toBeInTheDocument();
  });

  it('shows Silver tier + points to Gold when score in [400,600)', () => {
    render(
      <AccumulatedScoreDisplay currentScore={450} lastIncrement={null} isAnimating={false} t={t} />
    );
    expect(screen.getByText(/Silver/)).toBeInTheDocument();
    // 600 - 450 = 150
    expect(screen.getByText(/150 to Gold/)).toBeInTheDocument();
  });

  it('shows Gold tier + points to Platinum when score in [600,800)', () => {
    render(
      <AccumulatedScoreDisplay currentScore={750} lastIncrement={null} isAnimating={false} t={t} />
    );
    expect(screen.getByText(/Gold/)).toBeInTheDocument();
    // 800 - 750 = 50
    expect(screen.getByText(/50 to Platinum/)).toBeInTheDocument();
  });

  it('shows Platinum tier + maxed message when score >= 800', () => {
    render(
      <AccumulatedScoreDisplay currentScore={900} lastIncrement={null} isAnimating={false} t={t} />
    );
    expect(screen.getByText(/Platinum/)).toBeInTheDocument();
    expect(screen.getByText(/Legendary/)).toBeInTheDocument();
    // Must NOT show a "to X" message once maxed
    expect(screen.queryByText(/to Platinum/)).not.toBeInTheDocument();
  });

  it('does not render decorative flavor text', () => {
    render(
      <AccumulatedScoreDisplay currentScore={750} lastIncrement={null} isAnimating={false} t={t} />
    );
    // Flavor strings are noise; should not even attempt translation lookup
    expect(screen.queryByText(/Flavor/)).not.toBeInTheDocument();
    expect(screen.queryByText(/wordHunt\.survival\.score\.tier\.\w+Flavor/)).not.toBeInTheDocument();
  });

  it('renders an accessible progress bar reflecting tier progress', () => {
    render(
      <AccumulatedScoreDisplay currentScore={500} lastIncrement={null} isAnimating={false} t={t} />
    );
    // Silver band: 400→600. Score 500 → 50% across the band.
    const bar = screen.getByRole('progressbar', { name: /tier/i });
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('snaps to Bronze tier at score 0', () => {
    render(
      <AccumulatedScoreDisplay currentScore={0} lastIncrement={null} isAnimating={false} t={t} />
    );
    expect(screen.getByText(/Bronze/)).toBeInTheDocument();
    // 400 - 0 = 400
    expect(screen.getByText(/400 to Silver/)).toBeInTheDocument();
  });

  it('crosses to next tier exactly at boundary (400 -> Silver)', () => {
    render(
      <AccumulatedScoreDisplay currentScore={400} lastIncrement={null} isAnimating={false} t={t} />
    );
    expect(screen.getByText(/Silver/)).toBeInTheDocument();
    expect(screen.getByText(/200 to Gold/)).toBeInTheDocument();
  });
});
