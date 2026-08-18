// @ts-nocheck
/**
 * Gift claim payout.
 *
 * The route did not exist while the client was already POSTing to it, so every
 * admin gift was shown and never paid. These cover the two things that matter:
 * a claim credits coins + XP once, and a second claim credits nothing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })) },
}));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

const mockAwardCoins = vi.fn();
vi.mock('@/backend/services/economy/awardCoins', () => ({
  awardCoinsServer: (...a: unknown[]) => mockAwardCoins(...a),
}));

const mockGetAuthedUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: (...a: unknown[]) => mockGetAuthedUser(...a),
}));

const mockRpc = vi.fn();
/** Rows still unclaimed, keyed by id — the conditional UPDATE consumes them. */
let unclaimed: Record<string, { id: string; xp_amount: number; coin_amount: number }> = {};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    rpc: (...a: unknown[]) => mockRpc(...a),
    from: () => {
      const filters: Record<string, unknown> = {};
      let updating: Record<string, unknown> | null = null;
      const chain = {
        update(patch: Record<string, unknown>) { updating = patch; return chain; },
        select() { return chain; },
        eq(col: string, val: unknown) { filters[col] = val; return chain; },
        async maybeSingle() {
          const id = filters.id as string;
          if (updating && updating.claimed === true) {
            // The claim: only succeeds while the row is still unclaimed.
            if (filters.claimed === false && unclaimed[id]) {
              const row = unclaimed[id];
              delete unclaimed[id];
              return { data: row, error: null };
            }
            return { data: null, error: null };
          }
          // The "was it already claimed?" read.
          return { data: { id, claimed: !unclaimed[id] }, error: null };
        },
        then(resolve: (v: unknown) => void) { return Promise.resolve({ error: null }).then(resolve); },
      };
      return chain;
    },
  }),
}));

import { POST } from '../route';

const GIFT = 'gift-1';
const req = {} as never;
const params = { params: Promise.resolve({ id: GIFT }) };

beforeEach(() => {
  vi.clearAllMocks();
  unclaimed = { [GIFT]: { id: GIFT, xp_amount: 1000, coin_amount: 500 } };
  mockGetAuthedUser.mockResolvedValue({ id: 'player-1' });
  mockAwardCoins.mockResolvedValue({ success: true, newBalance: 1500 });
  mockRpc.mockResolvedValue({ data: [{ new_total_xp: 2000, new_level: 3 }], error: null });
});

describe('POST /api/player/gifts/[id]/claim', () => {
  it('credits the gift coins and XP', async () => {
    const res = await POST(req, params);
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ success: true, coinsAwarded: 500, xpAwarded: 1000 });
    expect(mockAwardCoins).toHaveBeenCalledWith('player-1', 500, 'admin_gift', { giftId: GIFT });
    expect(mockRpc).toHaveBeenCalledWith('increment_player_xp', { p_player_id: 'player-1', p_xp_amount: 1000 });
  });

  it('pays out once — a second claim credits nothing', async () => {
    await POST(req, params);
    mockAwardCoins.mockClear();
    mockRpc.mockClear();

    const again = await POST(req, params);
    expect(again.data).toMatchObject({ alreadyClaimed: true, coinsAwarded: 0, xpAwarded: 0 });
    expect(mockAwardCoins).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('refuses an unauthenticated caller', async () => {
    mockGetAuthedUser.mockResolvedValue(null);
    const res = await POST(req, params);
    expect(res.status).toBe(401);
    expect(mockAwardCoins).not.toHaveBeenCalled();
  });
});
