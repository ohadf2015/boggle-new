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
        { children, className, style, ...rest }: any,
        ref: any
      ) {
        return (
          <div
            ref={ref}
            className={className}
            style={style}
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
          <span
            ref={ref}
            className={className}
            data-testid={rest['data-testid']}
          >
            {children}
          </span>
        );
      }),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock Avatar
vi.mock('../../../../components/Avatar', () => ({
  default: function MockAvatar({ className }: any) {
    return <div data-testid="avatar" className={className} />;
  },
}));

// Mock AnimatedCounter
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

// Mock useDevicePerformance
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
};

describe('TvPlayerCard animations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Animated score counter', () => {
    it('uses AnimatedCounter component for score display', () => {
      render(<TvPlayerCard {...defaultProps} />);

      const counter = screen.getByTestId('animated-counter');
      expect(counter).toBeInTheDocument();
      expect(counter).toHaveTextContent('100');
    });

    it('passes score value to AnimatedCounter', () => {
      const { rerender } = render(<TvPlayerCard {...defaultProps} score={50} />);

      expect(screen.getByTestId('animated-counter')).toHaveTextContent('50');

      rerender(<TvPlayerCard {...defaultProps} score={150} />);
      expect(screen.getByTestId('animated-counter')).toHaveTextContent('150');
    });
  });

  describe('Score change flash', () => {
    it('shows flash ring-3 when score changes', () => {
      const { container, rerender } = render(
        <TvPlayerCard {...defaultProps} score={100} />
      );

      // Initially no flash
      expect(container.querySelector('.ring-neo-yellow')).toBeNull();

      // Change score
      rerender(<TvPlayerCard {...defaultProps} score={150} />);

      // Flash should appear
      expect(container.querySelector('.ring-neo-yellow')).toBeTruthy();
    });

    it('removes flash ring-3 after timeout', () => {
      const { container, rerender } = render(
        <TvPlayerCard {...defaultProps} score={100} />
      );

      rerender(<TvPlayerCard {...defaultProps} score={150} />);
      expect(container.querySelector('.ring-neo-yellow')).toBeTruthy();

      // Advance timer past 600ms
      act(() => {
        vi.advanceTimersByTime(700);
      });

      expect(container.querySelector('.ring-neo-yellow')).toBeNull();
    });

    it('does not flash on initial render', () => {
      const { container } = render(
        <TvPlayerCard {...defaultProps} score={100} />
      );

      expect(container.querySelector('.ring-neo-yellow')).toBeNull();
    });
  });

  describe('Rank change arrows', () => {
    it('shows up arrow when rank improves (lower number)', () => {
      const { rerender } = render(
        <TvPlayerCard {...defaultProps} rank={3} />
      );

      // Rank improves from 3 to 1
      rerender(<TvPlayerCard {...defaultProps} rank={1} />);

      expect(screen.getByLabelText('tvBroadcast.rankUp')).toBeInTheDocument();
    });

    it('shows down arrow when rank drops (higher number)', () => {
      const { rerender } = render(
        <TvPlayerCard {...defaultProps} rank={1} />
      );

      // Rank drops from 1 to 3
      rerender(<TvPlayerCard {...defaultProps} rank={3} />);

      expect(screen.getByLabelText('tvBroadcast.rankDown')).toBeInTheDocument();
    });

    it('auto-dismisses rank arrow after 3 seconds', () => {
      const { rerender } = render(
        <TvPlayerCard {...defaultProps} rank={3} />
      );

      rerender(<TvPlayerCard {...defaultProps} rank={1} />);
      expect(screen.getByLabelText('tvBroadcast.rankUp')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3100);
      });

      expect(screen.queryByLabelText('tvBroadcast.rankUp')).toBeNull();
    });

    it('does not show arrow on initial render', () => {
      render(<TvPlayerCard {...defaultProps} rank={1} />);

      expect(screen.queryByLabelText('tvBroadcast.rankUp')).toBeNull();
      expect(screen.queryByLabelText('tvBroadcast.rankDown')).toBeNull();
    });
  });

  describe('layout animation props', () => {
    it('has layout prop on the card container', () => {
      render(<TvPlayerCard {...defaultProps} />);

      const layoutElement = document.querySelector('[data-layout="true"]');
      expect(layoutElement).toBeInTheDocument();
    });

    it('has layoutId based on username', () => {
      render(<TvPlayerCard {...defaultProps} username="Alice" />);

      const layoutElement = document.querySelector(
        '[data-layout-id="player-Alice"]'
      );
      expect(layoutElement).toBeInTheDocument();
    });
  });
});
