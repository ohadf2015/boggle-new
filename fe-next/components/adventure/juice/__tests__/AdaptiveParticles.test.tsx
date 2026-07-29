/**
 * Tests for AdaptiveParticles component
 *
 * This component wraps canvas-confetti with budget enforcement based on device performance.
 * It provides particle bursts for different game events (combo, levelUp, word, victory).
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { AdaptiveParticles } from '../AdaptiveParticles';
import * as useParticleBudgetModule from '@/hooks/useParticleBudget';
import * as confettiUtilsModule from '@/utils/confettiUtils';

// Mock dependencies
vi.mock('@/hooks/useParticleBudget');
vi.mock('@/utils/confettiUtils');

const mockUseParticleBudget = useParticleBudgetModule.useParticleBudget as jest.MockedFunction<
  typeof useParticleBudgetModule.useParticleBudget
>;

const mockFireConfetti = confettiUtilsModule.fireConfetti as jest.MockedFunction<
  typeof confettiUtilsModule.fireConfetti
>;

describe('AdaptiveParticles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should fire particles with correct count for device tier', async () => {
      mockUseParticleBudget.mockReturnValue({
        tier: 'high',
        max: 100,
        combo: 15,
        levelUp: 60,
        word: 10,
      });

      const onComplete = vi.fn();
      mockFireConfetti.mockResolvedValue(null);

      render(
        <AdaptiveParticles
          type="combo"
          intensity={1}
          onComplete={onComplete}
        />
      );

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      // Should use combo budget (15 particles) * intensity (1) = 15
      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.particleCount).toBe(15);
    });

    it('should use correct origin position', async () => {
      mockUseParticleBudget.mockReturnValue({
        tier: 'medium',
        max: 60,
        combo: 10,
        levelUp: 40,
        word: 6,
      });

      mockFireConfetti.mockResolvedValue(null);

      render(
        <AdaptiveParticles
          type="word"
          origin={{ x: 0.3, y: 0.5 }}
        />
      );

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.origin).toEqual({ x: 0.3, y: 0.5 });
    });

    it('should call onComplete after animation', async () => {
      mockUseParticleBudget.mockReturnValue({
        tier: 'high',
        max: 100,
        combo: 15,
        levelUp: 60,
        word: 10,
      });

      const onComplete = vi.fn();
      mockFireConfetti.mockResolvedValue(null);

      render(
        <AdaptiveParticles
          type="levelUp"
          onComplete={onComplete}
        />
      );

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });
  });

  describe('intensity scaling', () => {
    it('should scale particle count by intensity', async () => {
      mockUseParticleBudget.mockReturnValue({
        tier: 'high',
        max: 100,
        combo: 15,
        levelUp: 60,
        word: 10,
      });

      mockFireConfetti.mockResolvedValue(null);

      // Test intensity = 4 (for tier 4 combo)
      render(
        <AdaptiveParticles
          type="combo"
          intensity={4}
        />
      );

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      // Should use combo budget (15) * intensity (4) = 60
      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.particleCount).toBe(60);
    });

    it('should default intensity to 1 when not provided', async () => {
      mockUseParticleBudget.mockReturnValue({
        tier: 'medium',
        max: 60,
        combo: 10,
        levelUp: 40,
        word: 6,
      });

      mockFireConfetti.mockResolvedValue(null);

      render(<AdaptiveParticles type="word" />);

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      // Should use word budget (6) * default intensity (1) = 6
      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.particleCount).toBe(6);
    });
  });

  describe('reduced motion', () => {
    it('should skip particles when budget is 0', async () => {
      mockUseParticleBudget.mockReturnValue({
        tier: 'low',
        max: 0,
        combo: 0,
        levelUp: 0,
        word: 0,
      });

      mockFireConfetti.mockResolvedValue(null);

      const onComplete = vi.fn();

      render(
        <AdaptiveParticles
          type="combo"
          onComplete={onComplete}
        />
      );

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });

      // Should NOT fire confetti when budget is 0
      expect(mockFireConfetti).not.toHaveBeenCalled();
    });
  });

  describe('particle types', () => {
    beforeEach(() => {
      mockUseParticleBudget.mockReturnValue({
        tier: 'high',
        max: 100,
        combo: 15,
        levelUp: 60,
        word: 10,
      });
      mockFireConfetti.mockResolvedValue(null);
    });

    it('should configure combo type correctly', async () => {
      render(<AdaptiveParticles type="combo" intensity={2} />);

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.particleCount).toBe(30); // 15 * 2
      expect(callArgs?.spread).toBeDefined();
    });

    it('should configure levelUp type correctly', async () => {
      render(<AdaptiveParticles type="levelUp" />);

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.particleCount).toBe(60);
    });

    it('should configure word type correctly', async () => {
      render(<AdaptiveParticles type="word" />);

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.particleCount).toBe(10);
    });

    it('should configure victory type correctly', async () => {
      render(<AdaptiveParticles type="victory" />);

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.particleCount).toBeDefined();
      // Victory uses levelUp budget
      expect(callArgs?.particleCount).toBeGreaterThan(0);
    });
  });

  describe('color customization', () => {
    it('should use custom colors when provided', async () => {
      mockUseParticleBudget.mockReturnValue({
        tier: 'high',
        max: 100,
        combo: 15,
        levelUp: 60,
        word: 10,
      });

      mockFireConfetti.mockResolvedValue(null);

      const customColors = ['#FF0000', '#00FF00', '#0000FF'];

      render(
        <AdaptiveParticles
          type="combo"
          colors={customColors}
        />
      );

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.colors).toEqual(customColors);
    });

    it('should use default colors when not provided', async () => {
      mockUseParticleBudget.mockReturnValue({
        tier: 'high',
        max: 100,
        combo: 15,
        levelUp: 60,
        word: 10,
      });

      mockFireConfetti.mockResolvedValue(null);

      render(<AdaptiveParticles type="word" />);

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.colors).toBeDefined();
    });
  });
});
