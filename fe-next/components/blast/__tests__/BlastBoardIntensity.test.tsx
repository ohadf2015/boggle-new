import React from 'react';
import { render, screen } from '@testing-library/react';
import BlastBoardIntensity from '../BlastBoardIntensity';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  useReducedMotion: jest.fn(() => false),
}));

describe('BlastBoardIntensity', () => {
  it('renders children', () => {
    render(
      <BlastBoardIntensity intensity={0}>
        <div data-testid="child">Hello</div>
      </BlastBoardIntensity>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('no glow at intensity 0', () => {
    const { container } = render(
      <BlastBoardIntensity intensity={0}>
        <div>Test</div>
      </BlastBoardIntensity>
    );
    const glow = container.querySelector('[data-testid="blast-border-glow"]');
    expect(glow).not.toBeInTheDocument();
  });

  it('shows glow at intensity 1+', () => {
    render(
      <BlastBoardIntensity intensity={1}>
        <div>Test</div>
      </BlastBoardIntensity>
    );
    expect(screen.getByTestId('blast-border-glow')).toBeInTheDocument();
  });

  it('shows vignette at intensity 3+ (raised threshold for cleaner look)', () => {
    const { rerender } = render(
      <BlastBoardIntensity intensity={2}>
        <div>Test</div>
      </BlastBoardIntensity>
    );
    expect(screen.queryByTestId('blast-vignette')).not.toBeInTheDocument();

    rerender(
      <BlastBoardIntensity intensity={3}>
        <div>Test</div>
      </BlastBoardIntensity>
    );
    expect(screen.getByTestId('blast-vignette')).toBeInTheDocument();
  });

  it('skips all effects when reduced motion is preferred', () => {
    const { useReducedMotion } = require('framer-motion');
    useReducedMotion.mockReturnValue(true);

    render(
      <BlastBoardIntensity intensity={5}>
        <div>Test</div>
      </BlastBoardIntensity>
    );
    expect(screen.queryByTestId('blast-border-glow')).not.toBeInTheDocument();
    expect(screen.queryByTestId('blast-vignette')).not.toBeInTheDocument();

    useReducedMotion.mockReturnValue(false);
  });
});
