/**
 * Tests for useParticleBudget hook
 *
 * This hook maps device performance capabilities to appropriate particle budgets
 * for different game events (combos, level ups, word finds).
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useParticleBudget } from '../useParticleBudget';
import * as useDevicePerformanceModule from '../useDevicePerformance';

// Mock useDevicePerformance
vi.mock('../useDevicePerformance');

const mockUseDevicePerformance = useDevicePerformanceModule.useDevicePerformance as any;

describe('useParticleBudget', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('high-end devices', () => {
    it('should return high budget for high-end devices', () => {
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: false,
        reduceParticles: false,
        prefersReducedMotion: false,
        targetFPS: 60,
        throttleMs: 16,
        enableComplexAnimations: true,
        enableGlowEffects: true,
        maxParticles: 20,
        isSlowConnection: false,
        isMobile: false,
      });

      const { result } = renderHook(() => useParticleBudget());

      expect(result.current.tier).toBe('high');
      expect(result.current.max).toBe(100);
      expect(result.current.combo).toBe(15);
      expect(result.current.levelUp).toBe(60);
      expect(result.current.word).toBe(10);
    });
  });

  describe('medium-tier devices', () => {
    it('should return medium budget for mid-range devices with reduced particles', () => {
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: false,
        reduceParticles: true,
        prefersReducedMotion: false,
        targetFPS: 60,
        throttleMs: 16,
        enableComplexAnimations: true,
        enableGlowEffects: true,
        maxParticles: 8,
        isSlowConnection: false,
        isMobile: true,
      });

      const { result } = renderHook(() => useParticleBudget());

      expect(result.current.tier).toBe('medium');
      expect(result.current.max).toBe(60);
      expect(result.current.combo).toBe(10);
      expect(result.current.levelUp).toBe(40);
      expect(result.current.word).toBe(6);
    });
  });

  describe('low-end devices', () => {
    it('should return low budget for low-end devices', () => {
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: true,
        reduceParticles: true,
        prefersReducedMotion: false,
        targetFPS: 30,
        throttleMs: 33,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        maxParticles: 4,
        isSlowConnection: false,
        isMobile: true,
      });

      const { result } = renderHook(() => useParticleBudget());

      expect(result.current.tier).toBe('low');
      expect(result.current.max).toBe(30);
      expect(result.current.combo).toBe(5);
      expect(result.current.levelUp).toBe(20);
      expect(result.current.word).toBe(3);
    });
  });

  describe('reduced motion preference', () => {
    it('should return zero particles for reduced motion preference', () => {
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: false,
        reduceParticles: false,
        prefersReducedMotion: true,
        targetFPS: 60,
        throttleMs: 16,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        maxParticles: 0,
        isSlowConnection: false,
        isMobile: false,
      });

      const { result } = renderHook(() => useParticleBudget());

      expect(result.current.tier).toBe('low');
      expect(result.current.max).toBe(0);
      expect(result.current.combo).toBe(0);
      expect(result.current.levelUp).toBe(0);
      expect(result.current.word).toBe(0);
    });
  });

  describe('tier priority', () => {
    it('should prioritize reduced motion over device capabilities', () => {
      // High-end device but reduced motion enabled
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: false,
        reduceParticles: false,
        prefersReducedMotion: true,
        targetFPS: 60,
        throttleMs: 16,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        maxParticles: 0,
        isSlowConnection: false,
        isMobile: false,
      });

      const { result } = renderHook(() => useParticleBudget());

      // Should return zero particles regardless of high-end device
      expect(result.current.tier).toBe('low');
      expect(result.current.max).toBe(0);
    });

    it('should prioritize low-end detection over reduce particles flag', () => {
      // Low-end device with reduceParticles false (shouldn't happen, but defensive)
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: true,
        reduceParticles: false,
        prefersReducedMotion: false,
        targetFPS: 30,
        throttleMs: 33,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        maxParticles: 4,
        isSlowConnection: false,
        isMobile: true,
      });

      const { result } = renderHook(() => useParticleBudget());

      expect(result.current.tier).toBe('low');
      expect(result.current.max).toBe(30);
    });
  });

  describe('budget consistency', () => {
    it('should maintain consistent ratios across tiers', () => {
      // Test low tier
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: true,
        reduceParticles: true,
        prefersReducedMotion: false,
        targetFPS: 30,
        throttleMs: 33,
        enableComplexAnimations: false,
        enableGlowEffects: false,
        maxParticles: 4,
        isSlowConnection: false,
        isMobile: true,
      });

      const { result: lowResult } = renderHook(() => useParticleBudget());

      // Test high tier
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: false,
        reduceParticles: false,
        prefersReducedMotion: false,
        targetFPS: 60,
        throttleMs: 16,
        enableComplexAnimations: true,
        enableGlowEffects: true,
        maxParticles: 20,
        isSlowConnection: false,
        isMobile: false,
      });

      const { result: highResult } = renderHook(() => useParticleBudget());

      // Verify combo particles are proportional to max budget
      const lowComboRatio = lowResult.current.combo / lowResult.current.max;
      const highComboRatio = highResult.current.combo / highResult.current.max;

      expect(lowComboRatio).toBeCloseTo(highComboRatio, 1);
    });
  });
});
