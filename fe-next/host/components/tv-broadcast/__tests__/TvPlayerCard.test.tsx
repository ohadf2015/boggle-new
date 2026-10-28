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
        // For score bar, surface the animated fill from the animate prop.
        const animatedStyle = animate?.width
          ? { width: animate.width }
          : typeof animate?.scaleX === 'number'
            ? { transform: `scaleX(${animate.scaleX})` }
            : {};
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

  it('renders score bar filled to the correct proportion', () => {
    render(<TvPlayerCard {...defaultProps} score={100} leaderScore={200} rank={2} />);
    const bar = screen.getByTestId('score-bar');
    expect(bar).toBeInTheDocument();
    expect(bar.style.transform).toBe('scaleX(0.5)');
  });

  it('score bar is 100% for rank 1', () => {
    render(<TvPlayerCard {...defaultProps} score={200} leaderScore={200} rank={1} />);
    const bar = screen.getByTestId('score-bar');
    expect(bar.style.transform).toBe('scaleX(1)');
  });

  it('score bar scales proportionally for other ranks', () => {
    render(<TvPlayerCard {...defaultProps} score={50} leaderScore={200} rank={4} />);
    const bar = screen.getByTestId('score-bar');
    expect(bar.style.transform).toBe('scaleX(0.25)');
  });

  it('score bar on a medal row is a dark track the medal colour shows through', () => {
    for (const rank of [1, 2, 3]) {
      const { unmount } = render(<TvPlayerCard {...defaultProps} rank={rank} />);
      expect(screen.getByTestId('score-bar').className).toContain('bg-neo-black/30');
      unmount();
    }
  });

  it('score bar color is neo-cyan for ranks beyond 3', () => {
    render(<TvPlayerCard {...defaultProps} rank={5} />);
    expect(screen.getByTestId('score-bar').className).toContain('bg-neo-cyan');
  });

  it('dresses the medal rows in brand colours, not soft gradients', () => {
    const fills: Record<number, string> = { 1: 'bg-neo-yellow', 2: 'bg-neo-cyan', 3: 'bg-neo-pink' };
    for (const rank of [1, 2, 3]) {
      const { container, unmount } = render(<TvPlayerCard {...defaultProps} rank={rank} />);
      expect((container.firstElementChild as HTMLElement).className).toContain(fills[rank]);
      unmount();
    }
  });

  it('never paints a hardcoded or off-brand colour', () => {
    for (const rank of [1, 2, 3, 5]) {
      const { container, unmount } = render(<TvPlayerCard {...defaultProps} rank={rank} comboLevel={12} />);
      const classes = Array.from(container.querySelectorAll('*')).map((el) => el.getAttribute('class') ?? '').join(' ');
      expect(classes).not.toMatch(/\b(?:bg|text|border|from|to|shadow)-(?:gray|amber|yellow|green|red|white)-\d{2,3}\b|bg-linear|rgba\(|#[0-9a-f]{3,6}\b|\btext-white\b/i);
      unmount();
    }
  });

  it('shows score delta badge when score increases', () => {
    const { rerender } = render(<TvPlayerCard {...defaultProps} score={100} />);
    // No badge on first render
    expect(screen.queryByTestId('score-delta')).toBeNull();

    rerender(<TvPlayerCard {...defaultProps} score={145} />);
    const delta = screen.getByTestId('score-delta');
    expect(delta).toHaveTextContent('+45');
  });

  it('given a score jump on a narrow screen, when the delta shows, then it floats over the score and never takes width from the name', () => {
    const { rerender } = render(<TvPlayerCard {...defaultProps} score={100} />);
    rerender(<TvPlayerCard {...defaultProps} score={145} />);
    expect(screen.getByTestId('score-delta').className).toMatch(/(^|\s)absolute(\s|$)/);
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
    expect(bar.style.transform).toBe('scaleX(0)');
  });
});
