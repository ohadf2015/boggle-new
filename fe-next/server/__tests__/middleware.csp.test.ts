import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createHelmetMiddleware } from '../middleware';

/**
 * Capture the Content-Security-Policy header that helmet emits for a request.
 */
function getCspHeader(isDev = false): string {
  const handler = createHelmetMiddleware(isDev);
  const headers: Record<string, string> = {};
  const res = {
    setHeader: (name: string, value: string) => {
      headers[name.toLowerCase()] = value;
    },
    getHeader: (name: string) => headers[name.toLowerCase()],
    removeHeader: vi.fn(),
  } as unknown as Response;
  const req = { headers: {}, method: 'GET' } as unknown as Request;
  const next: NextFunction = vi.fn();

  handler(req, res, next);
  return headers['content-security-policy'] ?? '';
}

describe('CSP allows Google Identity Services (One Tap / Sign In With Google)', () => {
  it('permits the GIS client script in script-src', () => {
    const csp = getCspHeader();
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc).toContain('https://accounts.google.com/gsi/client');
  });

  it('permits the One Tap iframe in frame-src', () => {
    const csp = getCspHeader();
    const frameSrc = csp.split(';').find((d) => d.trim().startsWith('frame-src')) ?? '';
    expect(frameSrc).toContain('https://accounts.google.com/gsi/');
  });

  it('permits GIS network requests in connect-src', () => {
    const csp = getCspHeader();
    const connectSrc = csp.split(';').find((d) => d.trim().startsWith('connect-src')) ?? '';
    expect(connectSrc).toContain('https://accounts.google.com/gsi/');
  });
});

describe('CSP allows the Supabase Storage CDN for offloaded audio', () => {
  // Music + SFX stream from the Supabase bucket via Howler's HTML5 <audio>,
  // which CSP governs through media-src. Missing this blocks every track.
  it('permits the Supabase CDN in media-src', () => {
    const csp = getCspHeader();
    const mediaSrc = csp.split(';').find((d) => d.trim().startsWith('media-src')) ?? '';
    expect(mediaSrc).toContain('https://*.supabase.co');
  });
});

describe('CSP allows the growth-radar tracker', () => {
  // gr.js and gr-extended.js were on every page and blocked on every pageview: the requests
  // failed with `:: csp` and nothing reached the collector, so lexiclash looked instrumented
  // from the dashboard while sending nothing. Both directives matter — script-src without
  // connect-src is a tracker that runs and then cannot report.
  it('permits the tracker script in script-src', () => {
    const csp = getCspHeader();
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc).toContain('https://growthradar.app');
  });

  it('permits the tracker to POST what it captures in connect-src', () => {
    const csp = getCspHeader();
    const connectSrc = csp.split(';').find((d) => d.trim().startsWith('connect-src')) ?? '';
    expect(connectSrc).toContain('https://growthradar.app');
  });
});
