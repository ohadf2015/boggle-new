// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { http, passthrough } from 'msw';
import { server as mswServer } from '../../test/msw/server';

vi.mock('@sentry/nextjs', () => ({ withScope: vi.fn(), captureException: vi.fn() }));

import { expressJsonBody } from '../middleware';
import { errorHandler } from '../errorMiddleware';

/**
 * Regression (prod QA 2026-10-07, after #1267): POST /api/solve-grid and
 * /api/dictionary/check with no content-type (or text/plain) answered 500
 * INTERNAL_ERROR. Express 5 leaves req.body undefined when nothing is parsed
 * and the handlers destructure req.body directly → TypeError.
 *
 * Requests must use real /api/* paths so shouldExpressParseJsonBody matches;
 * the global MSW setup stubs every POST to * /api/* with a 200, so let them
 * pass through to the in-process supertest app.
 */
beforeEach(() => {
  mswServer.use(http.all('*', () => passthrough()));
});

function makeApp() {
  const app = express();
  app.use(expressJsonBody());
  // Same shape as backend/routes/solveGrid.ts: destructures req.body directly.
  app.post('/api/solve-grid', (req, res) => {
    const { grid } = req.body;
    if (!Array.isArray(grid)) {
      res.status(400).json({ success: false, error: 'Grid is required' });
      return;
    }
    res.json({ success: true, rows: grid.length });
  });
  // A Next-handled path: must NOT be touched (stream left for Next to read).
  app.post('/en/not-api', (req, res) => { res.json({ bodyIsUndefined: req.body === undefined }); });
  app.use(errorHandler);
  return app;
}

describe('expressJsonBody — missing / non-JSON bodies on Express API routes', () => {
  it('answers the handler 400 (not 500) when there is no content-type', async () => {
    const res = await request(makeApp()).post('/api/solve-grid');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('answers 400 (not 500) for a text/plain body', async () => {
    const res = await request(makeApp()).post('/api/solve-grid').set('content-type', 'text/plain').send('hi');
    expect(res.status).toBe(400);
  });

  it('answers 400 for an empty application/json POST', async () => {
    const res = await request(makeApp()).post('/api/solve-grid').set('content-type', 'application/json');
    expect(res.status).toBe(400);
  });

  it('still parses a valid JSON body', async () => {
    const res = await request(makeApp()).post('/api/solve-grid').send({ grid: [['a'], ['b']] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, rows: 2 });
  });

  it('still maps malformed JSON to 400 INVALID_JSON via the error handler', async () => {
    const res = await request(makeApp()).post('/api/solve-grid').set('content-type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_JSON');
  });

  it('maps an oversized JSON body to 413', async () => {
    const big = JSON.stringify({ grid: 'x'.repeat(1024 * 1024 + 10) });
    const res = await request(makeApp()).post('/api/solve-grid').set('content-type', 'application/json').send(big);
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('leaves non-Express paths alone (req.body stays undefined for Next)', async () => {
    const res = await request(makeApp()).post('/en/not-api').set('content-type', 'text/plain').send('hi');
    expect(res.status).toBe(200);
    expect(res.body.bodyIsUndefined).toBe(true);
  });
});
