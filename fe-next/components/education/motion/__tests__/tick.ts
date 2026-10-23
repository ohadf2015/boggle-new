import { act } from '@testing-library/react';
import { vi } from 'vitest';

/** Advance fake time in small steps so React commits between timers, as a browser would. */
export function tick(ms: number, step = 16) {
  for (let t = 0; t < ms; t += step) act(() => vi.advanceTimersByTime(Math.min(step, ms - t)));
}
