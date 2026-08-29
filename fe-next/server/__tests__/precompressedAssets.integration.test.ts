/**
 * Integration cover for precompressedAssets.
 *
 * The unit test stubs `res.sendFile`, so it cannot see how express's `send`
 * actually resolves the path — and `send` defaults to `dotfiles: 'ignore'`,
 * which turns EVERY `/_next/static/...` request into a 404 because `.next` is a
 * dot segment. That shipped past 12 green unit tests and only showed up against
 * a real server. Hence this file: a real app, real files, real bytes.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import { precompressedAssets } from '../precompressedAssets';

let root: string;
let server: Server;
let port: number;

const SOURCE = 'console.log("hello");'.repeat(200);

beforeAll(async () => {
  root = mkdtempSync(path.join(tmpdir(), 'precompressed-int-'));
  // Deliberately a DOT directory — this is the case that broke.
  mkdirSync(path.join(root, '.next', 'static', 'chunks'), { recursive: true });
  const file = path.join(root, '.next', 'static', 'chunks', 'main-abc.js');
  writeFileSync(file, SOURCE);
  writeFileSync(
    `${file}.br`,
    brotliCompressSync(Buffer.from(SOURCE), {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }),
  );
  mkdirSync(path.join(root, '.next', 'static', 'nobr'), { recursive: true });
  writeFileSync(path.join(root, '.next', 'static', 'nobr', 'plain.js'), SOURCE);

  const app = express();
  app.use(precompressedAssets([
    { urlPrefix: '/_next/static/', dir: path.join(root, '.next', 'static') },
  ]));
  app.use('/_next/static', express.static(path.join(root, '.next', 'static'), { dotfiles: 'allow' }));

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as { port: number }).port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  rmSync(root, { recursive: true, force: true });
});

const fetchRaw = async (urlPath: string, acceptEncoding: string, extra: Record<string, string> = {}) => {
  const http = await import('node:http');
  return new Promise<{ status: number; encoding: string; body: Buffer; etag?: string }>((resolve) => {
    const chunks: Buffer[] = [];
    const headers: Record<string, string> = { ...extra };
    if (acceptEncoding) headers['accept-encoding'] = acceptEncoding;
    http.get({ port, path: urlPath, headers }, (res) => {
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () =>
        resolve({
          status: res.statusCode ?? 0,
          encoding: String(res.headers['content-encoding'] ?? 'identity'),
          body: Buffer.concat(chunks),
          etag: res.headers.etag as string | undefined,
        }),
      );
    });
  });
};

describe('precompressedAssets (real server)', () => {
  it('serves brotli from a dot-directory and the bytes decode to the source', async () => {
    const res = await fetchRaw('/_next/static/chunks/main-abc.js', 'gzip, deflate, br, zstd');
    expect(res.status).toBe(200);
    expect(res.encoding).toBe('br');
    expect(brotliDecompressSync(res.body).toString()).toBe(SOURCE);
    expect(res.body.length).toBeLessThan(Buffer.byteLength(SOURCE));
  });

  it('falls through to the normal handler when no .br exists', async () => {
    const res = await fetchRaw('/_next/static/nobr/plain.js', 'gzip, deflate, br, zstd');
    expect(res.status).toBe(200);
    expect(res.encoding).toBe('identity');
    expect(res.body.toString()).toBe(SOURCE);
  });

  it('serves the plain file to a client that cannot take brotli', async () => {
    const res = await fetchRaw('/_next/static/chunks/main-abc.js', 'gzip, deflate');
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe(SOURCE);
  });

  // These assets are `immutable`, so the overwhelmingly common real request is a
  // REPEAT visit carrying If-None-Match. If this handler answered 200 to those,
  // it would push a full re-download of every chunk to every returning visitor —
  // a regression dressed up as an optimisation, and invisible to a 200-only test.
  it('answers a conditional request with 304 and an empty body', async () => {
    const first = await fetchRaw('/_next/static/chunks/main-abc.js', 'br');
    expect(first.status).toBe(200);
    expect(first.etag).toBeTruthy();

    const second = await fetchRaw('/_next/static/chunks/main-abc.js', 'br', {
      'if-none-match': first.etag as string,
    });
    expect(second.status).toBe(304);
    expect(second.body.length).toBe(0);
  });

  it('keeps the brotli ETag distinct from the identity ETag', async () => {
    // Same URL, different representations — they must not share an ETag, or a
    // client that cached the plain body would be handed brotli bytes as a match.
    const br = await fetchRaw('/_next/static/chunks/main-abc.js', 'br');
    const plain = await fetchRaw('/_next/static/nobr/plain.js', 'br');
    expect(br.etag).toBeTruthy();
    expect(plain.etag).toBeTruthy();
    expect(br.etag).not.toBe(plain.etag);
  });
});
