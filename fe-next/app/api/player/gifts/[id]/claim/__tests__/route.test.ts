import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Gift Claim API Route Tests
 *
 * Money-path coverage for /api/player/gifts/[id]/claim. The route delegates
 * the actual credit to the `claim_admin_gift` DB function (atomic, single
 * source of truth for awarding XP/coins) and must NOT re-award on its own if
 * that function reports the gift as already claimed.
 */

vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data, init) => ({
      json: async () => data,
      status: init?.status ?? 200,
      data,
    })),
  },
}));

const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockCreateRequestClient = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createRequestClient: (...args: unknown[]) => mockCreateRequestClient(...args),
}));

const mockCaptureApiError = vi.fn();
vi.mock('@/utils/sentry', () => ({
  captureApiError: (...args: unknown[]) => mockCaptureApiError(...args),
}));

import { POST } from '../route';

const USER_ID = 'user-1';
const GIFT_ID = 'gift-abc';

function makeRequest() {
  return {} as never;
}

function makeParams(id: string = GIFT_ID) {
  return Promise.resolve({ id });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateRequestClient.mockResolvedValue({
    supabase: { auth: { getUser: mockGetUser }, rpc: mockRpc },
    token: 'test-token',
  });
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
});

describe('POST /api/player/gifts/[id]/claim', () => {
  describe('Authentication', () => {
    it('returns 401 when there is no authenticated user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const res = await POST(makeRequest(), { params: makeParams() });

      expect(res.status).toBe(401);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('returns 401 when auth lookup errors', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad token' } });

      const res = await POST(makeRequest(), { params: makeParams() });

      expect(res.status).toBe(401);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('RPC wiring', () => {
    it('calls claim_admin_gift with the gift id from route params', async () => {
      mockRpc.mockResolvedValue({ data: { success: true, xp_awarded: 10, coins_awarded: 5 }, error: null });

      await POST(makeRequest(), { params: makeParams('gift-xyz') });

      expect(mockRpc).toHaveBeenCalledWith('claim_admin_gift', { gift_id: 'gift-xyz' });
    });
  });

  describe('Database errors', () => {
    it('returns 500 and reports to sentry when the rpc call errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'db exploded' } });

      const res = await POST(makeRequest(), { params: makeParams() });
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to claim gift');
      expect(mockCaptureApiError).toHaveBeenCalled();
    });
  });

  describe('Business rejection', () => {
    it('returns 400 without awarding anything when the rpc reports success:false', async () => {
      mockRpc.mockResolvedValue({ data: { success: false, xp_awarded: 0, coins_awarded: 0 }, error: null });

      const res = await POST(makeRequest(), { params: makeParams() });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBeUndefined();
      expect(body.xpAwarded).toBeUndefined();
      expect(body.coinsAwarded).toBeUndefined();
    });
  });

  describe('Happy path', () => {
    it('returns 200 with the awarded xp and coins on a fresh claim', async () => {
      mockRpc.mockResolvedValue({ data: { success: true, xp_awarded: 25, coins_awarded: 100 }, error: null });

      const res = await POST(makeRequest(), { params: makeParams() });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ success: true, xpAwarded: 25, coinsAwarded: 100 });
    });
  });

  describe('Idempotency (double-claim / double-credit protection)', () => {
    it('rejects a second claim of the same gift with 400 instead of crediting it twice', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: true, xp_awarded: 25, coins_awarded: 100 }, error: null });
      const first = await POST(makeRequest(), { params: makeParams() });
      const firstBody = await first.json();
      expect(first.status).toBe(200);
      expect(firstBody.coinsAwarded).toBe(100);

      // Second claim: the DB function is the source of truth for "already claimed"
      // and must flip success:false — the route must not re-derive its own award.
      mockRpc.mockResolvedValueOnce({ data: { success: false, xp_awarded: 0, coins_awarded: 0 }, error: null });
      const second = await POST(makeRequest(), { params: makeParams() });
      const secondBody = await second.json();

      expect(second.status).toBe(400);
      expect(secondBody.coinsAwarded).toBeUndefined();
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });

    it('never returns 200 when the rpc reports success:false, even if xp/coins fields are nonzero', async () => {
      // Guards against a route regression that trusts the awarded amounts
      // instead of the success flag (would silently double-credit on retry).
      mockRpc.mockResolvedValue({ data: { success: false, xp_awarded: 25, coins_awarded: 100 }, error: null });

      const res = await POST(makeRequest(), { params: makeParams() });

      expect(res.status).toBe(400);
    });
  });

  describe('Unexpected errors', () => {
    it('returns 500 when an unexpected exception is thrown', async () => {
      mockCreateRequestClient.mockRejectedValue(new Error('boom'));

      const res = await POST(makeRequest(), { params: makeParams() });
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Internal server error');
    });
  });
});
