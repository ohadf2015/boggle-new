/**
 * DDA Analytics Logger
 *
 * Logs AI Director events and metrics for effectiveness tracking.
 * Extends existing /api/analytics/log-session endpoint.
 *
 * DDA-04: Analytics track difficulty effectiveness
 *
 * Key metrics tracked:
 * - Flow state changes
 * - Intensity adjustments applied
 * - Performance metrics (WPM, success rate, combo)
 * - Time spent in each flow state
 * - Adjustment trigger points
 */

import type { FlowState, PerformanceWindow, IntensityAdjustment } from '@/types/aiDirector';
import type { DifficultyTier } from '@/types/difficulty';

// ==============================================
// TYPES
// ==============================================

export type AdjustmentTrigger = 'combo_break' | 'power_up' | 'periodic' | 'session_end';

export interface DDAAnalyticsEvent {
  sessionId: string;
  timestamp: number;
  flowState: FlowState;
  wordsPerMinute: number;
  successRate: number;
  comboMaintenance: number;
  timeInFlow: number;
  intensityAdjustments: IntensityAdjustment;
  tier: DifficultyTier;
  world: number;
  level: number;
  isBossBattle: boolean;
  adjustmentTrigger?: AdjustmentTrigger;
}

export interface DDAAnalyticsPayload {
  action: 'update';
  sessionId: string;
  // Standard fields
  score?: number;
  wordsFound?: string[];
  completed?: boolean;
  // DDA-specific fields
  ddaFlowState: FlowState;
  ddaWordsPerMinute: number;
  ddaSuccessRate: number;
  ddaComboMaintenance: number;
  ddaTimeInFlow: number;
  ddaIntensityAdjustments: IntensityAdjustment;
  ddaTier: DifficultyTier;
  ddaIsBossBattle: boolean;
  ddaAdjustmentTrigger?: AdjustmentTrigger;
}

// ==============================================
// ANALYTICS FUNCTIONS
// ==============================================

/**
 * Create analytics payload from DDA event
 */
export function createDDAAnalyticsPayload(
  event: DDAAnalyticsEvent
): DDAAnalyticsPayload {
  return {
    action: 'update',
    sessionId: event.sessionId,
    ddaFlowState: event.flowState,
    ddaWordsPerMinute: event.wordsPerMinute,
    ddaSuccessRate: event.successRate,
    ddaComboMaintenance: event.comboMaintenance,
    ddaTimeInFlow: event.timeInFlow,
    ddaIntensityAdjustments: event.intensityAdjustments,
    ddaTier: event.tier,
    ddaIsBossBattle: event.isBossBattle,
    ddaAdjustmentTrigger: event.adjustmentTrigger,
  };
}

/**
 * Log DDA analytics event to backend
 *
 * @param event - DDA analytics event data
 * @returns Promise resolving to success status
 */
export async function logDDAEvent(event: DDAAnalyticsEvent): Promise<boolean> {
  try {
    const payload = createDDAAnalyticsPayload(event);

    const response = await fetch('/api/analytics/log-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('[DDA Analytics] Failed to log event:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    // Non-blocking - analytics failures shouldn't affect gameplay
    console.warn('[DDA Analytics] Error logging event:', error);
    return false;
  }
}

/**
 * Create a DDA event from current state
 * Helper function for components that need to log events
 */
export function createDDAEvent(params: {
  sessionId: string;
  metrics: PerformanceWindow;
  intensityAdjustments: IntensityAdjustment;
  tier: DifficultyTier;
  world: number;
  level: number;
  isBossBattle: boolean;
  adjustmentTrigger?: AdjustmentTrigger;
  flowState: FlowState;
}): DDAAnalyticsEvent {
  return {
    sessionId: params.sessionId,
    timestamp: Date.now(),
    flowState: params.flowState,
    wordsPerMinute: params.metrics.wordsPerMinute,
    successRate: params.metrics.successRate,
    comboMaintenance: params.metrics.comboMaintenance,
    timeInFlow: params.metrics.timeInFlow,
    intensityAdjustments: params.intensityAdjustments,
    tier: params.tier,
    world: params.world,
    level: params.level,
    isBossBattle: params.isBossBattle,
    adjustmentTrigger: params.adjustmentTrigger,
  };
}

// ==============================================
// ANALYTICS AGGREGATION (for effectiveness tracking)
// ==============================================

/**
 * Calculate DDA effectiveness metrics from session data
 * Used for A/B testing and tuning
 */
export interface DDAEffectivenessMetrics {
  /** Percentage of session time in flow state */
  flowTimePercentage: number;
  /** Number of adjustments made during session */
  adjustmentCount: number;
  /** Whether player completed the level */
  completed: boolean;
  /** Average flow score throughout session */
  averageFlowScore: number;
}

/**
 * Aggregate DDA events into effectiveness metrics
 * Called at session end for analysis
 */
export function aggregateDDAEffectiveness(
  events: DDAAnalyticsEvent[],
  sessionDurationSeconds: number,
  completed: boolean
): DDAEffectivenessMetrics {
  if (events.length === 0) {
    return {
      flowTimePercentage: 0,
      adjustmentCount: 0,
      completed,
      averageFlowScore: 0,
    };
  }

  // Calculate time in flow
  const lastEvent = events[events.length - 1];
  const flowTimePercentage = sessionDurationSeconds > 0
    ? (lastEvent.timeInFlow / sessionDurationSeconds) * 100
    : 0;

  // Count adjustments (events with trigger)
  const adjustmentCount = events.filter(e => e.adjustmentTrigger).length;

  // Calculate average "flow closeness" (how close to optimal)
  const flowScores: number[] = events.map(e => {
    // Simple scoring: 1 if in flow, 0.5 if learning, 0 if frustrated/bored
    if (e.flowState === 'flow') return 1;
    if (e.flowState === 'learning') return 0.5;
    return 0;
  });
  const averageFlowScore = flowScores.reduce((a, b) => a + b, 0) / flowScores.length;

  return {
    flowTimePercentage,
    adjustmentCount,
    completed,
    averageFlowScore,
  };
}
