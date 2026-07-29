import { vi, type Mock, } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvPlayerCard from '../TvPlayerCard';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const actual = vi.importActual('framer-motion');
  return {
    ...actual,
    m: {
      div: React.forwardRef(function MotionDiv(
        { children, className, style, animate, ...rest }: any,
        ref: any
      ) {
        // For score bar, extract width from animate prop
        const animatedStyle = animate?.width ? { width: animate.width } : {};
        return (
          <div
            ref={ref}
            className={className}
            style={{ ...style, ...animatedStyle }}
            data-layout={rest.layout ? 'true' : undefined}
            data-layout-id={rest.layoutId}
            data-testid={rest['data-testid']}
            aria-label={rest['aria-label']}
            role={rest.role}
          >
            {children}
          </div>
        );
      }),
      p: React.forwardRef(function MotionP(
        { children, className, ...rest }: any,
        ref: any
      ) {
        return (
          <p ref={ref} className={className} data-testid={rest['data-testid']}>
            {children}
          </p>
        );
      }),
      span: React.forwardRef(function MotionSpan(
        { children, className, ...rest }: any,
        ref: any
      ) {
        return (
          <span ref={ref} className={className} data-testid={rest['data-testid']}>
            {children}
          </span>
        );
      }),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('../../../../components/Avatar', () => ({
  default: function MockAvatar({ className }: any) {
    return <div data-testid="avatar" className={className} />;
  },
}));

vi.mock('../../../../components/ui/AnimatedCounter', () => ({
  AnimatedCounter: ({ value, className }: any) => (
    <span data-testid="animated-counter" className={className}>
      {value}
    </span>
  ),
  __esModule: true,
  default: ({ value, className }: any) => (
    <span data-testid="animated-counter" className={className}>
      {value}
    </span>
  ),
}));

vi.mock('../../../../hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    prefersReducedMotion: false,
    enableGlowEffects: true,
    enableComplexAnimations: true,
  }),
}));

const mockT = (key: string) => key;

const defaultProps = {
  username: 'Alice',
  score: 100,
  wordCount: 5,
  rank: 1,
  index: 0,
  t: mockT,
  leaderScore: 200,
};

describe('TvPlayerCard score bar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders score bar with correct width percentage', () => {
    render(<TvPlayerCard {...defaultProps} score={100} leaderScore={200} rank={2} />);
    const bar = screen.getByTestId('score-bar');
    expect(bar).toBeInTheDocument();
    expect(bar.style.width).toBe('50%');
  });

  it('score bar is 100% for rank 1', () => {
    render(<TvPlayerCard {...defaultProps} score={200} leaderScore={200} rank={1} />);
    const bar = screen.getByTestId('score-bar');
    expect(bar.style.width).toBe('100%');
  });

  it('score bar scales proportionally for other ranks', () => {
    render(<TvPlayerCard {...defaultProps} score={50} leaderScore={200} rank={4} />);
    const bar = screen.getByTestId('score-bar');
    expect(bar.style.width).toBe('25%');
  });

  it('score bar color is neo-yellow for rank 1', () => {
    render(<TvPlayerCard {...defaultProps} rank={1} />);
    const bar = screen.getByTestId('score-bar');
    expect(bar.className).toContain('bg-neo-yellow');
  });

  it('score bar color is gray-300 for rank 2', () => {
    render(<TvPlayerCard {...defaultProps} rank={2} />);
    const bar = screen.getByTestId('score-bar');
    expect(bar.className).toContain('bg-gray-300');
  });

  it('score bar color is amber-600 for rank 3', () => {
    render(<TvPlayerCard {...defaultProps} rank={3} />);
    const bar = screen.getByTestId('score-bar');
    expect(bar.className).toContain('bg-amber-600');
  });

  it('score bar color is neo-cyan/30 for ranks beyond 3', () => {
    render(<TvPlayerCard {...defaultProps} rank={5} />);
    const bar = screen.getByTestId('score-bar');
    expect(bar.className).toContain('bg-neo-cyan/30');
  });

  it('shows score delta badge when score increases', () => {
    const { rerender } = render(<TvPlayerCard {...defaultProps} score={100} />);
    // No badge on first render
    expect(screen.queryByTestId('score-delta')).toBeNull();

    rerender(<TvPlayerCard {...defaultProps} score={145} />);
    const delta = screen.getByTestId('score-delta');
    expect(delta).toHaveTextContent('+45');
  });

  it('no delta badge on first render', () => {
    render(<TvPlayerCard {...defaultProps} score={100} />);
    expect(screen.queryByTestId('score-delta')).toBeNull();
  });

  it('delta badge disappears after 2.5 seconds', () => {
    const { rerender } = render(<TvPlayerCard {...defaultProps} score={100} />);
    rerender(<TvPlayerCard {...defaultProps} score={150} />);
    expect(screen.getByTestId('score-delta')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2600);
    });

    expect(screen.queryByTestId('score-delta')).toBeNull();
  });

  it('handles leaderScore of 0 gracefully', () => {
    render(<TvPlayerCard {...defaultProps} score={0} leaderScore={0} />);
    const bar = screen.getByTestId('score-bar');
    expect(bar.style.width).toBe('0%');
  });
});
