import { describe, it, expect } from 'vitest';
import { focusShift } from '../academyIslands';

const safe = { x0: 10, x1: 90, y0: 20, y1: 80 };
const flat = { scale: 1, originX: 50, originY: 50 };
const zoomed = { scale: 1.3, originX: 50, originY: 50 };

describe('focusShift — the camera leans toward the recommended island', () => {
  it('given no focus, when framing, then the camera does not move', () => {
    expect(focusShift([{ x: 30, y: 40 }], flat, null, safe)).toEqual({ dx: 0, dy: 0 });
  });

  it('given a focus off-centre, when framing, then it pulls the focus toward the centre', () => {
    const pts = [{ x: 40, y: 45 }, { x: 60, y: 55 }];
    const { dx, dy } = focusShift(pts, zoomed, { x: 40, y: 45 }, safe);
    expect(dx).toBeGreaterThan(0);
    expect(dy).toBeGreaterThan(0);
    // subtle: never all the way to centre
    expect(40 + dx).toBeLessThan(50);
  });

  it('given the pull would push another island out of the safe area, then it is clamped', () => {
    const pts = [{ x: 15, y: 50 }, { x: 88, y: 50 }];
    const { dx } = focusShift(pts, zoomed, { x: 15, y: 50 }, safe);
    // 88 + dx must stay ≤ 90
    expect(88 + dx).toBeLessThanOrEqual(90 + 1e-9);
    expect(dx).toBeGreaterThanOrEqual(0);
  });

  it('accounts for the zoom: positions are measured after scaling about the origin', () => {
    const frame = { scale: 1.3, originX: 50, originY: 50 };
    const pts = [{ x: 30, y: 50 }, { x: 70, y: 50 }]; // scaled to 24 and 76
    const { dx } = focusShift(pts, frame, { x: 30, y: 50 }, safe);
    expect(76 + dx).toBeLessThanOrEqual(90 + 1e-9);
    expect(dx).toBeGreaterThan(0);
  });

  it('never moves more than the subtle cap', () => {
    const pts = [{ x: 50, y: 50 }, { x: 52, y: 52 }];
    const { dx, dy } = focusShift(pts, { scale: 1.3, originX: 51, originY: 51 }, { x: 50, y: 20 }, { x0: 0, x1: 100, y0: 0, y1: 100 });
    expect(Math.abs(dx)).toBeLessThanOrEqual(8);
    expect(Math.abs(dy)).toBeLessThanOrEqual(8);
  });

  it('given points already outside the safe area, then it does not move rather than guess', () => {
    const pts = [{ x: 5, y: 50 }, { x: 95, y: 50 }];
    expect(focusShift(pts, flat, { x: 5, y: 50 }, safe).dx).toBe(0);
  });

  it('never reveals the edge of the art: at zoom 1 there is no slack, so no lean', () => {
    const pts = [{ x: 30, y: 45 }, { x: 60, y: 55 }];
    expect(focusShift(pts, flat, { x: 30, y: 45 }, safe)).toEqual({ dx: 0, dy: 0 });
  });

  it('under zoom, the lean stays inside the slack the zoom created', () => {
    const frame = { scale: 1.2, originX: 50, originY: 50 };
    // slack per side = 50 * 0.2 = 10
    const pts = [{ x: 45, y: 50 }, { x: 55, y: 50 }];
    const { dx } = focusShift(pts, frame, { x: 20, y: 50 }, { x0: 0, x1: 100, y0: 0, y1: 100 });
    expect(Math.abs(dx)).toBeLessThanOrEqual(8);
    const edge = focusShift(pts, { scale: 1.05, originX: 50, originY: 50 }, { x: 20, y: 50 }, { x0: 0, x1: 100, y0: 0, y1: 100 });
    expect(Math.abs(edge.dx)).toBeLessThanOrEqual(2.5 + 1e-9);
  });
});
