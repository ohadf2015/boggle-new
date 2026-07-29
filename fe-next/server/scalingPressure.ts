/**
 * Scaling pressure computation for the /health/scaling autoscaler signal.
 *
 * Pure + dependency-free so it can be unit-tested in isolation.
 */

export interface ScalingPressureInput {
  socketConnections: number;
  maxConnections: number;
  /** process.memoryUsage().heapUsed */
  heapUsedBytes: number;
  /**
   * The V8 heap *limit* — v8.getHeapStatistics().heap_size_limit, which reflects
   * --max-old-space-size. This is the true OOM ceiling.
   *
   * Do NOT pass heapTotal here. heapTotal is the currently-*committed* heap, which
   * V8 keeps just above heapUsed and grows lazily, so heapUsed/heapTotal sits at
   * 92–97% between GCs at ANY load — a false OOM signal that flipped readyForMore
   * to false even on a 100% idle replica (prod, 2026-07-29).
   */
  heapLimitBytes: number;
  eventLoopLagMs: number;
  supabaseQueueDepth: number;
}

export interface ScalingPressure {
  connectionUtilization: number;
  /** heapUsed / heapLimit — fraction of the real OOM ceiling in use. */
  heapUtilization: number;
  /** true when this replica has headroom across all dimensions. */
  readyForMore: boolean;
}

export function computeScalingPressure(input: ScalingPressureInput): ScalingPressure {
  const connectionUtilization =
    input.maxConnections > 0 ? input.socketConnections / input.maxConnections : 0;
  const heapUtilization =
    input.heapLimitBytes > 0 ? input.heapUsedBytes / input.heapLimitBytes : 0;

  const readyForMore =
    connectionUtilization < 0.75 &&
    heapUtilization < 0.85 &&
    input.eventLoopLagMs < 100 &&
    input.supabaseQueueDepth < 8;

  return { connectionUtilization, heapUtilization, readyForMore };
}
