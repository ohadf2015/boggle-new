import { describe, it, expect } from 'vitest';
import { tickClock, MAX_TICK_MS } from '../runClock';

describe('tickClock', () => {
  it('counts down and reports the combat delta while running', () => {
    const t = tickClock({ now: 1_000, endAt: 6_000, lastTick: 800 });
    expect(t.msLeft).toBe(5_000);
    expect(t.dt).toBe(200);
    expect(t.endAt).toBe(6_000);
    expect(t.expired).toBe(false);
  });

  it('expires when the deadline passes', () => {
    expect(tickClock({ now: 6_001, endAt: 6_000, lastTick: 5_800 })).toMatchObject({ msLeft: 0, expired: true });
  });

  it('slides the deadline instead of draining while paused', () => {
    // 10s in the background: the level must still have its 5s left afterwards.
    const t = tickClock({ now: 11_000, endAt: 6_000, lastTick: 1_000, paused: true });
    expect(t.endAt).toBe(16_000);
    expect(t.msLeft).toBe(5_000);
    expect(t.dt).toBe(0);
    expect(t.expired).toBe(false);
  });

  it('never expires while paused, even past the old deadline', () => {
    expect(tickClock({ now: 99_000, endAt: 6_000, lastTick: 5_900, paused: true }).expired).toBe(false);
  });

  it('never hands the fight more than one second of backlog after a throttled tick', () => {
    // Tab was hidden for two minutes, then the interval fires once on return.
    const t = tickClock({ now: 125_000, endAt: 200_000, lastTick: 5_000 });
    expect(t.dt).toBe(MAX_TICK_MS);
    expect(t.msLeft).toBe(75_000); // the clock itself stays honest
  });

  it('gives no free time when the wall clock jumps backwards', () => {
    const t = tickClock({ now: 1_000, endAt: 6_000, lastTick: 4_000 });
    expect(t.dt).toBe(0);
    expect(t.msLeft).toBe(5_000);
  });
});
