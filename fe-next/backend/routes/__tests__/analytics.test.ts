/**
 * Analytics API Route Tests — /api/analytics/track
 *
 * Security focus: player identity (player_id + metadata.userId/username) must be
 * derived SERVER-SIDE from a verified bearer token, never trusted from the
 * client body. The admin game log renders these as real player attributions, so
 * a spoofable field = forged attribution + arbitrary-name injection into admin UI.
 *
 * NOTE: supertest does not drive Express 5 handlers in this backend vitest config
 * (see the describe.skip'd supertest route tests). We invoke the route handler
 * directly with mock req/res instead — exercises the exact same code path.
 *
 * TDD: tests written before the server-side hardening.
 */

import { vi } from 'vitest';

// ---- Capture the row handed to .insert() ----
let lastInsert: Record<string, unknown> | null = null;

const mockAuthGetUser = vi.fn();

vi.mock('../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => ({
    auth: { getUser: mockAuthGetUser },
    from: vi.fn(() => ({
      insert: vi.fn((data: Record<string, unknown>) => {
        lastInsert = data;
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: 'evt-1' }, error: null })),
          })),
        };
      }),
    })),
  })),
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import analyticsRouter from '../analytics';

type RouteHandler = (req: unknown, res: unknown) => Promise<void> | void;

// Pull the POST /track handler straight off the router's layer stack.
const trackHandler: RouteHandler = (() => {
  const layer = (analyticsRouter as unknown as {
    stack: Array<{ route?: { path: string; stack: Array<{ handle: RouteHandler }> } }>;
  }).stack.find((l) => l.route?.path === '/track');
  if (!layer?.route) throw new Error('POST /track route not found on analytics router');
  return layer.route.stack[layer.route.stack.length - 1].handle;
})();

interface CallResult {
  status: number | null;
  body: Record<string, unknown> | null;
}

async function callTrack(opts: {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): Promise<CallResult> {
  const result: CallResult = { status: null, body: null };
  const res = {
    headersSent: false,
    status(code: number) {
      result.status = code;
      this.headersSent = true;
      return this;
    },
    json(payload: Record<string, unknown>) {
      result.body = payload;
      return this;
    },
  };
  const req = {
    body: opts.body ?? {},
    headers: { 'user-agent': 'test-agent', ...(opts.headers ?? {}) },
  };
  await trackHandler(req, res);
  return result;
}

const insertedMeta = (): Record<string, unknown> =>
  (lastInsert?.metadata ?? {}) as Record<string, unknown>;

beforeEach(() => {
  lastInsert = null;
  mockAuthGetUser.mockReset();
});

describe('POST /api/analytics/track — identity is server-derived', () => {
  it('IGNORES a client-supplied player_id when there is no auth token (guest)', async () => {
    const r = await callTrack({ body: { event_type: 'game_completed', player_id: 'victim-uuid', session_id: 's1' } });

    expect(r.status).toBe(200);
    expect(lastInsert).not.toBeNull();
    expect(lastInsert!.player_id).toBeNull();
    expect(mockAuthGetUser).not.toHaveBeenCalled(); // no header → no needless round-trip
  });

  it('derives player_id from the VERIFIED token, ignoring the spoofed body value', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'real-uid' } }, error: null });

    await callTrack({
      body: { event_type: 'game_completed', player_id: 'victim-uuid' },
      headers: { authorization: 'Bearer good-token' },
    });

    expect(mockAuthGetUser).toHaveBeenCalledWith('good-token');
    expect(lastInsert!.player_id).toBe('real-uid');
  });

  it('falls back to guest (null) when the token is invalid, ignoring body player_id', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad jwt' } });

    await callTrack({
      body: { event_type: 'game_completed', player_id: 'victim-uuid' },
      headers: { authorization: 'Bearer forged' },
    });

    expect(lastInsert!.player_id).toBeNull();
  });

  it('strips client-supplied metadata.userId / username (anti name-injection)', async () => {
    await callTrack({
      body: {
        event_type: 'game_completed',
        player_id: 'victim-uuid',
        metadata: { userId: 'victim-uuid', username: '<b>EvilName</b>', gameMode: 'classic' },
      },
    });

    const m = insertedMeta();
    expect(m.username).toBeUndefined();
    expect(m.userId).toBeNull();
    expect(m.gameMode).toBe('classic'); // non-identity metadata is preserved
  });

  it('sets metadata.userId from the verified token for authed users', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'real-uid' } }, error: null });

    await callTrack({
      body: { event_type: 'game_completed', metadata: { username: 'spoof', gameMode: 'blast' } },
      headers: { authorization: 'Bearer good-token' },
    });

    const m = insertedMeta();
    expect(m.userId).toBe('real-uid');
    expect(m.username).toBeUndefined();
    expect(m.gameMode).toBe('blast');
  });

  it('still records guest events with guest_name preserved', async () => {
    const r = await callTrack({ body: { event_type: 'guest_join', guest_name: 'Bob', session_id: 'g1' } });

    expect(r.body).toEqual({ success: true, event_id: 'evt-1' });
    expect(lastInsert!.player_id).toBeNull();
    expect(insertedMeta().guest_name).toBe('Bob');
  });

  it('rejects a missing event_type with 400', async () => {
    const r = await callTrack({ body: { session_id: 's1' } });
    expect(r.status).toBe(400);
    expect(lastInsert).toBeNull();
  });
});
