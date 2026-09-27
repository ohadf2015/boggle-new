import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { preferBrotli } from '../middleware';

// Header parsing itself is covered by lib/http/__tests__/acceptEncoding.test.ts.
describe('preferBrotli middleware', () => {
  const run = (headers: Record<string, string>, url = '/en') => {
    const req = { headers, url } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;
    preferBrotli()(req, {} as Response, next);
    return { req, next };
  };

  it('rewrites a browser header in place so brotli wins downstream', () => {
    const { req, next } = run({ 'accept-encoding': 'gzip, deflate, br, zstd' });
    expect(req.headers['accept-encoding']).toBe('br');
    expect(next).toHaveBeenCalledOnce();
  });

  it('leaves a gzip-only client untouched', () => {
    const { req } = run({ 'accept-encoding': 'gzip, deflate' });
    expect(req.headers['accept-encoding']).toBe('gzip, deflate');
  });

  it('leaves a client that explicitly refuses brotli untouched', () => {
    const { req } = run({ 'accept-encoding': 'gzip, deflate, br;q=0' });
    expect(req.headers['accept-encoding']).toBe('gzip, deflate, br;q=0');
  });

  it('leaves socket.io transport requests alone', () => {
    const { req } = run({ 'accept-encoding': 'gzip, deflate, br' }, '/socket.io/?EIO=4');
    expect(req.headers['accept-encoding']).toBe('gzip, deflate, br');
  });

  it('does not invent a header when the client sent none', () => {
    const { req, next } = run({});
    expect(req.headers['accept-encoding']).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });
});
