/**
 * Word Tower — impact punch (TDD). Perfect drops / clutch saves land with a
 * micro zoom-punch + golden flash. Hitstop FEEL without rescaling time — the
 * scene's sway is phase-locked to the absolute clock, so real time dilation
 * would desync the crane and the tower.
 */
import { describe, it, expect } from 'vitest';
import { punchScaleAt, PUNCH_MS } from '../impactPunch';

describe('punchScaleAt', () => {
  it('is 1 at both ends of the window', () => {
    expect(punchScaleAt(0, 1)).toBeCloseTo(1, 5);
    expect(punchScaleAt(PUNCH_MS, 1)).toBeCloseTo(1, 5);
  });

  it('peaks above 1 early, bounded by 1.05', () => {
    const peak = punchScaleAt(PUNCH_MS * 0.2, 1);
    expect(peak).toBeGreaterThan(1.01);
    expect(peak).toBeLessThanOrEqual(1.05);
  });

  it('zero intensity = flat 1', () => {
    expect(punchScaleAt(PUNCH_MS * 0.2, 0)).toBe(1);
  });

  it('outside the window = 1 (safe to call every frame)', () => {
    expect(punchScaleAt(-50, 1)).toBeCloseTo(1, 5);
    expect(punchScaleAt(PUNCH_MS * 3, 1)).toBeCloseTo(1, 5);
  });
});
