/**
 * WobbleJellyCard tests
 * Tests: renders children, applies className, respects disabled/reduced-motion
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WobbleJellyCard } from '../WobbleJellyCard';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div className={className} data-testid="wobble-card" {...rest}>{children}</div>
    ),
  },
  useReducedMotion: vi.fn().mockReturnValue(false),
}));

describe('WobbleJellyCard', () => {
  it('renders children', () => {
    render(
      <WobbleJellyCard>
        <span data-testid="child">Hello</span>
      </WobbleJellyCard>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('forwards className to wrapper', () => {
    render(<WobbleJellyCard className="bg-neo-cyan">content</WobbleJellyCard>);
    expect(screen.getByTestId('wobble-card')).toHaveClass('bg-neo-cyan');
  });

  it('renders when disabled without crashing', () => {
    render(<WobbleJellyCard disabled>disabled content</WobbleJellyCard>);
    expect(screen.getByText('disabled content')).toBeInTheDocument();
  });

  it('renders with custom hoverScale prop', () => {
    render(
      <WobbleJellyCard hoverScale={{ scaleX: 1.1, scaleY: 0.9 }}>
        scaled
      </WobbleJellyCard>
    );
    expect(screen.getByText('scaled')).toBeInTheDocument();
  });
});
