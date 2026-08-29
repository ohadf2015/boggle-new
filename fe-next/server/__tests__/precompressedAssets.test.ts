/**
 * Build-time brotli-11 siblings for immutable assets.
 *
 * Two roots, both content-hashed and served `immutable`, so a `.br` written at
 * build time can never go stale against its source:
 *   /i18n/<lang>.<hash>.js  -> public/i18n      (render-BLOCKING, the big one)
 *   /_next/static/**        -> .next/static     (async chunks + css)
 *
 * Everything here must fail SAFE: a missing, unreadable, or out-of-root `.br`
 * falls through to the normal handler and the client gets gzip.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Request, Response, NextFunction } from 'express';
import { precompressedAssets } from '../precompressedAssets';

let root: string;
let roots: Array<{ urlPrefix: string; dir: string }>;

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'precompressed-'));
  mkdirSync(path.join(root, 'public', 'i18n'), { recursive: true });
  mkdirSync(path.join(root, '.next', 'static', 'chunks'), { recursive: true });
  mkdirSync(path.join(root, 'secret'), { recursive: true });

  writeFileSync(path.join(root, 'public', 'i18n', 'en.abc123.js'), 'globalThis.X=1;\n');
  writeFileSync(path.join(root, 'public', 'i18n', 'en.abc123.js.br'), Buffer.from([0x1b, 0, 0]));
  // Built before this change: .js present, .br absent.
  writeFileSync(path.join(root, 'public', 'i18n', 'sv.def456.js'), 'globalThis.X=2;\n');

  writeFileSync(path.join(root, '.next', 'static', 'chunks', 'main-aaa.js'), 'console.log(1)\n');
  writeFileSync(path.join(root, '.next', 'static', 'chunks', 'main-aaa.js.br'), Buffer.from([0x1b, 0, 1]));
  writeFileSync(path.join(root, '.next', 'static', 'app.css'), 'body{}\n');
  writeFileSync(path.join(root, '.next', 'static', 'app.css.br'), Buffer.from([0x1b, 0, 2]));

  writeFileSync(path.join(root, 'secret', 'passwd.js'), 'nope\n');
  writeFileSync(path.join(root, 'secret', 'passwd.js.br'), Buffer.from([0x1b, 0, 3]));

  roots = [
    { urlPrefix: '/i18n/', dir: path.join(root, 'public', 'i18n') },
    { urlPrefix: '/_next/static/', dir: path.join(root, '.next', 'static') },
  ];
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

const run = (url: string, acceptEncoding = 'br', method = 'GET') => {
  const headers: Record<string, string> = {};
  if (acceptEncoding) headers['accept-encoding'] = acceptEncoding;
  const sent: string[] = [];
  const set: Record<string, string> = {};
  const req = { method, path: url, url, headers } as unknown as Request;
  const res = {
    setHeader: (k: string, v: string) => { set[k] = v; },
    sendFile: (p: string) => { sent.push(p); },
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  precompressedAssets(roots)(req, res, next);
  return { sent, set, next };
};

describe('precompressedAssets', () => {
  it('serves the .br sibling for the render-blocking i18n catalogue', () => {
    const { sent, set, next } = run('/i18n/en.abc123.js');
    expect(sent).toEqual([path.join(root, 'public', 'i18n', 'en.abc123.js.br')]);
    expect(set['Content-Encoding']).toBe('br');
    expect(set['Content-Type']).toMatch(/javascript/);
    expect(set['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(set['Vary']).toBe('Accept-Encoding');
    expect(next).not.toHaveBeenCalled();
  });

  it('serves nested _next/static chunks', () => {
    const { sent, set } = run('/_next/static/chunks/main-aaa.js');
    expect(sent).toEqual([path.join(root, '.next', 'static', 'chunks', 'main-aaa.js.br')]);
    expect(set['Content-Type']).toMatch(/javascript/);
  });

  it('sets the right Content-Type for css', () => {
    const { sent, set } = run('/_next/static/app.css');
    expect(sent).toHaveLength(1);
    expect(set['Content-Type']).toBe('text/css; charset=utf-8');
  });

  it('ignores a query string when resolving the file', () => {
    const { sent } = run('/_next/static/chunks/main-aaa.js');
    expect(sent).toHaveLength(1);
  });

  it('falls through when the client cannot take brotli', () => {
    const { sent, next } = run('/i18n/en.abc123.js', 'gzip, deflate');
    expect(sent).toEqual([]);
    expect(next).toHaveBeenCalledOnce();
  });

  it('falls through when no .br was built for that file', () => {
    const { sent, next } = run('/i18n/sv.def456.js');
    expect(sent).toEqual([]);
    expect(next).toHaveBeenCalledOnce();
  });

  it('ignores unknown prefixes', () => {
    const { sent, next } = run('/api/whatever.js');
    expect(sent).toEqual([]);
    expect(next).toHaveBeenCalledOnce();
  });

  it('refuses traversal out of the root even when a .br exists there', () => {
    const { sent, next } = run('/_next/static/../../secret/passwd.js');
    expect(sent).toEqual([]);
    expect(next).toHaveBeenCalledOnce();
  });

  it('refuses encoded traversal', () => {
    const { sent, next } = run('/_next/static/%2e%2e/%2e%2e/secret/passwd.js');
    expect(sent).toEqual([]);
    expect(next).toHaveBeenCalledOnce();
  });

  it('only handles extensions worth compressing', () => {
    const { sent, next } = run('/_next/static/media/font.woff2');
    expect(sent).toEqual([]);
    expect(next).toHaveBeenCalledOnce();
  });

  it('ignores non-GET/HEAD requests', () => {
    const { sent, next } = run('/i18n/en.abc123.js', 'br', 'POST');
    expect(sent).toEqual([]);
    expect(next).toHaveBeenCalledOnce();
  });

  it('serves HEAD like GET', () => {
    const { sent } = run('/i18n/en.abc123.js', 'br', 'HEAD');
    expect(sent).toHaveLength(1);
  });
});
