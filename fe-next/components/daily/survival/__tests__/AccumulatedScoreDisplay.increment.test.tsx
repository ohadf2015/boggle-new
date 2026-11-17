import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AccumulatedScoreDisplay } from '../AccumulatedScoreDisplay';

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, initial: _i, animate: _a, exit: _e, transition: _t, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@react-spring/web', () => ({
  useSpring: () => ({ val: { to: (fn: (v: number) => string) => fn(0) } }),
  animated: {
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <span {...props}>{children}</span>,
  },
}));

describe('AccumulatedScoreDisplay — score delta chip', () => {
  it('Given a gain, When it shows, Then the chip sits beside the score on the inline-start side, not above it where the screen edge clips it', () => {
    render(<AccumulatedScoreDisplay currentScore={120} lastIncrement={33} isAnimating />);
    const chip = screen.getByTestId('score-increment');
    expect(chip).toHaveTextContent('+33');
    expect(chip.className).toMatch(/\bend-full\b/);
    expect(chip.className).not.toMatch(/-top-/);
  });

  it('Given the score slips as time passes, When it updates, Then no red minus chip flashes at the player', () => {
    render(<AccumulatedScoreDisplay currentScore={120} lastIncrement={-3} isAnimating />);
    expect(screen.queryByTestId('score-increment')).toBeNull();
  });
});
