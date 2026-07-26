import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startFrameWatch,
  getRuntimeDowngrade,
  subscribeRuntimeTier,
  resetRuntimeTierForTests,
  SLOW_FRAME_MS,
  CONSECUTIVE_SLOW_FRAMES,
  MAX_WATCH_MS,
} from '../runtimeTier';

/**
 * Drives a fake requestAnimationFrame clock so we can feed exact frame
 * durations into the watcher. Each `advance(ms)` runs one frame that took
 * `ms` to render.
 */
function installFakeRaf() {
  let now = 0;
  let pending: FrameRequestCallback | null = null;
  let scheduled = 0;

  vi.stubGlobal('performance', { now: () => now });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    pending = cb;
    scheduled += 1;
    return scheduled;
  });
  vi.stubGlobal('cancelAnimationFrame', () => { pending = null; });
  vi.stubGlobal('document', { hidden: false });

  return {
    /** Run one frame that took `ms`. Returns false if nothing was scheduled. */
    frame(ms: number) {
      if (!pending) return false;
      now += ms;
      const cb = pending;
      pending = null;
      cb(now);
      return true;
    },
    frames(count: number, ms: number) {
      for (let i = 0; i < count; i += 1) this.frame(ms);
    },
    hasPending: () => pending !== null,
    setNow: (v: number) => { now = v; },
  };
}

const FAST = 16; // ~60fps
const SLOW = SLOW_FRAME_MS + 5; // comfortably under the threshold

describe('runtimeTier frame watcher', () => {
  let raf: ReturnType<typeof installFakeRaf>;

  beforeEach(() => {
    resetRuntimeTierForTests();
    raf = installFakeRaf();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetRuntimeTierForTests();
  });

  it('does not report a downgrade before any frames are observed', () => {
    // Given a fresh session
    // When nothing has run yet
    // Then the device is not considered downgraded
    expect(getRuntimeDowngrade()).toBe(false);
  });

  it('downgrades after sustained slow frames', () => {
    // Given a watcher on a device that cannot hold the frame budget
    startFrameWatch();
    // When it renders enough consecutive slow frames
    raf.frames(CONSECUTIVE_SLOW_FRAMES + 2, SLOW);
    // Then the tier is downgraded
    expect(getRuntimeDowngrade()).toBe(true);
  });

  it('does not downgrade a device holding the frame budget', () => {
    // Given a capable device
    startFrameWatch();
    // When it renders many fast frames
    raf.frames(CONSECUTIVE_SLOW_FRAMES * 3, FAST);
    // Then no downgrade is recorded
    expect(getRuntimeDowngrade()).toBe(false);
  });

  it('ignores isolated slow frames (GC pauses, one-off jank)', () => {
    // Given a capable device that occasionally hitches
    startFrameWatch();
    // When slow frames never occur consecutively
    for (let i = 0; i < CONSECUTIVE_SLOW_FRAMES * 3; i += 1) {
      raf.frame(SLOW);
      raf.frame(FAST); // recovery frame resets the streak
    }
    // Then the streak never completes and no downgrade happens
    expect(getRuntimeDowngrade()).toBe(false);
  });

  it('notifies subscribers exactly once when it downgrades', () => {
    // Given a subscriber
    const cb = vi.fn();
    subscribeRuntimeTier(cb);
    startFrameWatch();
    // When the device renders sustained slow frames well past the threshold
    raf.frames(CONSECUTIVE_SLOW_FRAMES * 3, SLOW);
    // Then the subscriber is notified a single time
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('stops watching once downgraded so it costs nothing afterwards', () => {
    // Given a watcher that has already downgraded
    startFrameWatch();
    raf.frames(CONSECUTIVE_SLOW_FRAMES + 2, SLOW);
    expect(getRuntimeDowngrade()).toBe(true);
    // When the downgrade has been recorded
    // Then no further frame is scheduled
    expect(raf.hasPending()).toBe(false);
  });

  it('gives up watching after the observation window on a fast device', () => {
    // Given a capable device
    startFrameWatch();
    // When the observation window elapses without sustained slowness
    const framesToExhaust = Math.ceil(MAX_WATCH_MS / FAST) + 2;
    raf.frames(framesToExhaust, FAST);
    // Then the watcher has stopped and left the tier alone
    expect(raf.hasPending()).toBe(false);
    expect(getRuntimeDowngrade()).toBe(false);
  });

  it('unsubscribes cleanly', () => {
    // Given a subscriber that has unsubscribed
    const cb = vi.fn();
    const unsubscribe = subscribeRuntimeTier(cb);
    unsubscribe();
    startFrameWatch();
    // When a downgrade happens
    raf.frames(CONSECUTIVE_SLOW_FRAMES + 2, SLOW);
    // Then the removed subscriber is not called
    expect(cb).not.toHaveBeenCalled();
  });

  it('is idempotent — a second startFrameWatch does not run two loops', () => {
    // Given a watcher already running
    startFrameWatch();
    const scheduledOnce = raf.hasPending();
    // When start is called again
    startFrameWatch();
    // Then there is still exactly one pending frame, and one frame advances it
    expect(scheduledOnce).toBe(true);
    expect(raf.frame(FAST)).toBe(true);
    expect(raf.frame(FAST)).toBe(true);
  });

  it('does not count frames while the tab is hidden', () => {
    // Given a backgrounded tab (rAF deltas balloon to seconds)
    startFrameWatch();
    vi.stubGlobal('document', { hidden: true });
    // When long "frames" elapse because the tab is not visible
    raf.frames(CONSECUTIVE_SLOW_FRAMES + 5, 1000);
    // Then background stalls are not mistaken for a slow device
    expect(getRuntimeDowngrade()).toBe(false);
  });
});
