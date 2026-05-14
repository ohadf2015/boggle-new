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
});
