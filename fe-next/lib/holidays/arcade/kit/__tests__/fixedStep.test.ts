import { describe, it, expect } from 'vitest';
import { createFixedStep, STEP_MS } from '../fixedStep';

describe('fixed-timestep loop', () => {
  it('Given frames of uneven length, then the world advances in equal steps and keeps the remainder', () => {
    const steps: number[] = [];
    const loop = createFixedStep((dt) => steps.push(dt));
    loop.advance(STEP_MS * 2.5);
    expect(steps).toEqual([STEP_MS / 1000, STEP_MS / 1000]);
    loop.advance(STEP_MS * 0.5);
    expect(steps).toHaveLength(3);
  });

  it('Given a long stall (tab was hidden), then it catches up at most a few steps instead of spiralling', () => {
    let n = 0;
    const loop = createFixedStep(() => n++);
    loop.advance(5000);
    expect(n).toBeLessThanOrEqual(5);
    loop.advance(STEP_MS * 0.1);
    expect(n).toBeLessThanOrEqual(5);
  });

  it('Given a time scale (hit-stop), then the world crawls', () => {
    let n = 0;
    const loop = createFixedStep(() => n++);
    loop.advance(STEP_MS * 10, 0.1);
    expect(n).toBe(1);
  });
});
