/**
 * GET /api/avatar/png/:playerId — Express, not a Next route handler.
 * Next compiles route handlers under the `react-server` condition, where the
 * avatar parts' React contexts are client references (`.Provider` undefined)
 * and every render 404'd in prod. This renders under plain Node React.
 */
import { vi } from 'vitest';
import request from 'supertest';
import express from 'express';

const { mockSupabase, maybeSingle } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const chain = { select: () => chain, eq: () => chain, maybeSingle };
  return { mockSupabase: { from: vi.fn(() => chain) }, maybeSingle };
});

vi.mock('../../modules/supabaseServer', () => ({ getSupabase: vi.fn(() => mockSupabase) }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

import avatarPngRouter from '../avatarPng';

const app = express();
// Neutral prefix: this sandbox's network layer intercepts `/api/avatar/png/*`.
app.use('/avatar-png', avatarPngRouter);

const ID = '537a9da1-baee-4a94-b302-dbc97c9a16c2';
const CONFIG = { base: 'diamond', eyes: 'dizzy', hair: 'pigtails', mouth: 'flat', bgColor: '#60A5FA', accessory: 'glasses', hairColor: '#B91C1C', skinColor: '#D08B5B', accessoryColor: '#8B5CF6' };

describe('GET /api/avatar/png/:playerId', () => {
  it('renders the stored avatar_config to a cacheable PNG', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { avatar_config: CONFIG } });
    const res = await request(app).get(`/avatar-png/${ID}`).buffer(true);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cache-control']).toContain('s-maxage');
    expect((res.body as Buffer).subarray(1, 4).toString()).toBe('PNG');
  }, 30000);

  it('404s when the player has no config', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { avatar_config: null } });
    expect((await request(app).get(`/avatar-png/${ID}`)).status).toBe(404);
  });

  it('400s on a non-uuid id', async () => {
    expect((await request(app).get('/avatar-png/guest')).status).toBe(400);
  });
});
