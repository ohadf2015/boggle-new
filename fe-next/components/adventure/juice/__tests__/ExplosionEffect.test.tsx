/**
 * Tests for ExplosionEffect component
 *
 * This component renders explosion particles at cleared tile positions.
 * It uses the existing particle budget system to adapt to device performance.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ExplosionEffect } from '../ExplosionEffect';
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

describe('ExplosionEffect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should render at specified position', async () => {
      mockUseParticleBudget.mockReturnValue({
        tier: 'high',
        max: 100,
        combo: 15,
        levelUp: 60,
        word: 10,
      });

      mockFireConfetti.mockResolvedValue(null);

      const { container } = render(
        <ExplosionEffect
          position={{ x: 100, y: 200 }}
          intensity={1}
        />
      );

      // Component should render
      expect(container.firstChild).toBeTruthy();
    });

    it('should use particle budget from useParticleBudget', async () => {
      mockUseParticleBudget.mockReturnValue({
        tier: 'medium',
        max: 60,
        combo: 10,
        levelUp: 40,
        word: 6,
      });

      mockFireConfetti.mockResolvedValue(null);

      render(
        <ExplosionEffect
          position={{ x: 100, y: 200 }}
          intensity={1}
        />
      );

      await waitFor(() => {
        expect(mockUseParticleBudget).toHaveBeenCalled();
      });
    });

    it('should call onComplete after animation', async () => {
      mockUseParticleBudget.mockReturnValue({
        tier: 'high',
        max: 100,
        combo: 15,
        levelUp: 60,
        word: 10,
      });

      mockFireConfetti.mockResolvedValue(null);

      const onComplete = vi.fn();

      render(
        <ExplosionEffect
          position={{ x: 100, y: 200 }}
          intensity={1}
          onComplete={onComplete}
        />
      );

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      }, { timeout: 1000 });
    });
  });

  describe('intensity scaling', () => {
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

    it('should trigger 4 particles for intensity 1', async () => {
      render(
        <ExplosionEffect
          position={{ x: 100, y: 200 }}
          intensity={1}
        />
      );

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.particleCount).toBe(4);
    });

    it('should trigger 8 particles for intensity 2', async () => {
      render(
        <ExplosionEffect
          position={{ x: 100, y: 200 }}
          intensity={2}
        />
      );

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.particleCount).toBe(8);
    });

    it('should trigger 12 particles for intensity 3', async () => {
      render(
        <ExplosionEffect
          position={{ x: 100, y: 200 }}
          intensity={3}
        />
      );

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.particleCount).toBe(12);
    });

    it('should trigger 16 particles for intensity 4', async () => {
      render(
        <ExplosionEffect
          position={{ x: 100, y: 200 }}
          intensity={4}
        />
      );

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.particleCount).toBe(16);
    });

    it('should scale velocity with intensity', async () => {
      render(
        <ExplosionEffect
          position={{ x: 100, y: 200 }}
          intensity={4}
        />
      );

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.startVelocity).toBeGreaterThan(30);
    });
  });

  describe('reduced motion', () => {
    it('should skip particles when reduced motion enabled', async () => {
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
        <ExplosionEffect
          position={{ x: 100, y: 200 }}
          intensity={1}
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

  describe('color customization', () => {
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

    it('should use custom color when provided', async () => {
      render(
        <ExplosionEffect
          position={{ x: 100, y: 200 }}
          intensity={1}
          color="#FF0000"
        />
      );

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      const callArgs = mockFireConfetti.mock.calls[0][0];
      expect(callArgs?.colors).toContain('#FF0000');
    });

    it('should fall back to neo-orange color by default', async () => {
      render(
        <ExplosionEffect
          position={{ x: 100, y: 200 }}
          intensity={1}
        />
      );

      await waitFor(() => {
        expect(mockFireConfetti).toHaveBeenCalled();
      });

      const callArgs = mockFireConfetti.mock.calls[0][0];
      // neo-orange is #FF6B35
      expect(callArgs?.colors).toContain('#FF6B35');
    });
  });
});
