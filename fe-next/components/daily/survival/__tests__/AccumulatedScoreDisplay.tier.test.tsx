import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AccumulatedScoreDisplay } from '../AccumulatedScoreDisplay';

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@react-spring/web', () => ({
  useSpring: () => ({
    val: {
      to: (fn: (v: number) => string) => fn(0),
    },
  }),
  animated: {
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <span {...props}>{children}</span>,
  },
}));

describe('AccumulatedScoreDisplay — no tier ladder in the live HUD', () => {
  it.each([0, 450, 750, 810, 1000])('Given a live score of %i, shows the number without a tier label, bar or maxed note', (score) => {
    render(
      <AccumulatedScoreDisplay currentScore={score} lastIncrement={null} isAnimating={false} />
    );
    expect(screen.getByTestId('score-display')).toBeInTheDocument();
    expect(screen.queryByTestId('tier-progress-note')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/bronze|silver|gold|platinum|maxed|legendary/i)).not.toBeInTheDocument();
  });
});
