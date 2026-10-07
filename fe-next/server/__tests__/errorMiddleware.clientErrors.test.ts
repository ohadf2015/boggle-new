// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@sentry/nextjs', () => ({ withScope: vi.fn(), captureException: vi.fn() }));

import * as Sentry from '@sentry/nextjs';
import { errorHandler, clientErrorStatus } from '../errorMiddleware';

/**
 * Regression (prod QA 2026-10-07): POST /api/solve-grid with a malformed or
 * non-object JSON body (`nope`, `null`) returned 500 INTERNAL_ERROR and was
 * reported to Sentry, because body-parser's 400 entity.parse.failed error fell
 * through to the generic branch. Client errors must keep their 4xx status.
 */
// Paths deliberately avoid /api/*: the global MSW setup answers */api/* with a stub 200.
function makeApp() {
  const app = express();
  app.use(express.json({ limit: '1mb', strict: true }));
  app.post('/x/echo', (req, res) => { res.json({ ok: true, body: req.body }); });
  app.post('/x/boom', () => { throw new Error('kaboom'); });
  app.use(errorHandler);
  return app;
}

describe('errorHandler — http-errors client errors', () => {
  it('returns 400 INVALID_JSON for a malformed JSON body', async () => {
    const res = await request(makeApp()).post('/x/echo').set('content-type', 'application/json').send('nope');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_JSON');
  });

  it('returns 400 for a non-object JSON body under strict parsing (null)', async () => {
    const res = await request(makeApp()).post('/x/echo').set('content-type', 'application/json').send('null');
    expect(res.status).toBe(400);
  });

  it('still parses a valid body', async () => {
    const res = await request(makeApp()).post('/x/echo').send({ a: 1 });
    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ a: 1 });
  });

  it('keeps genuine server errors as 500 INTERNAL_ERROR', async () => {
    const res = await request(makeApp()).post('/x/boom').send({});
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('INTERNAL_ERROR');
  });

  it('does not send client errors to Sentry in production', async () => {
    const prev = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    try {
      vi.mocked(Sentry.withScope).mockClear();
      await request(makeApp()).post('/x/echo').set('content-type', 'application/json').send('nope');
      expect(Sentry.withScope).not.toHaveBeenCalled();
    } finally {
      (process.env as Record<string, string>).NODE_ENV = prev as string;
    }
  });

  it('clientErrorStatus only matches exposed 4xx errors', () => {
    expect(clientErrorStatus(Object.assign(new Error('x'), { status: 413, expose: true }))).toBe(413);
    expect(clientErrorStatus(Object.assign(new Error('x'), { status: 500, expose: false }))).toBeNull();
    expect(clientErrorStatus(Object.assign(new Error('x'), { status: 404, expose: false }))).toBeNull();
    expect(clientErrorStatus(new Error('plain'))).toBeNull();
    expect(clientErrorStatus(null)).toBeNull();
  });
});
