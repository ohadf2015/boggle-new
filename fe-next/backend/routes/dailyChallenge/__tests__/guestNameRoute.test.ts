import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const h = vi.hoisted(() => {
  process.env.GUEST_COOKIE_SECRET = 'test-guest-secret';
  type Update = { table: string; values: Record<string, unknown>; eqs: Array<[string, unknown]>; isNull: string[] };
  const updates: Update[] = [];
  const state = { error: null as unknown };
  const supabase = {
    from(table: string) {
      return {
        update(values: Record<string, unknown>) {
          const u: Update = { table, values, eqs: [], isNull: [] };
          updates.push(u);
          const b = {
            eq(col: string, v: unknown) { u.eqs.push([col, v]); return b; },
            is(col: string, v: unknown) { if (v === null) u.isNull.push(col); return b; },
            then(resolve: (r: { error: unknown }) => void) { resolve({ error: state.error }); },
          };
          return b;
        },
      };
    },
  };
  return { updates, state, supabase };
});

vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => h.supabase,
  isSupabaseConfigured: () => true,
}));

import { renameGuestDailyName } from '../guestNameRoutes';
import { GUEST_COOKIE, setGuestCookie } from '@/lib/auth/guestCookie';

function signedGuestCookie(uuid: string): string {
  let token = '';
  setGuestCookie({ cookies: { set: (_n: string, v: string) => { token = v; } } } as never, uuid);
  return `other=1; ${GUEST_COOKIE}=${token}`;
}

const app = express();
app.use(express.json());
app.post('/guest-name', renameGuestDailyName);

beforeEach(() => {
  h.updates.length = 0;
  h.state.error = null;
});

describe('POST /guest-name', () => {
  it('renames every guest row of the fingerprint in both daily tables', async () => {
    const res = await request(app).post('/guest-name').send({ guestFingerprint: 'fp-1', displayName: '  Zigzag  ' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ displayName: 'Zigzag' });
    expect(h.updates.map((u) => u.table).sort()).toEqual(['daily_word_hunt_attempts', 'daily_word_wheel_attempts']);
    for (const u of h.updates) {
      expect(u.values).toEqual({ display_name: 'Zigzag' });
      expect(u.eqs).toEqual([['guest_fingerprint', 'fp-1']]);
      expect(u.isNull).toEqual(['player_id']);
    }
  });

  it('rejects a missing fingerprint', async () => {
    const res = await request(app).post('/guest-name').send({ displayName: 'Zigzag' });
    expect(res.status).toBe(400);
    expect(h.updates).toHaveLength(0);
  });

  it('rejects a name that is empty after sanitizing', async () => {
    const res = await request(app).post('/guest-name').send({ guestFingerprint: 'fp-1', displayName: ' \u0007 ' });
    expect(res.status).toBe(400);
    expect(h.updates).toHaveLength(0);
  });

  it('rejects a profane name', async () => {
    const res = await request(app).post('/guest-name').send({ guestFingerprint: 'fp-1', displayName: 'shit' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('profane');
    expect(h.updates).toHaveLength(0);
  });

  it('rejects a generated default name', async () => {
    const res = await request(app).post('/guest-name').send({ guestFingerprint: 'fp-1', displayName: 'sneaky  potato 2' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('default_name');
    expect(h.updates).toHaveLength(0);
  });

  it('reports a db failure instead of claiming success', async () => {
    h.state.error = { message: 'boom' };
    const res = await request(app).post('/guest-name').send({ guestFingerprint: 'fp-1', displayName: 'Zigzag' });
    expect(res.status).toBe(500);
  });

  it('renames the Word Tower rows keyed on the tower fingerprint when one is sent', async () => {
    const res = await request(app).post('/guest-name').send({ guestFingerprint: 'fp-1', towerFingerprint: 'tw-1', displayName: 'Zigzag' });
    expect(res.status).toBe(200);
    const tower = h.updates.filter((u) => u.table === 'daily_word_tower_attempts');
    expect(tower).toHaveLength(1);
    expect(tower[0].values).toEqual({ display_name: 'Zigzag' });
    expect(tower[0].eqs).toEqual([['guest_fingerprint', 'tw-1']]);
    expect(tower[0].isNull).toEqual(['player_id']);
  });

  it('renames the Word Bridge rows keyed on the signed guest cookie, never a body value', async () => {
    const res = await request(app)
      .post('/guest-name')
      .set('Cookie', signedGuestCookie('11111111-2222-3333-4444-555555555555'))
      .send({ guestFingerprint: 'fp-1', displayName: 'Zigzag' });
    expect(res.status).toBe(200);
    const bridge = h.updates.filter((u) => u.table === 'connections_daily_scores');
    expect(bridge).toHaveLength(1);
    expect(bridge[0].values).toEqual({ display_name: 'Zigzag' });
    expect(bridge[0].eqs).toEqual([['guest_fingerprint', '11111111-2222-3333-4444-555555555555']]);
    expect(bridge[0].isNull).toEqual(['player_id']);
  });

  it('skips Word Bridge when the guest cookie is forged', async () => {
    const res = await request(app)
      .post('/guest-name')
      .set('Cookie', `${GUEST_COOKIE}=g1.someone-else.bad-signature`)
      .send({ guestFingerprint: 'fp-1', displayName: 'Zigzag' });
    expect(res.status).toBe(200);
    expect(h.updates.map((u) => u.table)).not.toContain('connections_daily_scores');
  });
});
