/**
 * useEffectCap Tests
 *
 * Tests for the visual effect priority cap hook.
 * Ensures only the top N highest-priority effects are shown simultaneously.
 */

import { renderHook } from '@testing-library/react';
import { useEffectCap, type EffectEntry, MAX_SIMULTANEOUS_EFFECTS } from '../useEffectCap';

describe('useEffectCap', () => {
  // ==============================================
  // CONSTANTS
  // ==============================================

  it('should export MAX_SIMULTANEOUS_EFFECTS as 3', () => {
    expect(MAX_SIMULTANEOUS_EFFECTS).toBe(3);
  });

  // ==============================================
  // BASIC FILTERING
  // ==============================================

  describe('Basic filtering', () => {
    it('should return all effects when count <= cap', () => {
      const effects: EffectEntry[] = [
        { id: 'attackTelegraph', active: true, priority: 10 },
        { id: 'phaseBanner', active: true, priority: 8 },
      ];

      const { result } = renderHook(() => useEffectCap(effects));

      expect(result.current.attackTelegraph).toBe(true);
      expect(result.current.phaseBanner).toBe(true);
    });

    it('should exclude inactive effects from result', () => {
      const effects: EffectEntry[] = [
        { id: 'attackTelegraph', active: false, priority: 10 },
        { id: 'phaseBanner', active: true, priority: 8 },
      ];

      const { result } = renderHook(() => useEffectCap(effects));

      expect(result.current.attackTelegraph).toBe(false);
      expect(result.current.phaseBanner).toBe(true);
    });

    it('should return all false when no effects are active', () => {
      const effects: EffectEntry[] = [
        { id: 'attackTelegraph', active: false, priority: 10 },
        { id: 'phaseBanner', active: false, priority: 8 },
        { id: 'rageVignette', active: false, priority: 3 },
      ];

      const { result } = renderHook(() => useEffectCap(effects));

      expect(result.current.attackTelegraph).toBe(false);
      expect(result.current.phaseBanner).toBe(false);
      expect(result.current.rageVignette).toBe(false);
    });
  });

  // ==============================================
  // PRIORITY CAPPING
  // ==============================================

  describe('Priority capping', () => {
    it('should cap to top 3 when more than 3 are active', () => {
      const effects: EffectEntry[] = [
        { id: 'attackTelegraph', active: true, priority: 10 },
        { id: 'phaseBanner', active: true, priority: 8 },
        { id: 'attackFlashPortrait', active: true, priority: 7 },
        { id: 'rageVignette', active: true, priority: 3 },
        { id: 'enragedGlow', active: true, priority: 2 },
      ];

      const { result } = renderHook(() => useEffectCap(effects));

      // Top 3 by priority
      expect(result.current.attackTelegraph).toBe(true);
      expect(result.current.phaseBanner).toBe(true);
      expect(result.current.attackFlashPortrait).toBe(true);
      // Below cap
      expect(result.current.rageVignette).toBe(false);
      expect(result.current.enragedGlow).toBe(false);
    });

    it('should respect priority order (highest wins)', () => {
      const effects: EffectEntry[] = [
        { id: 'low', active: true, priority: 1 },
        { id: 'high', active: true, priority: 10 },
        { id: 'mid', active: true, priority: 5 },
        { id: 'veryLow', active: true, priority: 0 },
      ];

      const { result } = renderHook(() => useEffectCap(effects));

      expect(result.current.high).toBe(true);
      expect(result.current.mid).toBe(true);
      expect(result.current.low).toBe(true);
      expect(result.current.veryLow).toBe(false);
    });

    it('should handle exactly 3 active effects (no capping needed)', () => {
      const effects: EffectEntry[] = [
        { id: 'a', active: true, priority: 5 },
        { id: 'b', active: true, priority: 3 },
        { id: 'c', active: true, priority: 1 },
        { id: 'd', active: false, priority: 10 },
      ];

      const { result } = renderHook(() => useEffectCap(effects));

      expect(result.current.a).toBe(true);
      expect(result.current.b).toBe(true);
      expect(result.current.c).toBe(true);
      expect(result.current.d).toBe(false);
    });
  });

  // ==============================================
  // EDGE CASES
  // ==============================================

  describe('Edge cases', () => {
    it('should handle empty effects array', () => {
      const { result } = renderHook(() => useEffectCap([]));
      expect(Object.keys(result.current)).toHaveLength(0);
    });

    it('should handle single active effect', () => {
      const effects: EffectEntry[] = [
        { id: 'solo', active: true, priority: 5 },
      ];

      const { result } = renderHook(() => useEffectCap(effects));
      expect(result.current.solo).toBe(true);
    });

    it('should handle effects with equal priority (stable order)', () => {
      const effects: EffectEntry[] = [
        { id: 'first', active: true, priority: 5 },
        { id: 'second', active: true, priority: 5 },
        { id: 'third', active: true, priority: 5 },
        { id: 'fourth', active: true, priority: 5 },
      ];

      const { result } = renderHook(() => useEffectCap(effects));

      // With equal priority, first 3 in input order should win
      const activeCount = Object.values(result.current).filter(Boolean).length;
      expect(activeCount).toBe(3);
    });
  });

  // ==============================================
  // MEMOIZATION
  // ==============================================

  describe('Memoization', () => {
    it('should return same reference when inputs unchanged', () => {
      const effects: EffectEntry[] = [
        { id: 'a', active: true, priority: 5 },
        { id: 'b', active: false, priority: 3 },
      ];

      const { result, rerender } = renderHook(() => useEffectCap(effects));
      const firstResult = result.current;

      rerender();

      expect(result.current).toBe(firstResult);
    });
  });
});
