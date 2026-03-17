import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
jest.mock('framer-motion', () => {
  const actual = jest.requireActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: (() => { const MotionDiv = React.forwardRef(({ children, className, onClick, style, ...rest }: React.PropsWithChildren<{ className?: string; onClick?: () => void; style?: React.CSSProperties; 'data-testid'?: string }>, ref: React.Ref<HTMLDivElement>) => (
        <div ref={ref} className={className} onClick={onClick} style={style} data-testid={rest['data-testid']}>{children}</div>
      )); MotionDiv.displayName = 'motion.div'; return MotionDiv; })(),
    },
    useMotionValue: (initial: number) => ({
      get: () => initial,
      set: jest.fn(),
      on: () => jest.fn(),
    }),
    useTransform: (_mv: unknown, fn: (v: number) => number) => ({
      get: () => fn(0),
      on: (_event: string, cb: (v: number) => void) => { cb(fn(0)); return jest.fn(); },
    }),
    animate: () => ({ stop: jest.fn() }),
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

// Mock dependencies
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, params?: Record<string, string | number>) => {
    if (params) {
      let result = key;
      Object.entries(params).forEach(([k, v]) => { result = result.replace(`{${k}}`, String(v)); });
      return result;
    }
    return key;
  }, dir: 'ltr' }),
}));

jest.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: () => false,
}));

jest.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: jest.fn(),
}));

jest.mock('../../Avatar', () => ({
  __esModule: true,
  default: ({ size }: { size: string }) => <div data-testid="avatar" data-size={size} />,
}));

jest.mock('../PlacementMascot', () => ({
  __esModule: true,
  default: ({ rank }: { rank: number }) => <div data-testid="placement-mascot" data-rank={rank} />,
}));

describe('PlacementHero', () => {
   
  const PlacementHero = require('../PlacementHero').default;

  const defaultProps = {
    rank: 1,
    score: 450,
    totalPlayers: 4,
    username: 'TestPlayer',
    avatar: { avatarImage: 'fox' },
  };

  it('renders rank number prominently', () => {
    render(<PlacementHero {...defaultProps} />);
    // The rank number should be visible in the hero
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders username', () => {
    render(<PlacementHero {...defaultProps} />);
    expect(screen.getByText('TestPlayer')).toBeInTheDocument();
  });

  it('renders score counter starting at 0', () => {
    render(<PlacementHero {...defaultProps} />);
    // AnimatedScore starts at 0 due to mocked useMotionValue
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders ordinal placement text', () => {
    render(<PlacementHero {...defaultProps} />);
    // Should show "1st results.yourPlace" (with mocked t())
    expect(screen.getByText(/1st/)).toBeInTheDocument();
  });

  it('renders points label', () => {
    render(<PlacementHero {...defaultProps} />);
    expect(screen.getByText('results.points')).toBeInTheDocument();
  });

  it('renders rank message for 1st place', () => {
    render(<PlacementHero {...defaultProps} rank={1} />);
    expect(screen.getByText('results.youWon')).toBeInTheDocument();
  });

  it('renders rank message for 2nd place', () => {
    render(<PlacementHero {...defaultProps} rank={2} />);
    expect(screen.getByText('results.secondPlace')).toBeInTheDocument();
  });

  it('renders rank message for 3rd place', () => {
    render(<PlacementHero {...defaultProps} rank={3} />);
    expect(screen.getByText('results.thirdPlace')).toBeInTheDocument();
  });

  it('renders encouraging message for 4th+ place', () => {
    render(<PlacementHero {...defaultProps} rank={5} />);
    expect(screen.getByText('results.betterLuckNextTime')).toBeInTheDocument();
  });

  it('shows gap to winner for non-winners', () => {
    render(<PlacementHero {...defaultProps} rank={2} gapToWinner={85} />);
    // The mock t() replaces {points} with 85 in the key string
    expect(screen.getByText(/results\.pointsBehind/)).toBeInTheDocument();
  });

  it('does not show gap to winner for 1st place', () => {
    render(<PlacementHero {...defaultProps} rank={1} gapToWinner={0} />);
    expect(screen.queryByText('results.pointsBehind')).not.toBeInTheDocument();
  });

  it('renders avatar when provided', () => {
    render(<PlacementHero {...defaultProps} />);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('does not render avatar when not provided', () => {
    const { avatar: _, ...propsWithoutAvatar } = defaultProps;
    render(<PlacementHero {...propsWithoutAvatar} />);
    expect(screen.queryByTestId('avatar')).not.toBeInTheDocument();
  });

  it('fires confetti for top 3', () => {
    const { fireRankConfetti } = require('@/utils/confettiUtils');
    jest.useFakeTimers();
    render(<PlacementHero {...defaultProps} rank={2} />);
    jest.advanceTimersByTime(600);
    expect(fireRankConfetti).toHaveBeenCalledWith(2, 'light');
    jest.useRealTimers();
  });

  it('renders the placement mascot', () => {
    render(<PlacementHero {...defaultProps} />);
    const mascots = screen.getAllByTestId('placement-mascot');
    expect(mascots.length).toBeGreaterThanOrEqual(1);
  });

  it('passes rank to mascot', () => {
    render(<PlacementHero {...defaultProps} rank={3} />);
    const mascots = screen.getAllByTestId('placement-mascot');
    expect(mascots[0].getAttribute('data-rank')).toBe('3');
  });

  it('renders correct ordinal for 2nd, 3rd, 4th', () => {
    const { rerender } = render(<PlacementHero {...defaultProps} rank={2} />);
    expect(screen.getByText(/2nd/)).toBeInTheDocument();

    rerender(<PlacementHero {...defaultProps} rank={3} />);
    expect(screen.getByText(/3rd/)).toBeInTheDocument();

    rerender(<PlacementHero {...defaultProps} rank={4} />);
    expect(screen.getByText(/4th/)).toBeInTheDocument();
  });
});
