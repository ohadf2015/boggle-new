import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requestTimeout } from '../middleware';

/**
 * Run the timeout middleware for a path and advance past the 30s cap.
 * Returns the status the middleware answered with, or null if it left the
 * request alone (the route owns its own timeout).
 */
function statusAfterTimeout(path: string): number | null {
  let status: number | null = null;
  const res = {
    headersSent: false,
    status(code: number) {
      status = code;
      return this;
    },
    json: vi.fn(),
    on: vi.fn(),
  } as unknown as Response;
  const req = { path } as unknown as Request;
  const next: NextFunction = vi.fn();

  vi.useFakeTimers();
  requestTimeout()(req, res, next);
  vi.advanceTimersByTime(60_000);
  return status;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('requestTimeout', () => {
  it('caps an ordinary route at 30s with a 408', () => {
    expect(statusAfterTimeout('/api/game/state')).toBe(408);
  });

  // Regression: the 408 destroyed the socket mid-optimization and poisoned that
  // image cache key for good — the home hub's daily mascot and season banner
  // then rendered with no art on every later request.
  it('never times out the Next image optimizer', () => {
    expect(statusAfterTimeout('/_next/image')).toBeNull();
  });
});
