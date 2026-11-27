import { describe, it, expect } from 'vitest';
import { classifyGesture } from '../gesture';

describe('gesture', () => {
  it('Given a short still press, then it is a tap', () => {
    expect(classifyGesture({ x: 10, y: 10, t: 0 }, { x: 12, y: 11, t: 120 }).kind).toBe('tap');
  });

  it('Given a fast swipe, then it is a flick with its speed in px per second', () => {
    const g = classifyGesture({ x: 100, y: 500, t: 0 }, { x: 100, y: 300, t: 100 });
    expect(g.kind).toBe('flick');
    expect(g.vy).toBeCloseTo(-2000);
    expect(g.vx).toBeCloseTo(0);
  });

  it('Given a slow long move, then it is a drag', () => {
    expect(classifyGesture({ x: 0, y: 0, t: 0 }, { x: 80, y: 0, t: 900 }).kind).toBe('drag');
  });
});
