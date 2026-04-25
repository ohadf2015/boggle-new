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
    'wordHunt.survival.score.tier.bronzeFlavor': 'Warming up',
    'wordHunt.survival.score.tier.silverFlavor': 'Climbing',
    'wordHunt.survival.score.tier.goldFlavor': 'On fire',
    'wordHunt.survival.score.tier.platinumFlavor': 'Untouchable',
    'wordHunt.survival.score.tier.toNext': '{points} to {next}',
    'wordHunt.survival.score.tier.maxed': 'Legendary · maxed out',
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
    expect(screen.getByText(/Warming up/)).toBeInTheDocument();
  });

  it('shows Silver tier + points to Gold when score in [400,600)', () => {
    render(
      <AccumulatedScoreDisplay currentScore={450} lastIncrement={null} isAnimating={false} t={t} />
    );
    expect(screen.getByText(/Silver/)).toBeInTheDocument();
    // 600 - 450 = 150
    expect(screen.getByText(/150 to Gold/)).toBeInTheDocument();
    expect(screen.getByText(/Climbing/)).toBeInTheDocument();
  });

  it('shows Gold tier + points to Platinum when score in [600,800)', () => {
    render(
      <AccumulatedScoreDisplay currentScore={750} lastIncrement={null} isAnimating={false} t={t} />
    );
    expect(screen.getByText(/Gold/)).toBeInTheDocument();
    // 800 - 750 = 50
    expect(screen.getByText(/50 to Platinum/)).toBeInTheDocument();
    expect(screen.getByText(/On fire/)).toBeInTheDocument();
  });

  it('shows Platinum tier + maxed message when score >= 800', () => {
    render(
      <AccumulatedScoreDisplay currentScore={900} lastIncrement={null} isAnimating={false} t={t} />
    );
    expect(screen.getByText(/Platinum/)).toBeInTheDocument();
    expect(screen.getByText(/Legendary · maxed out/)).toBeInTheDocument();
    expect(screen.getByText(/Untouchable/)).toBeInTheDocument();
    // Must NOT show a "to X" message once maxed
    expect(screen.queryByText(/to Platinum/)).not.toBeInTheDocument();
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
