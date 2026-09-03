import { describe, it, expect } from 'vitest';
import {
  applyOfflineShellCacheHeader,
  isDocumentNavigation,
  isOfflineShellPath,
  OFFLINE_SHELL_CACHE_CONTROL,
} from '../offlineShellCache';
import type { Request, Response } from 'express';

/**
 * Cold-start offline: the Android WebView does NOT serve navigations from
 * service-worker cache on a cold launch (verified on device 2026-09-03 —
 * SW precache works mid-session but the first navigation fails straight to
 * Capacitor's errorPath). The reliable cold-start store is the WebView's
 * plain HTTP cache, but Next's dynamic pages send
 * `private, no-cache, no-store, max-age=0, must-revalidate`, which forbids
 * storing anything. This module rewrites Cache-Control for the offline-shell
 * routes (same set the SW precaches) so the WebView can cache the document,
 * and MainActivity sets LOAD_CACHE_ELSE_NETWORK so the cache is used when the
 * network is down.
 *
 * Safety invariants:
 *  - `private` only — shared caches never store these.
 *  - Document navigations only — RSC fetches / router prefetches share the
 *    same URLs and must never get a stale cached payload.
 *  - Non-shell routes are untouched (API responses keep no-store).
 */

function makeRes() {
  const headers: Record<string, unknown> = {};
  const res = {
    headers,
    setHeader(name: string, value: unknown) {
      headers[name.toLowerCase()] = value;
    },
    writeHead(_status: number, hdrs?: Record<string, unknown>) {
      Object.assign(headers, Object.fromEntries(Object.entries(hdrs ?? {}).map(([k, v]) => [k.toLowerCase(), v])));
      return this;
    },
  };
  return res as unknown as Response & { headers: Record<string, unknown> };
}

function makeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

describe('isOfflineShellPath', () => {
  it.each(['/', '/en', '/he', '/en/party', '/he/party', '/en/blast/v2', '/en/sealed-bid', '/en/crossword', '/he/connections/pyramid'])(
    'accepts shell route %s',
    (p) => expect(isOfflineShellPath(p)).toBe(true),
  );

  it.each(['/en/multiplayer', '/api/health', '/en/singleplayer?practice=1', '/party', '/en/party/extra'])(
    'rejects non-shell route %s',
    (p) => expect(isOfflineShellPath(p)).toBe(false),
  );
});

describe('isDocumentNavigation', () => {
  it('accepts plain document requests', () => {
    expect(isDocumentNavigation(makeReq())).toBe(true);
  });
  it('rejects RSC fetches and router prefetches', () => {
    expect(isDocumentNavigation(makeReq({ rsc: '1' }))).toBe(false);
    expect(isDocumentNavigation(makeReq({ 'next-router-prefetch': '1' }))).toBe(false);
  });
});

describe('applyOfflineShellCacheHeader', () => {
  it('rewrites Cache-Control for a shell document navigation', () => {
    const res = makeRes();
    applyOfflineShellCacheHeader(makeReq(), res, '/en/party');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    res.setHeader('Content-Type', 'text/html');
    expect(res.headers['cache-control']).toBe(OFFLINE_SHELL_CACHE_CONTROL);
    expect(res.headers['content-type']).toBe('text/html');
  });

  it('rewrites Cache-Control passed via writeHead headers object', () => {
    const res = makeRes();
    applyOfflineShellCacheHeader(makeReq(), res, '/en');
    (res as unknown as { writeHead(s: number, h: object): void }).writeHead(200, {
      'Cache-Control': 'no-store',
    });
    expect(res.headers['cache-control']).toBe(OFFLINE_SHELL_CACHE_CONTROL);
  });

  it('leaves non-shell routes untouched', () => {
    const res = makeRes();
    applyOfflineShellCacheHeader(makeReq(), res, '/en/multiplayer');
    res.setHeader('Cache-Control', 'no-store');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('leaves shell routes untouched for RSC fetches (same URL, must stay fresh)', () => {
    const res = makeRes();
    applyOfflineShellCacheHeader(makeReq({ rsc: '1' }), res, '/en/party');
    res.setHeader('Cache-Control', 'no-store');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('marks the header private so shared caches never store it', () => {
    expect(OFFLINE_SHELL_CACHE_CONTROL.startsWith('private')).toBe(true);
    expect(OFFLINE_SHELL_CACHE_CONTROL).not.toContain('no-store');
  });
});
