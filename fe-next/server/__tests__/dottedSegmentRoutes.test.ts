import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import http, { type Server } from 'node:http';
import sitemap from '../../app/sitemap';
import { finishNextHandleGate } from '../nextHandleGateRoute';
import { sitemapXmlHandler } from '../sitemapXml';

/**
 * Route-level GETs for dotted non-locale prefixes.
 * Mounts the same handlers server/index.ts registers, in the same order:
 * exact /sitemap.xml, then the catch-all gate, then a stand-in for Next
 * handle(). A 200 with body "next-handle" means the gate passed the request
 * through — it is not a rendered page (Next is not booted here).
 */
let server: Server;
let port: number;

beforeAll(async () => {
  const app = express();
  app.get('/sitemap.xml', sitemapXmlHandler);
  app.use((req, res) => {
    if (finishNextHandleGate(req, res)) return;
    res.status(200).type('html').send('next-handle');
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      port = (server.address() as { port: number }).port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

function get(urlPath: string): Promise<{ status: number; location: string; type: string; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get({ port, path: urlPath }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode ?? 0,
        location: String(res.headers.location ?? ''),
        type: String(res.headers['content-type'] ?? ''),
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('error', reject);
  });
}

describe('dotted-segment junk URLs (route-level GET)', () => {
  it('GET /sitemap.xml/online-word-games-with-friends 308s to /en/online-word-games-with-friends', async () => {
    const res = await get('/sitemap.xml/online-word-games-with-friends');
    expect(res.status).toBe(308);
    expect(res.location).toBe('/en/online-word-games-with-friends');
  });

  it('GET /sitemap.xml/education/sight-words-practice 308s to /en/education/sight-words-practice', async () => {
    const res = await get('/sitemap.xml/education/sight-words-practice');
    expect(res.status).toBe(308);
    expect(res.location).toBe('/en/education/sight-words-practice');
  });

  it('GET /foo.php/x is 404', async () => {
    const res = await get('/foo.php/x');
    expect(res.status).toBe(404);
    expect(res.type).toMatch(/text\/html/);
    expect(res.body).toContain('Page not found');
  });

  it('GET /sitemap.xml is 200 XML with the real sitemap body', async () => {
    const res = await get('/sitemap.xml');
    const entries = sitemap();
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/xml/);
    expect(res.body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(res.body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(res.body.trimEnd().endsWith('</urlset>')).toBe(true);
    expect(entries.length).toBeGreaterThan(100);
    expect(res.body).toContain(`<loc>${entries[0].url}</loc>`);
    expect(res.body).toContain(`<loc>${entries[entries.length - 1].url}</loc>`);
    expect(res.body).not.toContain('/sitemap.xml/');
  });

  it('GET /en/online-word-games-with-friends is not intercepted', async () => {
    const res = await get('/en/online-word-games-with-friends');
    expect(res.status).toBe(200);
    expect(res.body).toBe('next-handle');
    expect(res.location).toBe('');
  });

  it('keeps the query string on the 308 and does not add a host', async () => {
    const res = await get('/sitemap.xml/online-word-games-with-friends?utm=crawler');
    expect(res.status).toBe(308);
    expect(res.location).toBe('/en/online-word-games-with-friends?utm=crawler');
  });
});
