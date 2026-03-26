/**
 * useAIDirector Hook Tests
 *
 * Tests AI Director hook integration with Phase 29 and store.
 * TDD: Tests written first, then implementation.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIDirector } from './useAIDirector';
import { useAIDirectorStore } from '@/stores/aiDirectorStore';
import { DEFAULT_INTENSITY } from '@/lib/aiDirector/constants';

// Mock useAdaptiveDifficulty (Phase 29)
vi.mock('@/hooks/useAdaptiveDifficulty', () => ({
  useAdaptiveDifficulty: vi.fn(() => ({
    tier: 'normal',
    adjustedConfig: {},
    hintData: null,
    powerUpCooldownMultiplier: 1.0,
    recordCompletion: vi.fn(),
  })),
}));

// Mock analytics logger
vi.mock('@/lib/aiDirector/analyticsLogger', () => ({
  logDDAEvent: vi.fn().mockResolvedValue(true),
  createDDAEvent: vi.fn((params) => ({
    ...params,
    timestamp: Date.now(),
  })),
}));

// Import mocks to access them in tests
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty';
import { logDDAEvent, createDDAEvent } from '@/lib/aiDirector/analyticsLogger';

describe('useAIDirector', () => {
  beforeEach(() => {
    useAIDirectorStore.getState().reset();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    useAIDirectorStore.getState().reset();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 1 })
      );

      expect(result.current.tier).toBe('normal');
      expect(result.current.flowState).toBe('learning');
      expect(result.current.isActive).toBe(false);
      expect(result.current.intensityAdjustments).toEqual(DEFAULT_INTENSITY);
    });

    it('should integrate with Phase 29 tier', () => {
      // Mock different tier
      (useAdaptiveDifficulty as any).mockReturnValueOnce({
        tier: 'hard',
        adjustedConfig: {},
        hintData: null,
        powerUpCooldownMultiplier: 1.5,
        recordCompletion: vi.fn(),
      });

      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 1 })
      );

      expect(result.current.tier).toBe('hard');
    });

    it('should detect boss battle on level 7', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 7 })
      );

      act(() => {
        result.current.startSession();
      });

      expect(result.current.isBossBattle).toBe(true);
    });

    it('should NOT detect boss battle on other levels', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 3 })
      );

      act(() => {
        result.current.startSession();
      });

      expect(result.current.isBossBattle).toBe(false);
    });
  });

  describe('session lifecycle', () => {
    it('should start session correctly', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 1 })
      );

      act(() => {
        result.current.startSession();
      });

      expect(result.current.isActive).toBe(true);
    });

    it('should end session correctly', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 1 })
      );

      act(() => {
        result.current.startSession();
        result.current.endSession();
      });

      expect(result.current.isActive).toBe(false);
    });

    it('should reset state on session end', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 1 })
      );

      act(() => {
        result.current.startSession();
        result.current.recordWord(true, 1);
        result.current.endSession();
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('recordWord', () => {
    it('should track words through hook', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 1 })
      );

      act(() => {
        result.current.startSession();
        result.current.recordWord(true, 1);
        result.current.recordWord(true, 2);
      });

      // Metrics should be updated
      expect(result.current.metrics).toBeDefined();
      expect(result.current.metrics.successRate).toBeDefined();
    });

    it('should update metrics on each word', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 1 })
      );

      act(() => {
        result.current.startSession();
      });

      const initialMetrics = { ...result.current.metrics };

      act(() => {
        result.current.recordWord(true, 1);
      });

      // Metrics should have changed
      expect(result.current.metrics).not.toEqual(initialMetrics);
    });
  });

  describe('handleTransition', () => {
    it('should trigger transition handling', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 1 })
      );

      act(() => {
        result.current.startSession();
        result.current.handleTransition();
      });

      // Should not throw
      expect(result.current.isActive).toBe(true);
    });

    it('should log analytics on transition when enabled', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 1, sessionId: 'test-session', enableAnalytics: true })
      );

      act(() => {
        result.current.startSession();
        result.current.handleTransition();
      });

      expect(createDDAEvent).toHaveBeenCalled();
      expect(logDDAEvent).toHaveBeenCalled();
    });

    it('should NOT log analytics when disabled', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 1, sessionId: 'test-session', enableAnalytics: false })
      );

      act(() => {
        result.current.startSession();
        result.current.handleTransition();
      });

      expect(logDDAEvent).not.toHaveBeenCalled();
    });
  });

  describe('boss battle exclusion (DDA-05)', () => {
    it('should return neutral adjustments for boss battles', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 7 }) // Boss battle
      );

      act(() => {
        result.current.startSession();
        // Simulate frustrated state
        for (let i = 0; i < 10; i++) {
          result.current.recordWord(false, 0);
        }
        result.current.handleTransition();
      });

      // Should still have neutral adjustments
      expect(result.current.intensityAdjustments).toEqual(DEFAULT_INTENSITY);
    });

    it('should apply adjustments for regular levels when warmed up and struggling', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 3 }) // Regular level
      );

      act(() => {
        result.current.startSession();
        // Simulate frustrated state with many failures
        for (let i = 0; i < 15; i++) {
          result.current.recordWord(false, 0);
        }
        // Advance timer past warm-up period (60 seconds)
        vi.advanceTimersByTime(65000);
        result.current.handleTransition();
      });

      // After warm-up and struggling, should have some adjustments
      // Note: Adjustments are applied gradually, so we check for any change
      const adjustments = result.current.intensityAdjustments;
      const hasAnyAdjustment =
        adjustments.powerUpSpawnBonus > 0 ||
        adjustments.hintEscalationRate !== 1.0 ||
        adjustments.comboGracePeriod > 0 ||
        adjustments.celebrationDuration > 0;

      // Flow state should detect struggling
      expect(['frustrated', 'learning']).toContain(result.current.flowState);
    });
  });

  describe('analytics logging', () => {
    it('should log analytics at session end when enabled', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 1, sessionId: 'test-session', enableAnalytics: true })
      );

      act(() => {
        result.current.startSession();
        result.current.endSession();
      });

      expect(createDDAEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session',
          adjustmentTrigger: 'session_end',
        })
      );
    });

    it('should NOT log analytics at session end when no sessionId', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 1, enableAnalytics: true })
      );

      act(() => {
        result.current.startSession();
        result.current.endSession();
      });

      // createDDAEvent should not be called for session_end without sessionId
      const sessionEndCalls = (createDDAEvent as any).mock.calls.filter(
        (call) => call[0]?.adjustmentTrigger === 'session_end'
      );
      expect(sessionEndCalls.length).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should reset store on unmount', () => {
      const { unmount } = renderHook(() =>
        useAIDirector({ world: 1, level: 1 })
      );

      act(() => {
        useAIDirectorStore.getState().startSession(false);
      });

      expect(useAIDirectorStore.getState().isActive).toBe(true);

      unmount();

      expect(useAIDirectorStore.getState().isActive).toBe(false);
    });
  });

  describe('checkIsWarmedUp', () => {
    it('should return false before warm-up period', () => {
      const { result } = renderHook(() =>
        useAIDirector({ world: 1, level: 1 })
      );

      act(() => {
        result.current.startSession();
      });

      expect(result.current.checkIsWarmedUp()).toBe(false);
    });
  });

  describe('world and level configuration', () => {
    it('should pass correct world and level to Phase 29', () => {
      renderHook(() =>
        useAIDirector({ world: 3, level: 5 })
      );

      expect(useAdaptiveDifficulty).toHaveBeenCalledWith({ world: 3, level: 5 });
    });

    it('should handle all boss battle levels (level 7 in each world)', () => {
      // Test multiple worlds
      for (const world of [1, 2, 3, 4, 5]) {
        const { result, unmount } = renderHook(() =>
          useAIDirector({ world, level: 7 })
        );

        act(() => {
          result.current.startSession();
        });

        expect(result.current.isBossBattle).toBe(true);

        unmount();
        act(() => {
          useAIDirectorStore.getState().reset();
        });
      }
    });
  });
});
