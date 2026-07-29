/**
 * PowerUpActivationEffect Component Tests
 *
 * Tests for 0.25s burst effect on power-up activation.
 */

import { render } from '@testing-library/react';
import { PowerUpActivationEffect } from '../PowerUpActivationEffect';
import type { PowerUpType } from '@/types/adventure';

// Mock hooks
const mockShake = vi.fn();
const mockPrefersReducedMotion = vi.fn(() => false);

vi.mock('@/hooks/useScreenShake', () => ({
  useScreenShake: () => ({
    shakeRef: { current: null },
    shake: mockShake,
  }),
}));

vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => mockPrefersReducedMotion(),
}));

// Mock AdaptiveParticles
vi.mock('@/components/adventure/juice/AdaptiveParticles', () => ({
  AdaptiveParticles: ({
    type,
    intensity,
    colors,
    origin,
  }: {
    type: string;
    intensity: number;
    colors: string[];
    origin: { x: number; y: number };
  }) => (
    <div
      data-testid="adaptive-particles"
      data-type={type}
      data-intensity={intensity}
      data-colors={JSON.stringify(colors)}
      data-origin={JSON.stringify(origin)}
    />
  ),
}));

describe('PowerUpActivationEffect', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockPrefersReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Animation with Motion', () => {
    it('calls useScreenShake with correct parameters', () => {
      render(
        <PowerUpActivationEffect
          type="freezeTime"
          origin={{ x: 0.5, y: 0.5 }}
          onComplete={mockOnComplete}
        />
      );

      expect(mockShake).toHaveBeenCalledWith(4, 250);
    });

    it('fires AdaptiveParticles with type="combo" intensity=2', () => {
      const { container } = render(
        <PowerUpActivationEffect
          type="freezeTime"
          origin={{ x: 0.5, y: 0.5 }}
          onComplete={mockOnComplete}
        />
      );

      const particles = container.querySelector('[data-testid="adaptive-particles"]');
      expect(particles).toHaveAttribute('data-type', 'combo');
      expect(particles).toHaveAttribute('data-intensity', '2');
    });

    it('calls onComplete after 250ms', () => {
      render(
        <PowerUpActivationEffect
          type="freezeTime"
          origin={{ x: 0.5, y: 0.5 }}
          onComplete={mockOnComplete}
        />
      );

      expect(mockOnComplete).not.toHaveBeenCalled();

      vi.advanceTimersByTime(250);

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reduced Motion', () => {
    beforeEach(() => {
      mockPrefersReducedMotion.mockReturnValue(true);
    });

    it('skips animation when prefers-reduced-motion', () => {
      render(
        <PowerUpActivationEffect
          type="freezeTime"
          origin={{ x: 0.5, y: 0.5 }}
          onComplete={mockOnComplete}
        />
      );

      // Should not call shake
      expect(mockShake).not.toHaveBeenCalled();

      // Should call onComplete immediately
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('does NOT render AdaptiveParticles when reduced motion', () => {
      const { container } = render(
        <PowerUpActivationEffect
          type="freezeTime"
          origin={{ x: 0.5, y: 0.5 }}
          onComplete={mockOnComplete}
        />
      );

      const particles = container.querySelector('[data-testid="adaptive-particles"]');
      expect(particles).not.toBeInTheDocument();
    });
  });

  describe('Color Schemes by Power-Up Type', () => {
    it('uses cyan/blue colors for freezeTime', () => {
      const { container } = render(
        <PowerUpActivationEffect
          type="freezeTime"
          origin={{ x: 0.5, y: 0.5 }}
        />
      );

      const particles = container.querySelector('[data-testid="adaptive-particles"]');
      const colors = JSON.parse(particles?.getAttribute('data-colors') || '[]');

      expect(colors).toContain('#00FFFF'); // cyan
      expect(colors).toContain('#0080FF'); // blue
    });

    it('uses yellow/gold colors for hint', () => {
      const { container } = render(
        <PowerUpActivationEffect
          type="hint"
          origin={{ x: 0.5, y: 0.5 }}
        />
      );

      const particles = container.querySelector('[data-testid="adaptive-particles"]');
      const colors = JSON.parse(particles?.getAttribute('data-colors') || '[]');

      expect(colors).toContain('#FFE135'); // yellow
      expect(colors).toContain('#FFD700'); // gold
    });

    it('uses purple/pink colors for scoreMultiplier', () => {
      const { container } = render(
        <PowerUpActivationEffect
          type="scoreMultiplier"
          origin={{ x: 0.5, y: 0.5 }}
        />
      );

      const particles = container.querySelector('[data-testid="adaptive-particles"]');
      const colors = JSON.parse(particles?.getAttribute('data-colors') || '[]');

      expect(colors).toContain('#9B59B6'); // purple
      expect(colors).toContain('#FF1493'); // pink
    });
  });

  describe('Origin Position', () => {
    it('passes origin to AdaptiveParticles', () => {
      const { container } = render(
        <PowerUpActivationEffect
          type="freezeTime"
          origin={{ x: 0.3, y: 0.7 }}
        />
      );

      const particles = container.querySelector('[data-testid="adaptive-particles"]');
      const origin = JSON.parse(particles?.getAttribute('data-origin') || '{}');

      expect(origin).toEqual({ x: 0.3, y: 0.7 });
    });
  });

  describe('Component Rendering', () => {
    it('renders AdaptiveParticles when motion allowed', () => {
      const { container } = render(
        <PowerUpActivationEffect
          type="freezeTime"
          origin={{ x: 0.5, y: 0.5 }}
        />
      );

      // Component renders AdaptiveParticles (which is the visual output)
      const particles = container.querySelector('[data-testid="adaptive-particles"]');
      expect(particles).toBeInTheDocument();
    });
  });

  describe('Optional onComplete', () => {
    it('handles missing onComplete gracefully', () => {
      expect(() => {
        render(
          <PowerUpActivationEffect
            type="freezeTime"
            origin={{ x: 0.5, y: 0.5 }}
          />
        );

        vi.advanceTimersByTime(250);
      }).not.toThrow();
    });
  });
});
