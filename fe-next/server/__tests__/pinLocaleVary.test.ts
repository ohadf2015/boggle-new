import { describe, it, expect } from 'vitest';
import { pinLocaleVary, shouldPinLocaleVary } from '../pinLocaleVary';
import { applyOfflineShellCacheHeader, OFFLINE_SHELL_CACHE_CONTROL } from '../offlineShellCache';
import type { Request, Response } from 'express';

function mockRes() {
  const headers: Record<string, unknown> = {};
  const res = {
    _headers: headers,
    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },
    setHeader(name: string, value: unknown) {
      headers[name.toLowerCase()] = value;
      return res;
    },
    appendHeader(name: string, value: string) {
      const key = name.toLowerCase();
      const prev = headers[key];
      headers[key] = prev ? `${prev}, ${value}` : value;
      return res;
    },
    writeHead(_status: number, a?: unknown, b?: unknown) {
      const hdrs = (typeof a === 'object' && a ? a : typeof b === 'object' && b ? b : undefined) as
        | Record<string, unknown>
        | undefined;
      if (hdrs) {
        for (const [k, v] of Object.entries(hdrs)) headers[k.toLowerCase()] = v;
      }
      return res;
    },
  };
  return res;
}

describe('shouldPinLocaleVary', () => {
  it('pins bare and other unprefixed document paths', () => {
    expect(shouldPinLocaleVary('/')).toBe(true);
    expect(shouldPinLocaleVary('/multiplayer')).toBe(true);
    expect(shouldPinLocaleVary('/singleplayer')).toBe(true);
    expect(shouldPinLocaleVary('/legal/privacy')).toBe(true);
  });

  it('leaves locale-prefixed pages, APIs, and assets alone', () => {
    expect(shouldPinLocaleVary('/en')).toBe(false);
    expect(shouldPinLocaleVary('/he/multiplayer')).toBe(false);
    expect(shouldPinLocaleVary('/api/version')).toBe(false);
    expect(shouldPinLocaleVary('/_next/static/chunk.js')).toBe(false);
    expect(shouldPinLocaleVary('/lcx/e')).toBe(false);
    expect(shouldPinLocaleVary('/favicon.ico')).toBe(false);
    expect(shouldPinLocaleVary('/robots.txt')).toBe(false);
    expect(shouldPinLocaleVary('/sitemap.xml')).toBe(false);
  });
});

describe('pinLocaleVary', () => {
  it('seeds Vary with Accept-Language and Cookie', () => {
    const res = mockRes();
    pinLocaleVary(res as unknown as Response);
    expect(String(res.getHeader('Vary'))).toMatch(/Accept-Language/i);
    expect(String(res.getHeader('Vary'))).toMatch(/Cookie/i);
  });

  it('keeps those tokens when Next overwrites Vary with its RSC list', () => {
    const res = mockRes();
    pinLocaleVary(res as unknown as Response);
    res.setHeader('Vary', 'rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding');
    const vary = String(res.getHeader('Vary'));
    expect(vary).toMatch(/Accept-Language/i);
    expect(vary).toMatch(/Cookie/i);
    expect(vary).toMatch(/Accept-Encoding/i);
    expect(vary).toMatch(/rsc/i);
  });

  it('merges Vary passed via writeHead headers', () => {
    const res = mockRes();
    pinLocaleVary(res as unknown as Response);
    res.writeHead(200, {
      Vary: 'rsc, Accept-Encoding',
      'Content-Type': 'text/html',
    });
    const vary = String(res.getHeader('Vary'));
    expect(vary).toMatch(/Accept-Language/i);
    expect(vary).toMatch(/Cookie/i);
    expect(vary).toMatch(/rsc/i);
  });

  it('merges Vary passed via writeHead(status, reason, headers)', () => {
    const res = mockRes();
    pinLocaleVary(res as unknown as Response);
    res.writeHead(200, 'OK', { vary: 'Accept-Encoding' });
    const vary = String(res.getHeader('vary'));
    expect(vary).toMatch(/Accept-Language/i);
    expect(vary).toMatch(/Cookie/i);
  });

  it('is idempotent when pinned twice', () => {
    const res = mockRes();
    pinLocaleVary(res as unknown as Response);
    pinLocaleVary(res as unknown as Response);
    res.setHeader('Vary', 'Accept-Encoding');
    const vary = String(res.getHeader('Vary'));
    expect(vary.match(/Accept-Language/gi)).toHaveLength(1);
    expect(vary.match(/Cookie/gi)).toHaveLength(1);
  });

  it('still rewrites Cache-Control when composed with the offline-shell wrapper', () => {
    const res = mockRes();
    const req = { headers: {} } as Request;
    applyOfflineShellCacheHeader(req, res as unknown as Response, '/');
    pinLocaleVary(res as unknown as Response);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
    res.setHeader('Vary', 'rsc, next-router-state-tree, Accept-Encoding');
    expect(res.getHeader('Cache-Control')).toBe(OFFLINE_SHELL_CACHE_CONTROL);
    const vary = String(res.getHeader('Vary'));
    expect(vary).toMatch(/Accept-Language/i);
    expect(vary).toMatch(/Cookie/i);
    expect(vary).toMatch(/rsc/i);
  });
});
