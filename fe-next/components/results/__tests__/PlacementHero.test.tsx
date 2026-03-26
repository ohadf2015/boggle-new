import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const actual = vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: (() => { const MotionDiv = React.forwardRef(({ children, className, onClick, style, 'data-testid': dataTestId }: React.PropsWithChildren<{ className?: string; onClick?: () => void; style?: React.CSSProperties; 'data-testid'?: string }>, ref: React.Ref<HTMLDivElement>) => (
        <div ref={ref} className={className} onClick={onClick} style={style} data-testid={dataTestId}>{children}</div>
      )); MotionDiv.displayName = 'motion.div'; return MotionDiv; })(),
      span: (() => { const MotionSpan = React.forwardRef(({ children, className }: React.PropsWithChildren<{ className?: string }>, ref: React.Ref<HTMLSpanElement>) => (
        <span ref={ref} className={className}>{children}</span>
      )); MotionSpan.displayName = 'motion.span'; return MotionSpan; })(),
    },
    useMotionValue: (initial: number) => ({
      get: () => initial,
      set: vi.fn(),
      on: () => vi.fn(),
    }),
    useTransform: (_mv: unknown, fn: (v: number) => number) => ({
      get: () => fn(0),
      on: (_event: string, cb: (v: number) => void) => { cb(fn(0)); return vi.fn(); },
    }),
    animate: () => ({ stop: vi.fn() }),
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, params?: Record<string, string | number>) => {
    if (params) {
      let result = key;
      Object.entries(params).forEach(([k, v]) => { result = result.replace(`{${k}}`, String(v)); });
      return result;
    }
    return key;
  }, dir: 'ltr' }),
}));

vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: () => false,
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
}));

vi.mock('../../Avatar', () => ({
  __esModule: true,
  default: ({ size, className }: { size: string; className?: string }) => <div data-testid="avatar" data-size={size} className={className} />,
}));

describe('PlacementHero — Clean Compact Layout', () => {

  const PlacementHero = require('../PlacementHero').default;

  const defaultProps = {
    rank: 1,
    score: 450,
    totalPlayers: 4,
    username: 'TestPlayer',
    avatar: { customAvatar: null },
  };

  it('renders rank ordinal in badge', () => {
    render(<PlacementHero {...defaultProps} />);
    expect(screen.getByText(/common\.ordinal1/)).toBeInTheDocument();
  });

  it('renders score counter starting at 0', () => {
    render(<PlacementHero {...defaultProps} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders points label', () => {
    render(<PlacementHero {...defaultProps} />);
    expect(screen.getByText('results.points')).toBeInTheDocument();
  });

  it('renders rank message in badge for 1st place', () => {
    render(<PlacementHero {...defaultProps} rank={1} />);
    expect(screen.getByText(/results\.youWon/)).toBeInTheDocument();
  });

  it('renders rank message for 2nd place', () => {
    render(<PlacementHero {...defaultProps} rank={2} />);
    expect(screen.getByText(/results\.secondPlace/)).toBeInTheDocument();
  });

  it('renders rank message for non-podium', () => {
    render(<PlacementHero {...defaultProps} rank={5} />);
    expect(screen.getByText(/results\.betterLuckNextTime/)).toBeInTheDocument();
  });

  it('shows gap to winner for non-winners', () => {
    render(<PlacementHero {...defaultProps} rank={2} gapToWinner={85} />);
    expect(screen.getByText(/-85/)).toBeInTheDocument();
  });

  it('does not show gap for 1st place', () => {
    render(<PlacementHero {...defaultProps} rank={1} gapToWinner={0} />);
    expect(screen.queryByText(/-0/)).not.toBeInTheDocument();
  });

  it('renders avatar', () => {
    render(<PlacementHero {...defaultProps} />);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('renders avatar with xl size', () => {
    render(<PlacementHero {...defaultProps} />);
    expect(screen.getByTestId('avatar')).toHaveAttribute('data-size', 'xl');
  });

  it('renders username', () => {
    render(<PlacementHero {...defaultProps} />);
    expect(screen.getByText('TestPlayer')).toBeInTheDocument();
  });

  it('fires confetti for top 3', () => {
    const { fireRankConfetti } = require('@/utils/confettiUtils');
    vi.useFakeTimers();
    render(<PlacementHero {...defaultProps} rank={2} />);
    vi.advanceTimersByTime(600);
    expect(fireRankConfetti).toHaveBeenCalledWith(2, 'light');
    vi.useRealTimers();
  });

  it('renders correct ordinals for 2nd, 3rd, 4th', () => {
    const { rerender } = render(<PlacementHero {...defaultProps} rank={2} />);
    expect(screen.getByText(/common\.ordinal2/)).toBeInTheDocument();

    rerender(<PlacementHero {...defaultProps} rank={3} />);
    expect(screen.getByText(/common\.ordinal3/)).toBeInTheDocument();

    rerender(<PlacementHero {...defaultProps} rank={4} />);
    expect(screen.getByText(/common\.ordinalN/)).toBeInTheDocument();
  });

  it('renders Word Hunt target word when wordHuntData provided', () => {
    render(<PlacementHero {...defaultProps} wordHuntData={{
      targetWord: 'SPECTRE',
      foundTarget: true,
      survivalTime: 165,
    }} />);
    expect(screen.getByText('SPECTRE')).toBeInTheDocument();
    expect(screen.getByText('results.foundByYou')).toBeInTheDocument();
    expect(screen.getByText('results.targetWord')).toBeInTheDocument();
  });
});
