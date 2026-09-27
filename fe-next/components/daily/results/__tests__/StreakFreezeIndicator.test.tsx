/**
 * StreakFreezeIndicator Tests
 *
 * Tests for the streak freeze/shield indicator in daily results.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StreakFreezeIndicator } from '../StreakFreezeIndicator';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

const mockT = (key: string, params?: Record<string, string | number>) => {
  if (params) {
    return key + ':' + JSON.stringify(params);
  }
  return key;
};

describe('StreakFreezeIndicator', () => {
  it('renders nothing when freezesAvailable is 0 and not protected', () => {
    const { container } = render(
      <StreakFreezeIndicator freezesAvailable={0} isProtected={false} t={mockT} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders freeze count when freezes are available', () => {
    render(<StreakFreezeIndicator freezesAvailable={2} isProtected={false} t={mockT} />);
    expect(screen.getByTestId('streak-freeze-indicator')).toBeInTheDocument();
  });

  it('shows plural label for multiple shields', () => {
    render(<StreakFreezeIndicator freezesAvailable={3} isProtected={false} t={mockT} />);
    const indicator = screen.getByTestId('streak-freeze-indicator');
    expect(indicator.textContent).toContain('streak.freezeShields_plural');
  });

  it('shows singular label for one shield', () => {
    render(<StreakFreezeIndicator freezesAvailable={1} isProtected={false} t={mockT} />);
    const indicator = screen.getByTestId('streak-freeze-indicator');
    expect(indicator.textContent).toContain('streak.freezeShields');
  });

  it('shows active protection state when isProtected is true', () => {
    render(<StreakFreezeIndicator freezesAvailable={0} isProtected={true} t={mockT} />);
    expect(screen.getByTestId('streak-freeze-indicator')).toBeInTheDocument();
    expect(screen.getByText('streak.freezeShieldActive')).toBeInTheDocument();
  });

  it('shows hint text about auto-activation', () => {
    render(<StreakFreezeIndicator freezesAvailable={2} isProtected={false} t={mockT} />);
    expect(screen.getByText('streak.freezeShieldHint')).toBeInTheDocument();
  });

  it('renders shield icon', () => {
    render(<StreakFreezeIndicator freezesAvailable={1} isProtected={false} t={mockT} />);
    expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
  });

  it('uses green/active styling when protection is active', () => {
    render(<StreakFreezeIndicator freezesAvailable={0} isProtected={true} t={mockT} />);
    const indicator = screen.getByTestId('streak-freeze-indicator');
    expect(indicator.className).toMatch(/neo-lime|emerald|green/);
  });
});
