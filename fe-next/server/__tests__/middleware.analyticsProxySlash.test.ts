import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { analyticsProxyNoSlash } from '../middleware';

describe('analyticsProxyNoSlash', () => {
  const run = (url: string) => {
    const req = { url } as unknown as Request;
    const res = { setMaxListeners: vi.fn() };
    const next = vi.fn() as unknown as NextFunction;
    analyticsProxyNoSlash()(req, res as unknown as Response, next);
    return { url: req.url, next, res };
  };

  it('Given an analytics event posted with a trailing slash, Then it reaches the proxy without one (no 308 round trip)', () => {
    expect(run('/lcx/e/?ip=0&ver=1').url).toBe('/lcx/e?ip=0&ver=1');
    expect(run('/lcx/i/v0/e/').url).toBe('/lcx/i/v0/e');
    expect(run('/lcx/flags/?v=2').url).toBe('/lcx/flags?v=2');
  });

  it('Given any other path, Then the URL is untouched so the site keeps its slash redirects', () => {
    expect(run('/en/words/').url).toBe('/en/words/');
    expect(run('/lcx').url).toBe('/lcx');
    expect(run('/lcx/static/array.js').url).toBe('/lcx/static/array.js');
  });

  it('always continues the chain', () => {
    expect(run('/lcx/e/').next).toHaveBeenCalledOnce();
  });

  it('Given a proxied analytics call, Then its response allows the proxy its extra close listener', () => {
    expect(run('/lcx/flags/?v=2').res.setMaxListeners).toHaveBeenCalledWith(20);
    expect(run('/en').res.setMaxListeners).not.toHaveBeenCalled();
  });
});
