import { describe, it, expect } from 'vitest';
import { computeScalingPressure } from '../scalingPressure';

const MB = 1024 * 1024;
const CAP = 2048 * MB; // --max-old-space-size=2048 (Dockerfile prod)

// Baseline healthy inputs: idle server, nothing under pressure.
const healthy = {
  socketConnections: 0,
  maxConnections: 500,
  heapUsedBytes: 600 * MB,
  heapLimitBytes: CAP,
  eventLoopLagMs: 1,
  supabaseQueueDepth: 0,
};

describe('computeScalingPressure', () => {
  it('reports readyForMore=true when heap is a small fraction of the cap', () => {
    const p = computeScalingPressure(healthy);
    expect(p.readyForMore).toBe(true);
    // 600MB of a 2048MB cap ≈ 29%
    expect(p.heapUtilization).toBeCloseTo(600 / 2048, 2);
  });

  it('does NOT flag OOM when heapUsed is near heapTotal but far below the cap (the real prod bug)', () => {
    // Real prod sawtooth peak: heapUsed 767MB, heapTotal 795MB → 96% of heapTotal
    // but only 37% of the 2048MB cap. Old code used heapUsed/heapTotal and wrongly
    // returned readyForMore=false at ZERO load.
    const p = computeScalingPressure({ ...healthy, heapUsedBytes: 767 * MB });
    expect(p.readyForMore).toBe(true);
    expect(p.heapUtilization).toBeLessThan(0.85);
  });

  it('flags readyForMore=false when heapUsed genuinely approaches the cap', () => {
    const p = computeScalingPressure({ ...healthy, heapUsedBytes: 1800 * MB }); // 88% of cap
    expect(p.readyForMore).toBe(false);
    expect(p.heapUtilization).toBeGreaterThan(0.85);
  });

  it('flags readyForMore=false on connection saturation', () => {
    const p = computeScalingPressure({ ...healthy, socketConnections: 400 }); // 80% of 500
    expect(p.readyForMore).toBe(false);
  });

  it('flags readyForMore=false on event-loop lag and supabase queue depth', () => {
    expect(computeScalingPressure({ ...healthy, eventLoopLagMs: 150 }).readyForMore).toBe(false);
    expect(computeScalingPressure({ ...healthy, supabaseQueueDepth: 10 }).readyForMore).toBe(false);
  });

  it('is division-by-zero safe when limits are 0', () => {
    const p = computeScalingPressure({ ...healthy, maxConnections: 0, heapLimitBytes: 0 });
    expect(p.connectionUtilization).toBe(0);
    expect(p.heapUtilization).toBe(0);
    expect(p.readyForMore).toBe(true);
  });
});
