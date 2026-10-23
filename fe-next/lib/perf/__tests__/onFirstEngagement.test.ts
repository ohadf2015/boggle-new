import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  onFirstEngagement,
  hasPriorEngagement,
  markEngaged,
  ENGAGED_SESSION_KEY,
  FIRST_ENGAGEMENT_EVENTS,
} from '../onFirstEngagement';

describe('onFirstEngagement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('does not fire on timers or scroll (both land inside a PSI trace)', () => {
    const fn = vi.fn();
    onFirstEngagement(fn);
    vi.advanceTimersByTime(60_000);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('pointermove'));
    expect(fn).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(ENGAGED_SESSION_KEY)).toBeNull();
  });

  it.each(FIRST_ENGAGEMENT_EVENTS)('fires once on %s and records the session', (type) => {
    const fn = vi.fn();
    onFirstEngagement(fn);
    window.dispatchEvent(new Event(type));
    window.dispatchEvent(new Event(type));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(hasPriorEngagement()).toBe(true);
  });

  it('cancel removes the listeners', () => {
    const fn = vi.fn();
    const cancel = onFirstEngagement(fn);
    cancel();
    window.dispatchEvent(new Event('pointerdown'));
    expect(fn).not.toHaveBeenCalled();
  });

  it('markEngaged is readable via hasPriorEngagement', () => {
    expect(hasPriorEngagement()).toBe(false);
    markEngaged();
    expect(hasPriorEngagement()).toBe(true);
  });
});
