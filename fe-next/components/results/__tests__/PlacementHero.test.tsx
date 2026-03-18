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
      h1: (() => { const MotionH1 = React.forwardRef(({ children, className, ...rest }: React.PropsWithChildren<{ className?: string }>, ref: React.Ref<HTMLHeadingElement>) => (
        <h1 ref={ref} className={className}>{children}</h1>
      )); MotionH1.displayName = 'motion.h1'; return MotionH1; })(),
      p: (() => { const MotionP = React.forwardRef(({ children, className, ...rest }: React.PropsWithChildren<{ className?: string }>, ref: React.Ref<HTMLParagraphElement>) => (
        <p ref={ref} className={className}>{children}</p>
      )); MotionP.displayName = 'motion.p'; return MotionP; })(),
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
  default: ({ size, className }: { size: string; className?: string }) => <div data-testid="avatar" data-size={size} className={className} />,
}));

describe('PlacementHero — Fight Card Edition', () => {

  const PlacementHero = require('../PlacementHero').default;

  const defaultProps = {
    rank: 1,
    score: 450,
    totalPlayers: 4,
    username: 'TestPlayer',
    avatar: { avatarImage: 'fox' },
  };

  it('renders ghost rank number overlay', () => {
    render(<PlacementHero {...defaultProps} />);
    // Ghost rank number is the huge background number
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders ordinal placement text', () => {
    render(<PlacementHero {...defaultProps} />);
    expect(screen.getByText(/1st/)).toBeInTheDocument();
  });

  it('renders score counter starting at 0', () => {
    render(<PlacementHero {...defaultProps} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders FINAL SCORE label', () => {
    render(<PlacementHero {...defaultProps} />);
    expect(screen.getByText('results.finalScore')).toBeInTheDocument();
  });

  it('renders GREAT VICTORY for 1st place', () => {
    render(<PlacementHero {...defaultProps} rank={1} />);
    expect(screen.getByText('results.greatVictory')).toBeInTheDocument();
  });

  it('renders GREAT BATTLE for non-winners', () => {
    render(<PlacementHero {...defaultProps} rank={2} />);
    expect(screen.getByText('results.greatBattle')).toBeInTheDocument();
  });

  it('renders GREAT BATTLE for 4th+ place', () => {
    render(<PlacementHero {...defaultProps} rank={5} />);
    expect(screen.getByText('results.greatBattle')).toBeInTheDocument();
  });

  it('shows gap to winner for non-winners', () => {
    render(<PlacementHero {...defaultProps} rank={2} gapToWinner={85} />);
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

  it('renders correct ordinal for 2nd, 3rd, 4th', () => {
    const { rerender } = render(<PlacementHero {...defaultProps} rank={2} />);
    expect(screen.getByText(/2nd/)).toBeInTheDocument();

    rerender(<PlacementHero {...defaultProps} rank={3} />);
    expect(screen.getByText(/3rd/)).toBeInTheDocument();

    rerender(<PlacementHero {...defaultProps} rank={4} />);
    expect(screen.getByText(/4th/)).toBeInTheDocument();
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

  it('does not render title text when wordHuntData provided', () => {
    render(<PlacementHero {...defaultProps} wordHuntData={{
      targetWord: 'SPECTRE',
      foundTarget: false,
      survivalTime: 90,
    }} />);
    expect(screen.queryByText('results.greatVictory')).not.toBeInTheDocument();
  });
});
