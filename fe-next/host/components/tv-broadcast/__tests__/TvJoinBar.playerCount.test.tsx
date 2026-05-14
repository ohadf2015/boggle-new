import { vi, type Mock, } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvJoinBar from '../TvJoinBar';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef(function MotionDiv(
      { children, className, style, role, ...rest }: any,
      ref: any
    ) {
      return (
        <div
          ref={ref}
          className={className}
          style={style}
          role={role}
          data-testid={rest['data-testid']}
          aria-labelledby={rest['aria-labelledby']}
          aria-label={rest['aria-label']}
        >
          {children}
        </div>
      );
    }),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock QRCodeSVG
vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <div data-testid="qr-code" />,
}));

// Mock AnimatedCounter
vi.mock('../../../../components/ui/AnimatedCounter', () => ({
  AnimatedCounter: ({ value, className }: any) => (
    <span data-testid="player-count-counter" className={className}>
      {value}
    </span>
  ),
  __esModule: true,
  default: ({ value, className }: any) => (
    <span data-testid="player-count-counter" className={className}>
      {value}
    </span>
  ),
}));

// Mock useDevicePerformance
vi.mock('../../../../hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    prefersReducedMotion: false,
    enableGlowEffects: true,
    enableComplexAnimations: true,
  }),
}));

const mockT = (key: string) => key;

describe('TvJoinBar player count animation', () => {
  it('uses AnimatedCounter for player count', () => {
    render(
      <TvJoinBar
        gameCode="ABC123"
        playerCount={5}
        t={mockT}
      />
    );

    const counter = screen.getByTestId('player-count-counter');
    expect(counter).toBeInTheDocument();
    expect(counter).toHaveTextContent('5');
  });

  it('updates AnimatedCounter when player count changes', () => {
    const { rerender } = render(
      <TvJoinBar gameCode="ABC123" playerCount={3} t={mockT} />
    );

    expect(screen.getByTestId('player-count-counter')).toHaveTextContent('3');

    rerender(
      <TvJoinBar gameCode="ABC123" playerCount={7} t={mockT} />
    );

    expect(screen.getByTestId('player-count-counter')).toHaveTextContent('7');
  });

  it('wraps player count in a keyed container for scale pop', () => {
    const { container, rerender } = render(
      <TvJoinBar gameCode="ABC123" playerCount={3} t={mockT} />
    );

    // The player count wrapper should use key={playerCount} for re-mount animation
    // We verify by checking the wrapper has data-testid
    const wrapper = screen.getByTestId('player-count-wrapper');
    expect(wrapper).toBeInTheDocument();
  });
});
