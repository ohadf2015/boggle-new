import { vi } from 'vitest';
/**
 * AI Director Store Tests
 *
 * Tests Zustand store integration and boss battle exclusion.
 * DDA-05: Boss battles excluded from adaptive difficulty adjustments.
 */
import { act } from '@testing-library/react';
import { useAIDirectorStore } from './aiDirectorStore';
import { DEFAULT_INTENSITY } from '@/lib/aiDirector/constants';

describe('useAIDirectorStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAIDirectorStore.getState().reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    useAIDirectorStore.getState().reset();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = useAIDirectorStore.getState();

      expect(state.isActive).toBe(false);
      expect(state.isBossBattle).toBe(false);
      expect(state.flowState).toBe('learning');
      expect(state.intensityAdjustments).toEqual(DEFAULT_INTENSITY);
    });

    it('should initialize with zero metrics', () => {
      const state = useAIDirectorStore.getState();

      expect(state.metrics.wordsPerMinute).toBe(0);
      expect(state.metrics.successRate).toBe(1.0);
      expect(state.metrics.comboMaintenance).toBe(0);
      expect(state.wordCount).toBe(0);
    });
  });

  describe('startSession', () => {
    it('should activate the AI Director', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(false);
      });

      const state = useAIDirectorStore.getState();
      expect(state.isActive).toBe(true);
      expect(state.isBossBattle).toBe(false);
      expect(state.sessionStartTime).not.toBeNull();
    });

    it('should set isBossBattle flag correctly for boss battles', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(true);
      });

      expect(useAIDirectorStore.getState().isBossBattle).toBe(true);
    });

    it('should reset metrics on session start', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(false);
        useAIDirectorStore.getState().recordWord(true, 2);
        useAIDirectorStore.getState().startSession(false); // New session
      });

      const state = useAIDirectorStore.getState();
      expect(state.wordCount).toBe(0);
      expect(state.flowState).toBe('learning');
    });
  });

  describe('recordWord', () => {
    it('should update word count', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(false);
        useAIDirectorStore.getState().recordWord(true, 1);
      });

      expect(useAIDirectorStore.getState().wordCount).toBe(1);
    });

    it('should update metrics after recording words', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(false);
        useAIDirectorStore.getState().recordWord(true, 1);
        useAIDirectorStore.getState().recordWord(true, 2);
        useAIDirectorStore.getState().recordWord(false, 0);
      });

      const metrics = useAIDirectorStore.getState().metrics;
      expect(metrics.successRate).toBeLessThan(1.0); // 2/3 valid
    });

    it('should NOT update when session is inactive', () => {
      act(() => {
        useAIDirectorStore.getState().recordWord(true, 1);
      });

      expect(useAIDirectorStore.getState().wordCount).toBe(0);
    });

    it('should track combo levels in metrics', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(false);
        useAIDirectorStore.getState().recordWord(true, 3);
        useAIDirectorStore.getState().recordWord(true, 4);
        useAIDirectorStore.getState().recordWord(true, 5);
      });

      const metrics = useAIDirectorStore.getState().metrics;
      expect(metrics.comboMaintenance).toBeGreaterThan(0);
    });
  });

  describe('getAdjustments (DDA-05: Boss exclusion)', () => {
    it('should return neutral adjustments for boss battles', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(true); // Boss battle
        // Simulate frustrated state by recording failures
        for (let i = 0; i < 10; i++) {
          useAIDirectorStore.getState().recordWord(false, 0);
        }
        useAIDirectorStore.getState().handleTransition();
      });

      const adjustments = useAIDirectorStore.getState().getAdjustments();
      expect(adjustments).toEqual(DEFAULT_INTENSITY);
    });

    it('should return adjusted values for regular levels after frustrated state', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(false); // NOT boss battle
        // Simulate frustrated state
        for (let i = 0; i < 10; i++) {
          useAIDirectorStore.getState().recordWord(false, 0);
        }
        useAIDirectorStore.getState().handleTransition();
      });

      const adjustments = useAIDirectorStore.getState().getAdjustments();
      // Should have increased assistance for frustrated player
      expect(adjustments.hintEscalationRate).toBeGreaterThanOrEqual(DEFAULT_INTENSITY.hintEscalationRate);
    });

    it('should always return DEFAULT_INTENSITY for boss battles regardless of state', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(true); // Boss battle
        // Try to trigger adjustments
        for (let i = 0; i < 20; i++) {
          useAIDirectorStore.getState().recordWord(false, 0);
          useAIDirectorStore.getState().handleTransition();
        }
      });

      const adjustments = useAIDirectorStore.getState().getAdjustments();
      expect(adjustments).toEqual(DEFAULT_INTENSITY);
    });
  });

  describe('handleTransition', () => {
    it('should NOT apply adjustments for boss battles', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(true);
        useAIDirectorStore.getState().handleTransition();
      });

      const state = useAIDirectorStore.getState();
      expect(state.intensityAdjustments).toEqual(DEFAULT_INTENSITY);
    });

    it('should apply adjustments at transitions for regular levels', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(false);
        // Simulate many failures to trigger frustrated state
        for (let i = 0; i < 10; i++) {
          useAIDirectorStore.getState().recordWord(false, 0);
        }
        useAIDirectorStore.getState().handleTransition();
      });

      const state = useAIDirectorStore.getState();
      // After frustrated transition, adjustments should increase
      expect(state.intensityAdjustments.powerUpSpawnBonus).toBeGreaterThan(0);
    });

    it('should NOT apply when session is inactive', () => {
      act(() => {
        useAIDirectorStore.getState().handleTransition();
      });

      const state = useAIDirectorStore.getState();
      expect(state.intensityAdjustments).toEqual(DEFAULT_INTENSITY);
    });
  });

  describe('endSession', () => {
    it('should deactivate the AI Director', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(false);
        useAIDirectorStore.getState().endSession();
      });

      expect(useAIDirectorStore.getState().isActive).toBe(false);
    });

    it('should preserve metrics after ending session', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(false);
        useAIDirectorStore.getState().recordWord(true, 3);
        useAIDirectorStore.getState().endSession();
      });

      const state = useAIDirectorStore.getState();
      expect(state.wordCount).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(false);
        useAIDirectorStore.getState().recordWord(true, 3);
        useAIDirectorStore.getState().reset();
      });

      const state = useAIDirectorStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.wordCount).toBe(0);
      expect(state.flowState).toBe('learning');
      expect(state.isBossBattle).toBe(false);
      expect(state.sessionStartTime).toBeNull();
    });

    it('should reset intensity adjustments to defaults', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(false);
        for (let i = 0; i < 10; i++) {
          useAIDirectorStore.getState().recordWord(false, 0);
        }
        useAIDirectorStore.getState().handleTransition();
        useAIDirectorStore.getState().reset();
      });

      const state = useAIDirectorStore.getState();
      expect(state.intensityAdjustments).toEqual(DEFAULT_INTENSITY);
    });
  });

  describe('isWarmedUp', () => {
    it('should return false initially', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(false);
      });

      expect(useAIDirectorStore.getState().isWarmedUp()).toBe(false);
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(false);
        useAIDirectorStore.getState().recordWord(true, 2);
      });

      const metrics = useAIDirectorStore.getState().getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.successRate).toBe(1.0); // All valid so far
    });
  });

  describe('selective subscriptions', () => {
    it('should provide flow state directly', () => {
      act(() => {
        useAIDirectorStore.getState().startSession(false);
      });

      const flowState = useAIDirectorStore.getState().flowState;
      expect(flowState).toBe('learning');
    });

    it('should provide metrics directly', () => {
      const metrics = useAIDirectorStore.getState().metrics;
      expect(metrics).toHaveProperty('wordsPerMinute');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('comboMaintenance');
    });
  });
});
