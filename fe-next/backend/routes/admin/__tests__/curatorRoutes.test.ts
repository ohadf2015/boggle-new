/**
 * Tests for the Express admin curator-assignment router.
 *
 * These run against a real express() app with express.json() in front — which
 * is the layer the original Next.js app/api route silently failed on: the
 * custom server body-parses /api/* before the request would fall through to
 * Next, so `await request.json()` there hung and returned 408. Serving the
 * endpoint from Express (like every other admin mutation) is the fix.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type NextFunction, type Response } from 'express';
import request from 'supertest';
import type { AdminRequest } from '../types';

const cap: { upserts: unknown[]; updates: unknown[]; listResult: unknown[] } = {
  upserts: [],
  updates: [],
  listResult: [{ curator_id: 'u1', language: 'he', trust_tier: 1, active: true }],
};

vi.mock('../../../modules/supabaseServer', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: () => ({
    from: () => {
      const chain: Record<string, unknown> = {};
      chain.upsert = (row: unknown) => {
        cap.upserts.push(row);
        return Promise.resolve({ error: null });
      };
      chain.update = (patch: unknown) => {
        cap.updates.push(patch);
        return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) };
      };
      chain.select = () => {
        const qb: Record<string, unknown> = {};
        qb.eq = () => qb;
        (qb as { then: unknown }).then = (resolve: (v: unknown) => void) =>
          resolve({ data: cap.listResult, error: null });
        return qb;
      };
      return chain;
    },
  }),
}));

const notifySpy = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../modules/pushNotificationTriggers', () => ({
  notifyCuratorAssigned: (...args: unknown[]) => notifySpy(...args),
}));

// Import AFTER mocks are registered.
const { default: curatorRoutes } = await import('../curatorRoutes');

const uid = '537a9da1-baee-4a94-b302-dbc97c9a16c2';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req: AdminRequest, _res: Response, next: NextFunction) => {
    req.adminUser = { id: 'admin-1', email: 'a@test.com', username: 'admin' } as AdminRequest['adminUser'];
    req.requestId = 'req-test';
    next();
  });
  app.use('/curators', curatorRoutes);
  return app;
}

beforeEach(() => {
  cap.upserts = [];
  cap.updates = [];
  notifySpy.mockClear();
});

describe('POST /api/admin/curators (Express)', () => {
  it('assigns a curator: upsert active row attributed to the admin, fires notify', async () => {
    const app = makeApp();
    const res = await request(app).post('/curators').send({ userId: uid, language: 'he', trustTier: 2 });
    expect(res.status).toBe(200);
    expect(res.body.assigned).toBe(true);
    const row = cap.upserts[0] as Record<string, unknown>;
    expect(row.curator_id).toBe(uid);
    expect(row.active).toBe(true);
    expect(row.trust_tier).toBe(2);
    expect(row.assigned_by).toBe('admin-1');
    expect(notifySpy).toHaveBeenCalledWith(uid, 'he', 2);
  });

  it('rejects an invalid assignment (400) and writes nothing', async () => {
    const app = makeApp();
    const res = await request(app).post('/curators').send({ userId: 'nope', language: 'he' });
    expect(res.status).toBe(400);
    expect(cap.upserts).toHaveLength(0);
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it('rejects a missing body (400)', async () => {
    const app = makeApp();
    const res = await request(app).post('/curators').send({});
    expect(res.status).toBe(400);
    expect(cap.upserts).toHaveLength(0);
  });

  it('revokes a curator: update active=false with reason attributed to the admin', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/curators')
      .send({ action: 'revoke', userId: uid, language: 'he', reason: 'spam' });
    expect(res.status).toBe(200);
    expect(res.body.revoked).toBe(true);
    const patch = cap.updates[0] as Record<string, unknown>;
    expect(patch.active).toBe(false);
    expect(patch.revoked_by).toBe('admin-1');
    expect(patch.revoked_reason).toBe('spam');
  });
});

describe('GET /api/admin/curators (Express)', () => {
  it('lists active curator assignments', async () => {
    const app = makeApp();
    const res = await request(app).get('/curators');
    expect(res.status).toBe(200);
    expect(res.body.curators).toHaveLength(1);
  });

  it('accepts a language filter', async () => {
    const app = makeApp();
    const res = await request(app).get('/curators?language=he');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.curators)).toBe(true);
  });
});
