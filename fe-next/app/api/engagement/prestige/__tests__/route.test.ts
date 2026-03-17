// @ts-nocheck
/**
 * Prestige API Route Tests
 *
 * Covers auth, eligibility, happy path, rewards, edge cases,
 * race condition documentation, and DB error handling.
 */

// Mock next/server
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({ data, status: init?.status ?? 200 })),
  },
}));

// Mock rate limiter — always allow
jest.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: jest.fn().mockReturnValue({ success: true }),
}));

// Mock supabase
const mockGetUser = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: () => ({
      select: (...args: unknown[]) => mockSelect(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    }),
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
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: profile, error: null }),
    }),
  });
  return profile;
}

function mockProfileError(error = { message: 'DB down' }) {
  mockSelect.mockReturnValue({
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: null, error }),
    }),
  });
}

function mockUpdateSuccess() {
  mockUpdate.mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  });
}

function mockUpdateError(error = { message: 'update failed' }) {
  mockUpdate.mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error }),
  });
}

// ---------- Tests ----------

describe('GET /api/engagement/prestige', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    jest.clearAllMocks();
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

    it('returns 400 with generic message for other canPrestige failures', async () => {
      // Edge: level 1 and prestige 0 — level too low takes priority
      authAs();
      mockProfile({ current_level: 1, prestige_level: 0 });
      const res = await POST(makeRequest());
      expect(res.status).toBe(400);
    });
  });

  // ===== HAPPY PATH =====
  describe('Happy path', () => {
    it('prestige from level 100, prestige 0 -> prestige 1', async () => {
      authAs();
      mockProfile({ current_level: 100, prestige_level: 0, total_xp: 50000, lifetime_xp: 50000 });
      mockUpdateSuccess();

      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.newPrestigeLevel).toBe(1);
      expect(res.data.newMultiplier).toBe(PRESTIGE_CONFIG.MULTIPLIERS[1]);
      expect(res.data.rewards.length).toBeGreaterThan(0);
      expect(res.data.message).toContain('Prestige I');
    });

    it('prestige increments from prestige 2 to 3', async () => {
      authAs();
      mockProfile({ current_level: 100, prestige_level: 2 });
      mockUpdateSuccess();

      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(res.data.newPrestigeLevel).toBe(3);
      expect(res.data.newMultiplier).toBe(PRESTIGE_CONFIG.MULTIPLIERS[3]);
      expect(res.data.message).toContain('III');
    });

    it('update payload resets level to 1 and XP to 0', async () => {
      authAs();
      mockProfile({ current_level: 100, prestige_level: 0, total_xp: 99999, lifetime_xp: 99999 });
      mockUpdateSuccess();

      await POST(makeRequest());

      // Verify the update call payload
      const updatePayload = mockUpdate.mock.calls[0][0];
      expect(updatePayload.current_level).toBe(1);
      expect(updatePayload.total_xp).toBe(0);
      expect(updatePayload.lifetime_xp).toBe(99999); // preserved
      expect(updatePayload.prestige_level).toBe(1);
      expect(updatePayload.player_title).toBe(PRESTIGE_CONFIG.TITLES[1]);
    });
  });

  // ===== REWARD TIERS =====
  describe('Reward tiers', () => {
    it.each([0, 1, 2, 3, 4])('prestige %i -> %i returns correct rewards', async (fromPrestige) => {
      authAs();
      mockProfile({ current_level: 100, prestige_level: fromPrestige });
      mockUpdateSuccess();

      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(res.data.newPrestigeLevel).toBe(fromPrestige + 1);
      // Each prestige level should grant at least a title reward
      expect(res.data.rewards.some((r: { type: string }) => r.type === 'title')).toBe(true);
    });
  });

  // ===== EDGE CASES =====
  describe('Edge cases', () => {
    it('prestige at exactly minimum level (100)', async () => {
      authAs();
      mockProfile({ current_level: PRESTIGE_CONFIG.REQUIRED_LEVEL, prestige_level: 0 });
      mockUpdateSuccess();

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
      mockUpdateSuccess();

      const res = await POST(makeRequest());
      expect(res.status).toBe(200);
      expect(res.data.newPrestigeLevel).toBe(PRESTIGE_CONFIG.MAX_PRESTIGE);
    });

    it('appends new rewards to existing prestige_unlocks', async () => {
      const existingUnlocks = [{ prestigeLevel: 1, type: 'title', value: 'ASCENDED_ONE', unlockedAt: '2026-01-01' }];
      authAs();
      mockProfile({ current_level: 100, prestige_level: 1, prestige_unlocks: existingUnlocks });
      mockUpdateSuccess();

      await POST(makeRequest());

      const updatePayload = mockUpdate.mock.calls[0][0];
      expect(updatePayload.prestige_unlocks.length).toBeGreaterThan(existingUnlocks.length);
      // Existing unlock preserved
      expect(updatePayload.prestige_unlocks[0]).toEqual(existingUnlocks[0]);
    });
  });

  // ===== RACE CONDITION =====
  describe('RACE CONDITION: double-click vulnerability', () => {
    it('documents that two simultaneous requests could both pass canPrestige (no optimistic locking)', async () => {
      // BUG: The route reads prestige_level, checks canPrestige, then updates.
      // There is no optimistic locking (e.g., WHERE prestige_level = :expected).
      // Two concurrent requests both read prestige_level=0, both pass canPrestige,
      // and both write prestige_level=1 — the second overwrites the first's unlocks.
      //
      // Fix would be: UPDATE profiles SET prestige_level = prestige_level + 1
      //   WHERE id = :userId AND prestige_level = :expectedPrestige
      //   RETURNING *;
      // Then check rows affected = 1.

      authAs();
      // Both requests see prestige_level=0
      mockProfile({ current_level: 100, prestige_level: 0 });
      mockUpdateSuccess();

      // Simulate two concurrent calls
      const [res1, res2] = await Promise.all([POST(makeRequest()), POST(makeRequest())]);

      // Both succeed — this is the bug
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.data.newPrestigeLevel).toBe(1);
      expect(res2.data.newPrestigeLevel).toBe(1); // Should have been 2 or rejected
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

    it('returns 500 on update failure', async () => {
      authAs();
      mockProfile({ current_level: 100, prestige_level: 0 });
      mockUpdateError();

      const res = await POST(makeRequest());
      expect(res.status).toBe(500);
      expect(res.data.error).toContain('Failed to apply prestige');
    });
  });
});
