/**
 * AI Director Store
 *
 * Zustand store for high-frequency AI Director state.
 * Uses Zustand instead of Context to prevent re-render cascade.
 *
 * DDA-05: System excludes boss fights from adaptive scaling
 *
 * Why Zustand:
 * - InGameContext has 57 properties, adding high-frequency metrics causes re-render cascade
 * - Zustand enables selective subscriptions (only affected components re-render)
 * - State updates at every word without performance impact
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { FlowState, PerformanceWindow, IntensityAdjustment } from '@/types/aiDirector';
import {
  createPerformanceMonitor,
  detectFlowState,
  createIntensityController,
  DEFAULT_INTENSITY,
  FLOW_THRESHOLDS,
} from '@/lib/aiDirector';

// ==============================================
// STORE STATE
// ==============================================

interface AIDirectorState {
  // Current metrics
  metrics: PerformanceWindow;

  // Flow state
  flowState: FlowState;
  timeInFlow: number;

  // Intensity adjustments
  intensityAdjustments: IntensityAdjustment;

  // Session tracking
  isActive: boolean;
  isBossBattle: boolean;
  sessionStartTime: number | null;
  wordCount: number;
}

interface AIDirectorActions {
  // Session lifecycle
  startSession: (isBossBattle: boolean) => void;
  endSession: () => void;

  // Metric updates
  recordWord: (valid: boolean, comboLevel: number) => void;

  // Transition handling
  handleTransition: () => void;

  // State access
  getMetrics: () => PerformanceWindow;
  getAdjustments: () => IntensityAdjustment;
  isWarmedUp: () => boolean;

  // Reset
  reset: () => void;
}

type AIDirectorStore = AIDirectorState & AIDirectorActions;

// ==============================================
// INTERNAL STATE (not exposed in store)
// ==============================================

let performanceMonitor = createPerformanceMonitor();
let intensityController = createIntensityController();
let flowCheckInterval: ReturnType<typeof setInterval> | null = null;

// ==============================================
// STORE IMPLEMENTATION
// ==============================================

export const useAIDirectorStore = create<AIDirectorStore>((set, get) => ({
  // Initial state
  metrics: {
    wordsPerMinute: 0,
    successRate: 1.0,
    comboMaintenance: 0,
    timeInFlow: 0,
  },
  flowState: 'learning',
  timeInFlow: 0,
  intensityAdjustments: { ...DEFAULT_INTENSITY },
  isActive: false,
  isBossBattle: false,
  sessionStartTime: null,
  wordCount: 0,

  // Actions
  startSession: (isBossBattle: boolean) => {
    // Reset internal trackers
    performanceMonitor = createPerformanceMonitor();
    intensityController = createIntensityController();

    set({
      isActive: true,
      isBossBattle,
      sessionStartTime: Date.now(),
      wordCount: 0,
      metrics: {
        wordsPerMinute: 0,
        successRate: 1.0,
        comboMaintenance: 0,
        timeInFlow: 0,
      },
      flowState: 'learning',
      timeInFlow: 0,
      intensityAdjustments: { ...DEFAULT_INTENSITY },
    });

    // Start periodic flow state checks (every 5 seconds)
    if (flowCheckInterval) {
      clearInterval(flowCheckInterval);
    }

    flowCheckInterval = setInterval(() => {
      const state = get();
      if (!state.isActive) return;

      const metrics = performanceMonitor.getMetrics();
      const newFlowState = detectFlowState(metrics, FLOW_THRESHOLDS);

      // Track time in flow
      let newTimeInFlow = state.timeInFlow;
      if (newFlowState === 'flow') {
        newTimeInFlow += 5; // 5 seconds per check interval
      }

      set({
        metrics,
        flowState: newFlowState,
        timeInFlow: newTimeInFlow,
      });

      // Update intensity controller with new flow state
      intensityController.updateFlowState(newFlowState);
    }, 5000);
  },

  endSession: () => {
    if (flowCheckInterval) {
      clearInterval(flowCheckInterval);
      flowCheckInterval = null;
    }

    set({ isActive: false });
  },

  recordWord: (valid: boolean, comboLevel: number) => {
    const state = get();
    if (!state.isActive) return;

    // DDA-05: Exclude boss battles from metric tracking that affects adjustments
    // We still track metrics for analytics, but don't use them for adjustments
    performanceMonitor.recordWord(valid, comboLevel);

    const metrics = performanceMonitor.getMetrics();
    const newFlowState = detectFlowState(metrics, FLOW_THRESHOLDS);

    set({
      metrics,
      flowState: newFlowState,
      wordCount: state.wordCount + 1,
    });

    // Update intensity controller (won't affect boss battles due to isBossBattle check in getAdjustments)
    intensityController.updateFlowState(newFlowState);
  },

  handleTransition: () => {
    const state = get();
    if (!state.isActive) return;

    // DDA-05: Boss battles always use neutral adjustments
    if (state.isBossBattle) return;

    // Apply adjustments at transition point
    intensityController.applyAtTransition();

    set({
      intensityAdjustments: intensityController.getCurrentAdjustments(),
    });
  },

  getMetrics: () => {
    return get().metrics;
  },

  getAdjustments: () => {
    const state = get();

    // DDA-05: Boss battles always return neutral adjustments
    if (state.isBossBattle) {
      return { ...DEFAULT_INTENSITY };
    }

    return state.intensityAdjustments;
  },

  isWarmedUp: () => {
    return performanceMonitor.isWarmedUp();
  },

  reset: () => {
    if (flowCheckInterval) {
      clearInterval(flowCheckInterval);
      flowCheckInterval = null;
    }

    performanceMonitor = createPerformanceMonitor();
    intensityController = createIntensityController();

    set({
      metrics: {
        wordsPerMinute: 0,
        successRate: 1.0,
        comboMaintenance: 0,
        timeInFlow: 0,
      },
      flowState: 'learning',
      timeInFlow: 0,
      intensityAdjustments: { ...DEFAULT_INTENSITY },
      isActive: false,
      isBossBattle: false,
      sessionStartTime: null,
      wordCount: 0,
    });
  },
}));

// ==============================================
// SELECTOR HOOKS (for selective subscriptions)
// ==============================================

/**
 * Get only the flow state (lightweight subscription)
 */
export function useFlowState(): FlowState {
  return useAIDirectorStore((state) => state.flowState);
}

/**
 * Get only the intensity adjustments
 * Uses useShallow for stable reference when values are equal
 */
export function useIntensityAdjustments(): IntensityAdjustment {
  return useAIDirectorStore(
    useShallow((state) =>
      state.isBossBattle
        ? DEFAULT_INTENSITY
        : state.intensityAdjustments
    )
  );
}

/**
 * Get only the current metrics
 */
export function usePerformanceMetrics(): PerformanceWindow {
  return useAIDirectorStore((state) => state.metrics);
}

/**
 * Check if AI Director is active
 */
export function useAIDirectorActive(): boolean {
  return useAIDirectorStore((state) => state.isActive);
}
