import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const h = vi.hoisted(() => {
  const calls: Array<{ eqs: Array<[string, unknown]>; isNull: string[] }> = [];
  const state = { row: null as Record<string, unknown> | null };
  const supabase = {
    from() {
      const c = { eqs: [] as Array<[string, unknown]>, isNull: [] as string[] };
      calls.push(c);
      const b = {
        select() { return b; },
        eq(col: string, v: unknown) { c.eqs.push([col, v]); return b; },
        is(col: string, v: unknown) { if (v === null) c.isNull.push(col); return b; },
        maybeSingle: async () => ({ data: state.row, error: null }),
      };
      return b;
    },
  };
  return { calls, state, supabase };
});

vi.mock('../../../modules/supabaseServer', () => ({
  getSupabase: () => h.supabase,
  isSupabaseConfigured: () => true,
}));

import router from '../wordWheelRoutes';

const app = express();
app.use(express.json());
app.use('/', router);

beforeEach(() => {
  h.calls.length = 0;
  h.state.row = { words_found: ['cat', 'tack'], score: 40, word_count: 2, display_name: 'Zigzag' };
});

describe('word wheel words lookup', () => {
  it('finds a guest by fingerprint, never matching an authed row', async () => {
    const res = await request(app).post('/words/2026-10-23/en').send({ guestFingerprint: 'fp-1' });

    expect(res.status).toBe(200);
    expect(res.body.wordsFound).toEqual(['cat', 'tack']);
    expect(h.calls[0].eqs).toContainEqual(['guest_fingerprint', 'fp-1']);
    expect(h.calls[0].isNull).toEqual(['player_id']);
  });

  it('rejects a missing fingerprint', async () => {
    const res = await request(app).post('/words/2026-10-23/en').send({});
    expect(res.status).toBe(400);
  });

  it('still serves authed players by id', async () => {
    const res = await request(app).get('/words/2026-10-23/en/user-1');
    expect(res.status).toBe(200);
    expect(h.calls[0].eqs).toContainEqual(['player_id', 'user-1']);
  });
});
