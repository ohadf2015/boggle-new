/**
 * ModeRevealOverlay — TDD tests for round number display in mode reveal splash
 *
 * Tests the gate logic: round text shows only when seriesRoundNumber >= 1,
 * hidden for first game (roundNumber=0) and when prop is undefined.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    // eslint-disable-next-line react/display-name
    div: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => {
      // Filter out framer-motion specific props
      const domProps: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        if (!['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'variants', 'layout'].includes(key)) {
          domProps[key] = value;
        }
      }
      return <div ref={ref} {...domProps}>{children}</div>;
    }),
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import ModeRevealOverlay from '../ModeRevealOverlay';

const mockT = (key: string, params?: Record<string, string | number>) => {
  if (key === 'countdown.round' && params?.number) return `ROUND ${params.number}`;
  if (key === 'countdown.modeReveal.classic') return 'CLASSIC!';
  if (key === 'countdown.modeReveal.blast') return 'BLAST!';
  return key;
};

describe('ModeRevealOverlay', () => {
  it('renders mode label', () => {
    render(<ModeRevealOverlay modeLabel="CLASSIC!" t={mockT} />);
    expect(screen.getByText('CLASSIC!')).toBeInTheDocument();
  });

  it('shows round number when seriesRoundNumber >= 1', () => {
    render(<ModeRevealOverlay modeLabel="BLAST!" seriesRoundNumber={2} t={mockT} />);
    // Display round = seriesRoundNumber + 1 (completed rounds + 1 = current round)
    expect(screen.getByText('ROUND 3')).toBeInTheDocument();
  });

  it('does NOT show round text when seriesRoundNumber is 0 (first game)', () => {
    render(<ModeRevealOverlay modeLabel="CLASSIC!" seriesRoundNumber={0} t={mockT} />);
    expect(screen.queryByText(/ROUND/)).not.toBeInTheDocument();
  });

  it('does NOT show round text when seriesRoundNumber is undefined', () => {
    render(<ModeRevealOverlay modeLabel="CLASSIC!" t={mockT} />);
    expect(screen.queryByText(/ROUND/)).not.toBeInTheDocument();
  });

  it('renders round text with correct test-id for integration targeting', () => {
    render(<ModeRevealOverlay modeLabel="CLASSIC!" seriesRoundNumber={4} t={mockT} />);
    expect(screen.getByTestId('round-splash')).toBeInTheDocument();
    expect(screen.getByTestId('round-splash')).toHaveTextContent('ROUND 5');
  });
});
