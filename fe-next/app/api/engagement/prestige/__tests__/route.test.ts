import { vi, type Mock, } from 'vitest';
// @ts-nocheck
/**
 * Prestige API Route Tests
 *
 * Covers auth, eligibility, happy path with atomic RPC,
 * race condition protection (409), rewards, edge cases, and DB errors.
 */

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

// Mock rate limiter — always allow
vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({ success: true }),
}));

// Mock Sentry
vi.mock('@/utils/sentry', () => ({
  captureApiError: vi.fn(),
}));

// Mock supabase
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: () => ({
      select: (...args: unknown[]) => mockSelect(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    }),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

import { GET, POST } from '../route';
import { PRESTIGE_CONFIG } from '@/backend/modules/xpManager';
import { NextRequest } from 'next/server';

// ---------- Helpers ----------

function makeRequest(): NextRequest {
  return {} as unknown as NextRequest;
}

function authAs(userId = 'user-1') {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
}

function authFail() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
}

function mockProfile(overrides: Record<string, unknown> = {}) {
  const profile = {
    current_level: 100,
    prestige_level: 0,
    prestige_multiplier: 1.0,
    prestige_unlocks: [],
    total_xp: 50000,
    lifetime_xp: 50000,
    ...overrides,
  };
  mockSelect.mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: profile, error: null }),
    }),
  });
  return profile;
}

function mockProfileError(error = { message: 'DB down' }) {
  mockSelect.mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: null, error }),
    }),
  });
}

function mockRpcSuccess(prestige = 1) {
  const multipliers = PRESTIGE_CONFIG.MULTIPLIERS;
  mockRpc.mockResolvedValue({
    data: [{
      new_prestige_level: prestige,
      new_multiplier: multipliers[prestige],
      new_title: PRESTIGE_CONFIG.TITLES[prestige] || null,
      rows_affected: 1,
    }],
    error: null,
  });
  // Mock the follow-up update for prestige_unlocks
  mockUpdate.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
}

function mockRpcRaceCondition() {
  mockRpc.mockResolvedValue({
    data: [{
      new_prestige_level: 1,
      new_multiplier: 1.05,
      new_title: 'ASCENDED_ONE',
      rows_affected: 0, // Lock failed — someone else prestiged first
    }],
    error: null,
  });
}

function mockRpcError(error = { message: 'RPC failed' }) {
  mockRpc.mockResolvedValue({ data: null, error });
}

// ---------- Tests ----------

describe('GET /api/engagement/prestige', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    authFail();
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 404 when profile not found', async () => {
    authAs();
    mockProfileError();
    const res = await GET(makeRequest());
    expect(res.status).toBe(404);
  });

  it('returns prestige status for eligible player', async () => {
    authAs();
    mockProfile({ current_level: 100, prestige_level: 0, total_xp: 50000 });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(res.data.canPrestige).toBe(true);
    expect(res.data.currentLevel).toBe(100);
    expect(res.data.prestigeLevel).toBe(0);
    expect(res.data.maxPrestige).toBe(PRESTIGE_CONFIG.MAX_PRESTIGE);
    expect(res.data.nextPrestigeRewards.length).toBeGreaterThan(0);
  });

  it('returns canPrestige false for low-level player', async () => {
    authAs();
    mockProfile({ current_level: 50, prestige_level: 0 });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(res.data.canPrestige).toBe(false);
  });

  it('returns canPrestige false at max prestige', async () => {
    authAs();
    mockProfile({ current_level: 100, prestige_level: PRESTIGE_CONFIG.MAX_PRESTIGE });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(res.data.canPrestige).toBe(false);
    expect(res.data.nextPrestigeRewards).toEqual([]);
  });

  it('defaults null fields gracefully', async () => {
    authAs();
    mockProfile({
      current_level: null,
      prestige_level: null,
      prestige_multiplier: null,
      total_xp: null,
      lifetime_xp: null,
      prestige_unlocks: null,
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(res.data.currentLevel).toBe(1);
    expect(res.data.prestigeLevel).toBe(0);
    expect(res.data.prestigeMultiplier).toBe(1.0);
    expect(res.data.totalXp).toBe(0);
    expect(res.data.unlockedRewards).toEqual([]);
  });
});

describe('POST /api/engagement/prestige', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== AUTH =====
  describe('Authentication', () => {
    it('rejects unauthenticated requests with 401', async () => {
      authFail();
      const res = await POST(makeRequest());
      expect(res.status).toBe(401);
    });
  });

  // ===== ELIGIBILITY =====
  describe('Eligibility checks', () => {
    it('returns 400 if level too low', async () => {
      authAs();
      mockProfile({ current_level: 50, prestige_level: 0 });
      const res = await POST(makeRequest());
      expect(res.status).toBe(400);
      expect(res.data.error).toContain(`level ${PRESTIGE_CONFIG.REQUIRED_LEVEL}`);
    });

    it('returns 400 if already at max prestige', async () => {
      authAs();
      mockProfile({ current_level: 100, prestige_level: PRESTIGE_CONFIG.MAX_PRESTIGE });
      const res = await POST(makeRequest());
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('maximum prestige');
    });
  });

  // ===== HAPPY PATH =====
  describe('Happy path', () => {
    it('prestige from level 100, prestige 0 -> prestige 1 via atomic RPC', async () => {
      authAs();
      mockProfile({ current_level: 100, prestige_level: 0, total_xp: 50000, lifetime_xp: 50000 });
      mockRpcSuccess(1);

      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.newPrestigeLevel).toBe(1);
      expect(res.data.newMultiplier).toBe(PRESTIGE_CONFIG.MULTIPLIERS[1]);
      expect(res.data.rewards.length).toBeGreaterThan(0);
      expect(res.data.message).toContain('Prestige I');

      // Verify RPC was called with correct params
      expect(mockRpc).toHaveBeenCalledWith('apply_prestige', {
        p_player_id: 'user-1',
        p_expected_prestige: 0,
      });
    });

    it('prestige increments from prestige 2 to 3', async () => {
      authAs();
      mockProfile({ current_level: 100, prestige_level: 2 });
      mockRpcSuccess(3);

      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(res.data.newPrestigeLevel).toBe(3);
      expect(res.data.newMultiplier).toBe(PRESTIGE_CONFIG.MULTIPLIERS[3]);
      expect(res.data.message).toContain('III');
    });

    it('updates prestige_unlocks after successful RPC', async () => {
      authAs();
      mockProfile({ current_level: 100, prestige_level: 0, prestige_unlocks: [] });
      mockRpcSuccess(1);

      await POST(makeRequest());

      // Verify follow-up update was called to save unlocks
      const updatePayload = mockUpdate.mock.calls[0][0];
      expect(updatePayload.prestige_unlocks).toBeDefined();
      expect(updatePayload.prestige_unlocks.length).toBeGreaterThan(0);
      expect(updatePayload.prestige_unlocks[0].prestigeLevel).toBe(1);
    });
  });

  // ===== REWARD TIERS =====
  describe('Reward tiers', () => {
    it.each([0, 1, 2, 3, 4])('prestige %i -> %i returns correct rewards', async (fromPrestige) => {
      authAs();
      mockProfile({ current_level: 100, prestige_level: fromPrestige });
      mockRpcSuccess(fromPrestige + 1);

      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(res.data.newPrestigeLevel).toBe(fromPrestige + 1);
      expect(res.data.rewards.some((r: { type: string }) => r.type === 'title')).toBe(true);
    });
  });

  // ===== RACE CONDITION PROTECTION =====
  describe('Race condition protection (atomic RPC)', () => {
    it('returns 409 when optimistic lock fails (concurrent prestige)', async () => {
      authAs();
      mockProfile({ current_level: 100, prestige_level: 0 });
      mockRpcRaceCondition();

      const res = await POST(makeRequest());
      expect(res.status).toBe(409);
      expect(res.data.error).toContain('already applied');
    });

    it('does not update prestige_unlocks when RPC lock fails', async () => {
      authAs();
      mockProfile({ current_level: 100, prestige_level: 0 });
      mockRpcRaceCondition();

      await POST(makeRequest());

      // mockUpdate should NOT have been called (no unlock update)
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  // ===== EDGE CASES =====
  describe('Edge cases', () => {
    it('prestige at exactly minimum level (100)', async () => {
      authAs();
      mockProfile({ current_level: PRESTIGE_CONFIG.REQUIRED_LEVEL, prestige_level: 0 });
      mockRpcSuccess(1);

      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it('prestige at level 99 is rejected', async () => {
      authAs();
      mockProfile({ current_level: PRESTIGE_CONFIG.REQUIRED_LEVEL - 1, prestige_level: 0 });
      const res = await POST(makeRequest());
      expect(res.status).toBe(400);
    });

    it('prestige from max-1 to max prestige succeeds', async () => {
      authAs();
      mockProfile({ current_level: 100, prestige_level: PRESTIGE_CONFIG.MAX_PRESTIGE - 1 });
      mockRpcSuccess(PRESTIGE_CONFIG.MAX_PRESTIGE);

      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(res.data.newPrestigeLevel).toBe(PRESTIGE_CONFIG.MAX_PRESTIGE);
    });

    it('appends new rewards to existing prestige_unlocks', async () => {
      const existingUnlocks = [{ prestigeLevel: 1, type: 'title', value: 'ASCENDED_ONE', unlockedAt: '2026-01-01' }];
      authAs();
      mockProfile({ current_level: 100, prestige_level: 1, prestige_unlocks: existingUnlocks });
      mockRpcSuccess(2);

      await POST(makeRequest());

      const updatePayload = mockUpdate.mock.calls[0][0];
      expect(updatePayload.prestige_unlocks.length).toBeGreaterThan(existingUnlocks.length);
      // Existing unlock preserved
      expect(updatePayload.prestige_unlocks[0]).toEqual(existingUnlocks[0]);
    });
  });

  // ===== DB ERRORS =====
  describe('Database errors', () => {
    it('returns 404 on profile fetch failure', async () => {
      authAs();
      mockProfileError();
      const res = await POST(makeRequest());
      expect(res.status).toBe(404);
    });

    it('returns 500 on RPC failure', async () => {
      authAs();
      mockProfile({ current_level: 100, prestige_level: 0 });
      mockRpcError();

      const res = await POST(makeRequest());
      expect(res.status).toBe(500);
      expect(res.data.error).toContain('Failed to apply prestige');
    });
  });
});
