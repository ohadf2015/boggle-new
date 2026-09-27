import { describe, it, expect, vi, beforeEach } from 'vitest';

const sameOrigin = { v: true };
const adminOk = { v: true };
const { promote, awardCoins } = vi.hoisted(() => ({
  promote: vi.fn(async () => undefined),
  awardCoins: vi.fn(async () => ({ success: true, newBalance: 100 })),
}));

vi.mock('@/lib/auth/sameOrigin', () => ({ isSameOrigin: () => sameOrigin.v }));
vi.mock('@/lib/auth/adminAuth', () => ({
  verifyAdminAuth: async () =>
    adminOk.v ? { success: true, user: { id: 'admin-1' } } : { success: false, response: new Response('no', { status: 401 }) },
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));
vi.mock('@/backend/modules/wordPromotion', () => ({ promoteWordToScores: promote }));
vi.mock('@/backend/services/economy/awardCoins', () => ({ awardCoinsServer: awardCoins }));

const state = {
  proposal: null as Record<string, unknown> | null,
  points: 45,
};
const cap = { updates: [] as Array<{ table: string; patch: Record<string, unknown> }>, upserts: [] as Array<{ table: string; rows: unknown }> };

function dataFor(table: string) {
  if (table === 'curator_proposals') return state.proposal;
  if (table === 'curator_language_assignments') return { curator_points: state.points };
  if (table === 'connections_puzzles') return { word1: 'a', bridge: 'b', word2: 'c' };
  return null;
}
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.single = async () => ({ data: dataFor(table), error: null });
      (b as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve({ data: dataFor(table), error: null });
      b.update = (patch: Record<string, unknown>) => {
        cap.updates.push({ table, patch });
        return b;
      };
      b.upsert = (rows: unknown) => {
        cap.upserts.push({ table, rows });
        return b;
      };
      return b;
    },
  }),
}));

import { POST } from '../route';

type Ctx = { params: Promise<{ id: string }> };
function req(body: unknown = {}): Request {
  return new Request('http://localhost/api/admin/curator-proposals/p1/ratify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
const ctx = (): Ctx => ({ params: Promise.resolve({ id: 'p1' }) });
const proposal = (o = {}) => ({
  id: 'p1',
  curator_id: 'cur-1',
  language: 'he',
  kind: 'word_approve',
  target_ref: 'שלום',
  payload: {},
  status: 'proposed',
  ...o,
});

beforeEach(() => {
  sameOrigin.v = true;
  adminOk.v = true;
  state.proposal = proposal();
  state.points = 45;
  cap.updates = [];
  cap.upserts = [];
  promote.mockClear();
  awardCoins.mockClear();
});

describe('POST /api/admin/curator-proposals/[id]/ratify', () => {
  it('rejects cross-origin (403)', async () => {
    sameOrigin.v = false;
    const res = await POST(req(), ctx());
    expect(res.status).toBe(403);
    expect(promote).not.toHaveBeenCalled();
  });

  it('rejects a non-admin (401)', async () => {
    adminOk.v = false;
    const res = await POST(req(), ctx());
    expect(res.status).toBe(401);
  });

  it('404 when the proposal does not exist', async () => {
    state.proposal = null;
    const res = await POST(req(), ctx());
    expect(res.status).toBe(404);
  });

  it('is idempotent: an already-ratified proposal applies no effect', async () => {
    state.proposal = proposal({ status: 'ratified' });
    const res = await POST(req(), ctx());
    expect(res.status).toBe(200);
    expect(promote).not.toHaveBeenCalled();
    expect(cap.updates).toHaveLength(0);
  });

  it('ratifies a word_approve: promotes the word, bumps points, marks ratified', async () => {
    const res = await POST(req(), ctx());
    expect(res.status).toBe(200);
    // effect
    expect(promote).toHaveBeenCalledWith(expect.anything(), 'שלום', 'he', {
      votes: expect.any(Number),
      submitter: 'admin_approved',
    });
    // points: 45 -> 55 (word_approve = 10)
    const pointsBump = cap.updates.find((u) => u.table === 'curator_language_assignments');
    expect(pointsBump?.patch.curator_points).toBe(55);
    // proposal finalised
    const propUpdate = cap.updates.find((u) => u.table === 'curator_proposals');
    expect(propUpdate?.patch.status).toBe('ratified');
    expect(propUpdate?.patch.reward_granted).toBe(true);
    expect(propUpdate?.patch.points_awarded).toBe(10);
    // coin milestone crossed (45->55 passes 50) → best-effort grant
    expect(awardCoins).toHaveBeenCalled();
    const json = await res.json();
    expect(json.points).toBe(10);
  });

  it('rejects a proposal when decision=reject (no effect, status rejected)', async () => {
    const res = await POST(req({ decision: 'reject' }), ctx());
    expect(res.status).toBe(200);
    expect(promote).not.toHaveBeenCalled();
    const propUpdate = cap.updates.find((u) => u.table === 'curator_proposals');
    expect(propUpdate?.patch.status).toBe('rejected');
  });

  it('still succeeds (200) when the best-effort coin grant throws', async () => {
    awardCoins.mockRejectedValueOnce(new Error('economy down'));
    const res = await POST(req(), ctx());
    expect(res.status).toBe(200);
    // points + ratification still applied
    const propUpdate = cap.updates.find((u) => u.table === 'curator_proposals');
    expect(propUpdate?.patch.reward_granted).toBe(true);
  });

  it('writes a connections review for a ratified puzzle_verdict', async () => {
    state.proposal = proposal({ kind: 'puzzle_verdict', target_ref: 'he-o-006', payload: { verdict: 'bad', note: 'off' } });
    const res = await POST(req(), ctx());
    expect(res.status).toBe(200);
    const review = cap.upserts.find((u) => u.table === 'connections_puzzle_reviews');
    expect(review).toBeTruthy();
    const rows = review!.rows as Record<string, unknown>;
    expect(rows.verdict).toBe('bad');
    expect(promote).not.toHaveBeenCalled();
  });
});
