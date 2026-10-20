import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import http, { type Server } from 'node:http';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { registerSqlWasmRoute, SQL_WASM_ROUTE } from '../sqlWasmRoute';

const WASM = Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

let root: string;
let server: Server;
let port: number;

beforeAll(async () => {
  root = mkdtempSync(path.join(tmpdir(), 'sql-wasm-'));
  mkdirSync(path.join(root, 'public', 'sql'), { recursive: true });
  writeFileSync(path.join(root, 'public', 'sql', 'sql-wasm.wasm'), WASM);

  const app = express();
  registerSqlWasmRoute(app, root);
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

function get(urlPath: string): Promise<{ status: number; type: string; body: Buffer }> {
  return new Promise((resolve, reject) => {
    http.get({ port, path: urlPath }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode ?? 0,
        type: String(res.headers['content-type'] ?? ''),
        body: Buffer.concat(chunks),
      }));
    }).on('error', reject);
  });
}

describe('GET /sql/sql-wasm.wasm', () => {
  it('returns 200 with application/wasm', async () => {
    const res = await get(SQL_WASM_ROUTE);
    expect(res.status).toBe(200);
    expect(res.type.startsWith('application/wasm')).toBe(true);
    expect(res.body.equals(WASM)).toBe(true);
  });
});
