import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../logger', () => ({ default: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { createEndpointLimiter } from '../apiRateLimiter';

function hit(limiter: ReturnType<typeof createEndpointLimiter>, ip: string): number {
  let status = 200;
  const req = { headers: { 'x-forwarded-for': ip }, path: '/check' } as unknown as Request;
  const res = {
    setHeader: vi.fn(),
    status(code: number) { status = code; return this; },
    json: vi.fn(),
  } as unknown as Response;
  limiter(req, res, () => {});
  return status;
}

describe('createEndpointLimiter', () => {
  it('given maxRequests 300, then the 101st request in a minute is still allowed', () => {
    const limiter = createEndpointLimiter({ maxRequests: 300, windowMs: 60000 });
    const statuses = Array.from({ length: 150 }, () => hit(limiter, '203.0.113.7'));
    expect(statuses.filter(s => s === 429)).toHaveLength(0);
  });

  it('given maxRequests 300, then request 301 is rate limited', () => {
    const limiter = createEndpointLimiter({ maxRequests: 300, windowMs: 60000 });
    const statuses = Array.from({ length: 301 }, () => hit(limiter, '203.0.113.8'));
    expect(statuses[299]).toBe(200);
    expect(statuses[300]).toBe(429);
  });
});
