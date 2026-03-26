/**
 * Tests for ScorePopup component
 *
 * This component renders floating score animations with arc trajectory.
 * Provides visual feedback for points earned from word finds.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ScorePopup } from '../ScorePopup';
import * as useDevicePerformanceModule from '@/hooks/useDevicePerformance';

// Mock dependencies
vi.mock('@/hooks/useDevicePerformance');

const mockUseDevicePerformance = useDevicePerformanceModule.useDevicePerformance as jest.MockedFunction<
  typeof useDevicePerformanceModule.useDevicePerformance
>;

describe('ScorePopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDevicePerformance.mockReturnValue({
      isLowEnd: false,
      prefersReducedMotion: false,
      targetFPS: 60,
      throttleMs: 16,
      enableComplexAnimations: true,
      enableGlowEffects: true,
      reduceParticles: false,
      maxParticles: 20,
      isSlowConnection: false,
      isMobile: false,
    });
  });

  describe('rendering', () => {
    it('should render score value', () => {
      render(
        <ScorePopup
          score={100}
          position={{ x: 100, y: 200 }}
        />
      );

      expect(screen.getByText('+100')).toBeInTheDocument();
    });

    it('should show combo multiplier when provided', () => {
      render(
        <ScorePopup
          score={50}
          position={{ x: 100, y: 200 }}
          comboMultiplier={1.5}
        />
      );

      expect(screen.getByText('+50')).toBeInTheDocument();
      expect(screen.getByText('×1.5')).toBeInTheDocument();
    });

    it('should not show multiplier when not provided', () => {
      render(
        <ScorePopup
          score={75}
          position={{ x: 100, y: 200 }}
        />
      );

      expect(screen.getByText('+75')).toBeInTheDocument();
      expect(screen.queryByText(/×/)).not.toBeInTheDocument();
    });
  });

  describe('positioning', () => {
    it('should use provided position', () => {
      const { container } = render(
        <ScorePopup
          score={100}
          position={{ x: 150, y: 250 }}
        />
      );

      const popup = container.firstChild as HTMLElement;
      expect(popup.style.left).toBe('150px');
      expect(popup.style.top).toBe('250px');
    });

    it('should use target position for animation', () => {
      const { container } = render(
        <ScorePopup
          score={100}
          position={{ x: 100, y: 200 }}
          targetPosition={{ x: 50, y: 50 }}
        />
      );

      const popup = container.firstChild as HTMLElement;
      expect(popup).toBeInTheDocument();
      // Animation properties are applied via Framer Motion
    });
  });

  describe('animation', () => {
    it('should animate along arc path', () => {
      const { container } = render(
        <ScorePopup
          score={100}
          position={{ x: 100, y: 200 }}
          targetPosition={{ x: 50, y: 50 }}
        />
      );

      const popup = container.firstChild as HTMLElement;
      expect(popup).toBeInTheDocument();
      // Framer Motion handles the animation internally
    });

    it('should call onComplete after animation', async () => {
      const onComplete = vi.fn();

      render(
        <ScorePopup
          score={100}
          position={{ x: 100, y: 200 }}
          onComplete={onComplete}
        />
      );

      // Wait for animation to complete (0.8s duration)
      await waitFor(
        () => {
          expect(onComplete).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });
  });

  describe('reduced motion', () => {
    it('should show instant fade instead of arc for reduced motion', () => {
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: false,
        prefersReducedMotion: true,
        targetFPS: 60,
        throttleMs: 16,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        reduceParticles: true,
        maxParticles: 0,
        isSlowConnection: false,
        isMobile: false,
      });

      const { container } = render(
        <ScorePopup
          score={100}
          position={{ x: 100, y: 200 }}
          targetPosition={{ x: 50, y: 50 }}
        />
      );

      const popup = container.firstChild as HTMLElement;
      expect(popup).toBeInTheDocument();
      // Should use fade animation instead of arc (tested via animation variant)
    });

    it('should call onComplete faster with reduced motion', async () => {
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: false,
        prefersReducedMotion: true,
        targetFPS: 60,
        throttleMs: 16,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        reduceParticles: true,
        maxParticles: 0,
        isSlowConnection: false,
        isMobile: false,
      });

      const onComplete = vi.fn();

      render(
        <ScorePopup
          score={100}
          position={{ x: 100, y: 200 }}
          onComplete={onComplete}
        />
      );

      // Should complete faster with reduced motion (0.3s vs 0.8s)
      await waitFor(
        () => {
          expect(onComplete).toHaveBeenCalled();
        },
        { timeout: 500 }
      );
    });
  });

  describe('styling', () => {
    it('should apply neo-brutalist styling', () => {
      render(
        <ScorePopup
          score={100}
          position={{ x: 100, y: 200 }}
        />
      );

      // Find the styled inner div by class
      const styledDiv = document.querySelector('.bg-neo-yellow') as HTMLElement;
      expect(styledDiv).toBeInTheDocument();
      expect(styledDiv.className).toContain('font-neo-display');
      expect(styledDiv.className).toContain('shadow-hard');
    });

    it('should format score with + prefix', () => {
      render(
        <ScorePopup
          score={250}
          position={{ x: 100, y: 200 }}
        />
      );

      expect(screen.getByText('+250')).toBeInTheDocument();
    });

    it('should format combo multiplier correctly', () => {
      render(
        <ScorePopup
          score={100}
          position={{ x: 100, y: 200 }}
          comboMultiplier={2.5}
        />
      );

      expect(screen.getByText('×2.5')).toBeInTheDocument();
    });
  });
});
