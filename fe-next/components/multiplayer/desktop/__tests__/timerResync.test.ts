import { describe, it, expect } from 'vitest';
import { reconcileTimerRing, type TimerRingState } from '../timerResync';

/**
 * The desktop shell badge ring (react-countdown-circle-timer) seeds its
 * countdown ONCE and then ticks on its own RAF — it never re-reads the
 * server's remainingTime, so it drifts (reconnect / tab-throttle). The server
 * is the source of truth; the ring only displays it. These tests pin the
 * "re-seed only on a server jump" reconciliation (pure, time-free).
 */
describe('reconcileTimerRing', () => {
  it('seeds the ring at key 0 on the first reading', () => {
    expect(reconcileTimerRing(null, 90)).toEqual({ remaining: 90, key: 0, lastServer: 90 });
  });

  it('keeps the ring seed + key stable across normal 1Hz ticks (smooth, no remount)', () => {
    let s: TimerRingState = reconcileTimerRing(null, 90);
    s = reconcileTimerRing(s, 89);
    s = reconcileTimerRing(s, 88);
    expect(s.key).toBe(0);
    expect(s.remaining).toBe(90); // ring still counting from its original seed
    expect(s.lastServer).toBe(88); // but tracks the latest reading
  });

  it('absorbs a couple of batched ticks without re-keying (sub-threshold drop)', () => {
    let s = reconcileTimerRing(null, 90);
    s = reconcileTimerRing(s, 87); // dropped 3 — at the limit, still normal
    expect(s.key).toBe(0);
  });

  it('re-seeds (new key) when the server jumps UP — reconnect resend / new round', () => {
    let s = reconcileTimerRing(null, 40);
    s = reconcileTimerRing(s, 60);
    expect(s.key).toBe(1);
    expect(s.remaining).toBe(60);
  });

  it('re-seeds when the server drops far in one reading — a throttled tab catching up', () => {
    let s = reconcileTimerRing(null, 88);
    s = reconcileTimerRing(s, 70); // 18s gap in one render → snap to truth
    expect(s.key).toBe(1);
    expect(s.remaining).toBe(70);
  });

  it('respects a custom threshold', () => {
    let s = reconcileTimerRing(null, 30, 0.5);
    s = reconcileTimerRing(s, 28, 0.5); // dropped 2 > 0.5 → re-seed
    expect(s.key).toBe(1);
    expect(s.remaining).toBe(28);
  });

  it('never re-keys across a clean countdown to zero', () => {
    let s = reconcileTimerRing(null, 5);
    for (let r = 4; r >= 0; r--) s = reconcileTimerRing(s, r);
    expect(s.key).toBe(0);
    expect(s.remaining).toBe(5); // anchor stays the original seed
  });
});
