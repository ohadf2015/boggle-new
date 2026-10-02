import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const h = vi.hoisted(() => {
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

  it('reports a db failure instead of claiming success', async () => {
    h.state.error = { message: 'boom' };
    const res = await request(app).post('/guest-name').send({ guestFingerprint: 'fp-1', displayName: 'Zigzag' });
    expect(res.status).toBe(500);
  });
});
