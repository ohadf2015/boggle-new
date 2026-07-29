import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvGapIndicator from '../TvGapIndicator';

vi.mock('framer-motion', () => ({
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
          data-testid={rest['data-testid']}
          aria-label={rest['aria-label']}
          role={rest.role}
        >
          {children}
        </div>
      );
    }),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  Flame: (props: any) => <span data-testid="flame-icon" {...props} />,
}));

const mockT = (key: string, params?: Record<string, string | number>) => {
  if (key === 'tvBroadcast.gap') return 'GAP';
  if (key === 'tvBroadcast.ptsGap' && params) return `${params.gap} pts gap`;
  if (key === 'tvBroadcast.closingFast') return 'CLOSING FAST';
  return key;
};

const defaultProps = {
  leaderScore: 200,
  secondScore: 100,
  leaderName: 'Alice',
  secondName: 'Bob',
  t: mockT,
};

describe('TvGapIndicator', () => {
  it('does not render when gap is less than 15% of leader score', () => {
    const { container } = render(
      <TvGapIndicator {...defaultProps} leaderScore={200} secondScore={180} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders when gap exceeds 15%', () => {
    render(<TvGapIndicator {...defaultProps} leaderScore={200} secondScore={100} />);
    expect(screen.getByText(/100 pts gap/)).toBeInTheDocument();
  });

  it('shows point difference', () => {
    render(<TvGapIndicator {...defaultProps} leaderScore={300} secondScore={60} />);
    expect(screen.getByText(/240 pts gap/)).toBeInTheDocument();
  });

  it('has dashed border styling', () => {
    render(<TvGapIndicator {...defaultProps} />);
    const indicator = screen.getByTestId('gap-indicator');
    expect(indicator.className).toContain('border-dashed');
  });

  it('has accessible aria-label', () => {
    render(<TvGapIndicator {...defaultProps} />);
    expect(screen.getByLabelText(/100 pts gap/)).toBeInTheDocument();
  });

  it('shows CLOSING FAST when gap decreased rapidly', () => {
    const { rerender } = render(
      <TvGapIndicator {...defaultProps} leaderScore={200} secondScore={100} />
    );
    // Gap was 100, now shrinks by >30% (to <70)
    rerender(
      <TvGapIndicator {...defaultProps} leaderScore={200} secondScore={165} />
    );
    expect(screen.getByText('CLOSING FAST')).toBeInTheDocument();
  });
});
