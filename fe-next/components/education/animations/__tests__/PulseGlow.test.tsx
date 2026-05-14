/**
 * PulseGlow tests
 * Tests: renders children, animates when active, no animation when inactive
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PulseGlow } from '../PulseGlow';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode; animate?: unknown }) => (
      <div className={className} style={style as React.CSSProperties} data-testid="pulse-glow-wrapper" data-animate={JSON.stringify((rest as Record<string, unknown>).animate)} {...rest}>{children}</div>
    ),
  },
  useReducedMotion: vi.fn().mockReturnValue(false),
}));

describe('PulseGlow', () => {
  it('renders children', () => {
    render(
      <PulseGlow active={false}>
        <span data-testid="child">Hello</span>
      </PulseGlow>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('applies glow animation wrapper when active', () => {
    render(
      <PulseGlow active={true}>
        <span>Content</span>
      </PulseGlow>
    );
    const wrapper = screen.getByTestId('pulse-glow-wrapper');
    expect(wrapper).toBeInTheDocument();
    // When active, animate prop should have boxShadow
    const animate = JSON.parse(wrapper.getAttribute('data-animate') || '{}');
    expect(animate).toHaveProperty('boxShadow');
  });

  it('does not animate when inactive', () => {
    render(
      <PulseGlow active={false}>
        <span>Content</span>
      </PulseGlow>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
    // Should not have pulse-glow-wrapper when inactive
    expect(screen.queryByTestId('pulse-glow-wrapper')).not.toBeInTheDocument();
  });

  it('forwards className', () => {
    render(
      <PulseGlow active={true} className="extra-class">
        <span>Content</span>
      </PulseGlow>
    );
    expect(screen.getByTestId('pulse-glow-wrapper')).toHaveClass('extra-class');
  });
});
