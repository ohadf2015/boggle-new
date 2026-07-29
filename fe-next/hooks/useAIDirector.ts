/**
 * useAIDirector Hook
 *
 * Unified interface for AI Director integration.
 * Combines Phase 29 pre-game tier with mid-game pacing adjustments.
 *
 * Features:
 * - Integrates with useAdaptiveDifficulty (Phase 29) for pre-game tier
 * - Provides mid-game intensity adjustments from AI Director store
 * - Handles analytics logging at session boundaries
 * - Respects boss battle exclusion (DDA-05)
 */

import { useEffect, useCallback, useRef, useMemo } from 'react';
import {
  useAIDirectorStore,
  useIntensityAdjustments,
  useFlowState,
} from '@/stores/aiDirectorStore';
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty';
import { logDDAEvent, createDDAEvent } from '@/lib/aiDirector/analyticsLogger';
import type { IntensityAdjustment, FlowState, PerformanceWindow } from '@/types/aiDirector';
import type { DifficultyTier } from '@/types/difficulty';

// ==============================================
// TYPES
// ==============================================

export interface UseAIDirectorOptions {
  /** World number (1-10) */
  world: number;
  /** Level number within world (1-7) */
  level: number;
  /** Session ID for analytics */
  sessionId?: string;
  /** Enable analytics logging (default: true) */
  enableAnalytics?: boolean;
}

export interface UseAIDirectorReturn {
  // Pre-game tier (from Phase 29)
  tier: DifficultyTier;

  // Mid-game flow state
  flowState: FlowState;

  // Combined adjustments (Phase 29 config + mid-game pacing)
  intensityAdjustments: IntensityAdjustment;

  // Performance metrics
  metrics: PerformanceWindow;

  // Session lifecycle
  startSession: () => void;
  endSession: () => void;

  // Metric tracking
  recordWord: (valid: boolean, comboLevel: number) => void;

  // Transition handling (call at combo breaks, power-up uses)
  handleTransition: () => void;

  // State checks
  isActive: boolean;
  isBossBattle: boolean;
  /** Call to check if warm-up period is complete (returns current value) */
  checkIsWarmedUp: () => boolean;
}

// ==============================================
// HOOK
// ==============================================

/**
 * Hook for AI Director integration
 *
 * Provides unified interface combining:
 * - Phase 29 pre-game tier assignment
 * - Mid-game flow state detection
 * - Invisible pacing adjustments
 * - Analytics logging
 *
 * @param options - World, level, and configuration
 * @returns AI Director state and functions
 *
 * @example
 * const {
 *   tier,
 *   flowState,
 *   intensityAdjustments,
 *   recordWord,
 *   handleTransition,
 * } = useAIDirector({ world: 1, level: 3, sessionId: 'session-123' });
 */
export function useAIDirector(options: UseAIDirectorOptions): UseAIDirectorReturn {
  const { world, level, sessionId = '', enableAnalytics = true } = options;

  // Determine if boss battle (level 7 in each world)
  const isBossBattle = level === 7;

  // Get pre-game tier from Phase 29
  const { tier } = useAdaptiveDifficulty({ world, level });

  // Get AI Director store state and actions
  const storeStartSession = useAIDirectorStore((state) => state.startSession);
  const storeEndSession = useAIDirectorStore((state) => state.endSession);
  const storeRecordWord = useAIDirectorStore((state) => state.recordWord);
  const storeHandleTransition = useAIDirectorStore((state) => state.handleTransition);
  const storeReset = useAIDirectorStore((state) => state.reset);
  const metrics = useAIDirectorStore((state) => state.metrics);
  const isActive = useAIDirectorStore((state) => state.isActive);
  const storeIsBossBattle = useAIDirectorStore((state) => state.isBossBattle);

  // Use selector hooks for optimized subscriptions
  const flowState = useFlowState();
  const intensityAdjustments = useIntensityAdjustments();

  // Track session for analytics
  const sessionStartRef = useRef<number | null>(null);
  const lastAnalyticsRef = useRef<number>(0);

  // Periodic analytics logging (every 30 seconds)
  useEffect(() => {
    if (!isActive || !enableAnalytics || !sessionId) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastAnalyticsRef.current >= 30000) {
        lastAnalyticsRef.current = now;

        const event = createDDAEvent({
          sessionId,
          metrics,
          intensityAdjustments,
          tier,
          world,
          level,
          isBossBattle,
          flowState,
          adjustmentTrigger: 'periodic',
        });

        logDDAEvent(event);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isActive, enableAnalytics, sessionId, metrics, intensityAdjustments, tier, world, level, isBossBattle, flowState]);

  // Start session
  const startSession = useCallback(() => {
    storeStartSession(isBossBattle);
    sessionStartRef.current = Date.now();
    lastAnalyticsRef.current = Date.now();
  }, [storeStartSession, isBossBattle]);

  // End session with analytics
  const endSession = useCallback(() => {
    if (enableAnalytics && sessionId && sessionStartRef.current) {
      const event = createDDAEvent({
        sessionId,
        metrics,
        intensityAdjustments,
        tier,
        world,
        level,
        isBossBattle,
        flowState,
        adjustmentTrigger: 'session_end',
      });

      logDDAEvent(event);
    }

    storeEndSession();
    sessionStartRef.current = null;
  }, [storeEndSession, enableAnalytics, sessionId, metrics, intensityAdjustments, tier, world, level, isBossBattle, flowState]);

  // Record word with metrics update
  const recordWord = useCallback((valid: boolean, comboLevel: number) => {
    storeRecordWord(valid, comboLevel);
  }, [storeRecordWord]);

  // Handle transition with analytics
  const handleTransition = useCallback(() => {
    storeHandleTransition();

    // Log analytics at transition points
    if (enableAnalytics && sessionId) {
      const event = createDDAEvent({
        sessionId,
        metrics,
        intensityAdjustments,
        tier,
        world,
        level,
        isBossBattle,
        flowState,
        adjustmentTrigger: 'combo_break', // Most common transition type
      });

      logDDAEvent(event);
      lastAnalyticsRef.current = Date.now();
    }
  }, [storeHandleTransition, enableAnalytics, sessionId, metrics, intensityAdjustments, tier, world, level, isBossBattle, flowState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      storeReset();
    };
  }, [storeReset]);

  // Get the isWarmedUp function from store (returns a function reference, stable)
  const storeIsWarmedUp = useAIDirectorStore((state) => state.isWarmedUp);

  // Wrap in useCallback to provide stable reference
  const checkIsWarmedUp = useCallback(() => {
    return storeIsWarmedUp();
  }, [storeIsWarmedUp]);

  return useMemo(() => ({
    tier,
    flowState,
    intensityAdjustments,
    metrics,
    startSession,
    endSession,
    recordWord,
    handleTransition,
    isActive,
    isBossBattle: storeIsBossBattle,
    checkIsWarmedUp,
  }), [tier, flowState, intensityAdjustments, metrics, startSession, endSession,
    recordWord, handleTransition, isActive, storeIsBossBattle, checkIsWarmedUp]);
}
