/**
 * POST /api/player/gifts/[id]/claim
 *
 * Tests the contract the route actually has: one atomic `claim_admin_gift`
 * RPC (gift_id only). The SQL function credits XP/coins itself and returns
 * `{ success:false, error:'Gift not found, already claimed, or not yours' }`
 * for missing / already-claimed / wrong-owner. The route must not grant on
 * that payload, must not grant on an RPC error, and must not credit twice.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockAwardCoinsServer = vi.fn();
const mockCreateRequestClient = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createRequestClient: (...args: unknown[]) => mockCreateRequestClient(...args),
}));

vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

vi.mock('@/backend/services/economy/awardCoins', () => ({
  awardCoinsServer: (...args: unknown[]) => mockAwardCoinsServer(...args),
}));

import { POST } from '../route';

const USER = 'player-1';
const OTHER = 'player-2';
const GIFT = 'gift-owned-unclaimed';
const XP = 100;
const COINS = 50;
const RPC_NOT_YOURS = 'Gift not found, already claimed, or not yours';

type GiftRow = {
  owner: string;
  claimed: boolean;
  xp_amount: number;
  coin_amount: number;
};

/** In-memory stand-in for admin_gift_messages + claim_admin_gift. */
let gifts: Record<string, GiftRow> = {};
let currentUserId: string | null = USER;

function seedGifts() {
  gifts = {
    [GIFT]: { owner: USER, claimed: false, xp_amount: XP, coin_amount: COINS },
    'gift-already-claimed': {
      owner: USER,
      claimed: true,
      xp_amount: XP,
      coin_amount: COINS,
    },
    'gift-wrong-owner': {
      owner: OTHER,
      claimed: false,
      xp_amount: 999,
      coin_amount: 999,
    },
  };
}

function claimAdminGiftRpc(giftId: string) {
  const row = gifts[giftId];
  if (!row || row.owner !== currentUserId || row.claimed) {
    return {
      data: { success: false, error: RPC_NOT_YOURS },
      error: null,
    };
  }
  row.claimed = true;
  return {
    data: {
      success: true,
      xp_awarded: row.xp_amount,
      coins_awarded: row.coin_amount,
      badge_id: null,
      badge_awarded: false,
    },
    error: null,
  };
}

function attachClient() {
  mockCreateRequestClient.mockResolvedValue({
    token: 'test-token',
    supabase: {
      auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
      rpc: (...args: unknown[]) => mockRpc(...args),
    },
  });
}

async function claim(giftId: string) {
  const req = {} as NextRequest;
  return POST(req, { params: Promise.resolve({ id: giftId }) });
}

async function grantedCoins(res: Response): Promise<number> {
  if (res.status !== 200) return 0;
  const body = (await res.json()) as { success?: boolean; coinsAwarded?: number };
  if (body.success !== true) return 0;
  return Number(body.coinsAwarded) || 0;
}

beforeEach(() => {
  vi.clearAllMocks();
  seedGifts();
  currentUserId = USER;
  attachClient();
  mockGetUser.mockResolvedValue({
    data: { user: { id: USER } },
    error: null,
  });
  mockRpc.mockImplementation(async (name: string, args: { gift_id?: string }) => {
    if (name !== 'claim_admin_gift') {
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    }
    return claimAdminGiftRpc(String(args?.gift_id));
  });
});

describe('POST /api/player/gifts/[id]/claim', () => {
  it('401 when unauthenticated — does not call claim_admin_gift', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'no auth' },
    });
    const res = await claim(GIFT);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockAwardCoinsServer).not.toHaveBeenCalled();
  });

  it('calls claim_admin_gift with the path gift_id and no extra credit path', async () => {
    const res = await claim(GIFT);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      xpAwarded: XP,
      coinsAwarded: COINS,
    });
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('claim_admin_gift', { gift_id: GIFT });
    expect(mockAwardCoinsServer).not.toHaveBeenCalled();
  });

  it('does not credit twice — a second claim of the same gift is refused', async () => {
    const first = await claim(GIFT);
    const second = await claim(GIFT);

    expect(first.status).toBe(200);
    expect(await grantedCoins(first)).toBe(COINS);
    expect(second.status).toBe(400);
    expect(await second.json()).toEqual({ error: 'Cannot claim gift' });
    expect(gifts[GIFT].claimed).toBe(true);
    expect(mockRpc.mock.calls).toEqual([
      ['claim_admin_gift', { gift_id: GIFT }],
      ['claim_admin_gift', { gift_id: GIFT }],
    ]);
    expect(mockAwardCoinsServer).not.toHaveBeenCalled();
  });

  it('400 already-claimed — does not grant', async () => {
    const res = await claim('gift-already-claimed');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Cannot claim gift' });
    expect(mockAwardCoinsServer).not.toHaveBeenCalled();
  });

  it('400 wrong-owner — does not grant the other player coins', async () => {
    const res = await claim('gift-wrong-owner');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Cannot claim gift' });
    expect(gifts['gift-wrong-owner'].claimed).toBe(false);
    expect(mockAwardCoinsServer).not.toHaveBeenCalled();
  });

  it('400 missing gift — does not grant', async () => {
    const res = await claim('gift-does-not-exist');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Cannot claim gift' });
    expect(mockAwardCoinsServer).not.toHaveBeenCalled();
  });

  it('does not grant on an RPC error response', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'db down' },
    });
    const res = await claim(GIFT);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to claim gift' });
    expect(gifts[GIFT].claimed).toBe(false);
    expect(mockAwardCoinsServer).not.toHaveBeenCalled();
  });

  it('does not grant when the RPC returns success:false with amounts still in the payload', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        success: false,
        error: RPC_NOT_YOURS,
        xp_awarded: 999,
        coins_awarded: 999,
      },
      error: null,
    });
    const res = await claim(GIFT);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Cannot claim gift' });
  });
});
