/**
 * ScoreGaugeRing Tests
 * Tests the SVG gauge ring rendering and animation behavior.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScoreGaugeRing } from '../ScoreGaugeRing';

// Mock framer-motion to render static elements
const stripMotionProps = (props: Record<string, unknown>) => {
  const { initial, animate, transition, exit, variants, whileHover, whileTap, custom, ...rest } = props;
  return rest;
};

vi.mock('framer-motion', () => ({
  m: {
    circle: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = stripMotionProps(props);
      return <circle {...rest}>{children}</circle>;
    },
    line: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = stripMotionProps(props);
      return <line {...rest}>{children}</line>;
    },
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = stripMotionProps(props);
      return <div {...rest}>{children}</div>;
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const rest = stripMotionProps(props);
      return <span {...rest}>{children}</span>;
    },
  },
}));

// Mock useCountUp to return target immediately
vi.mock('@/hooks/useCountUp', () => ({
  useCountUp: ({ target }: { target: number }) => target,
}));

// Controllable device-performance mock — defaults to a capable device so the
// existing rendering tests are unaffected; individual tests override it.
const mockDevicePerf = vi.fn(() => ({
  isLowEnd: false,
  targetFPS: 60 as const,
  throttleMs: 16,
  enableComplexAnimations: true,
  enableGlowEffects: true,
  reduceParticles: false,
  maxParticles: 20,
  prefersReducedMotion: false,
  isSlowConnection: false,
  isMobile: false,
}));
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => mockDevicePerf(),
}));

describe('ScoreGaugeRing', () => {
  it('renders with score and max', () => {
    render(<ScoreGaugeRing score={750} maxScore={1000} />);
    const gauge = screen.getByTestId('score-gauge-ring');
    expect(gauge).toBeInTheDocument();
  });

  it('displays the animated score number when showScore is true', () => {
    render(<ScoreGaugeRing score={750} maxScore={1000} showScore />);
    const scoreEl = screen.getByTestId('gauge-score');
    expect(scoreEl).toHaveTextContent('750');
  });

  it('displays max score denominator', () => {
    render(<ScoreGaugeRing score={500} maxScore={1000} />);
    expect(screen.getByText('/ 1000')).toBeInTheDocument();
  });

  it('does not show score when showScore is false', () => {
    render(<ScoreGaugeRing score={500} maxScore={1000} showScore={false} />);
    expect(screen.queryByTestId('gauge-score')).not.toBeInTheDocument();
  });

  it('renders a label when provided', () => {
    render(<ScoreGaugeRing score={200} maxScore={400} label="Speed" />);
    expect(screen.getByText('Speed')).toBeInTheDocument();
  });

  it('renders an icon when provided', () => {
    render(
      <ScoreGaugeRing
        score={200}
        maxScore={400}
        icon={<span data-testid="test-icon">⚡</span>}
      />
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('handles 0 score gracefully', () => {
    render(<ScoreGaugeRing score={0} maxScore={1000} />);
    const scoreEl = screen.getByTestId('gauge-score');
    expect(scoreEl).toHaveTextContent('0');
  });

  it('handles 0 maxScore without crashing', () => {
    render(<ScoreGaugeRing score={0} maxScore={0} />);
    const gauge = screen.getByTestId('score-gauge-ring');
    expect(gauge).toBeInTheDocument();
  });

  describe('adaptive decorations', () => {
    beforeEach(() => {
      mockDevicePerf.mockReturnValue({
        isLowEnd: false, targetFPS: 60, throttleMs: 16, enableComplexAnimations: true,
        enableGlowEffects: true, reduceParticles: false, maxParticles: 20,
        prefersReducedMotion: false, isSlowConnection: false, isMobile: false,
      });
    });

    it('renders sparkles on a large ring when glow effects are enabled', () => {
      render(<ScoreGaugeRing score={800} maxScore={1000} size={200} />);
      expect(screen.getAllByTestId('gauge-sparkle').length).toBeGreaterThan(0);
    });

    it('renders NO sparkles when glow effects are disabled (low-end / reduced-motion)', () => {
      mockDevicePerf.mockReturnValue({
        isLowEnd: true, targetFPS: 30, throttleMs: 33, enableComplexAnimations: false,
        enableGlowEffects: false, reduceParticles: true, maxParticles: 0,
        prefersReducedMotion: true, isSlowConnection: false, isMobile: true,
      });
      render(<ScoreGaugeRing score={800} maxScore={1000} size={200} />);
      expect(screen.queryByTestId('gauge-sparkle')).toBeNull();
    });

    it('caps sparkle count to maxParticles', () => {
      mockDevicePerf.mockReturnValue({
        isLowEnd: false, targetFPS: 60, throttleMs: 16, enableComplexAnimations: true,
        enableGlowEffects: true, reduceParticles: true, maxParticles: 3,
        prefersReducedMotion: false, isSlowConnection: false, isMobile: true,
      });
      render(<ScoreGaugeRing score={1000} maxScore={1000} size={200} />);
      expect(screen.getAllByTestId('gauge-sparkle').length).toBeLessThanOrEqual(3);
    });
  });
});
