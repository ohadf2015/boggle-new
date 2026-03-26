import { vi, type Mock, } from 'vitest';
// @ts-nocheck
/**
 * Adventure Purchase API Route Tests
 *
 * Server-side validated: client sends { upgradeId }, server fetches
 * current gold/upgrades from DB, validates cost, deducts gold.
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

// Mock supabase server client (auth + data queries on the same client)
const mockGetUser = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import { NextRequest } from 'next/server';
import { POST } from '../route';

// ---------- Helpers ----------

function makeRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    headers: { get: vi.fn().mockReturnValue('127.0.0.1') },
  } as unknown as NextRequest;
}

function makeInvalidJsonRequest(): NextRequest {
  return {
    json: () => Promise.reject(new Error('Invalid JSON')),
    headers: { get: vi.fn().mockReturnValue('127.0.0.1') },
  } as unknown as NextRequest;
}

function setupDbMocks({
  gold = 500,
  upgrades = {} as Record<string, number>,
  fetchError = null as { message?: string } | null,
  updateError = null as { message?: string } | null,
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'player_progression') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: fetchError ? null : { gold, upgrades },
              error: fetchError,
            }),
          }),
        }),
        update: vi.fn().mockImplementation((payload: Record<string, unknown>) => ({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: updateError ? null : { gold: payload.gold, upgrades: payload.upgrades },
                  error: updateError,
                }),
              }),
            }),
          }),
        })),
      };
    }
    return {};
  });
}

// ---------- Tests ----------

describe('POST /api/adventure/purchase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  // ===== AUTH =====
  describe('Authentication', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } });
      const res = await POST(makeRequest({ upgradeId: 'fuelTank' }));
      expect(res.status).toBe(401);
    });

    it('rejects when user is null without error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const res = await POST(makeRequest({ upgradeId: 'fuelTank' }));
      expect(res.status).toBe(401);
    });
  });

  // ===== INPUT VALIDATION =====
  describe('Input validation', () => {
    it('rejects invalid JSON body', async () => {
      const res = await POST(makeInvalidJsonRequest());
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid JSON body');
    });

    it('rejects missing upgradeId', async () => {
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid upgrade ID');
    });

    it('rejects non-string upgradeId', async () => {
      const res = await POST(makeRequest({ upgradeId: 123 }));
      expect(res.status).toBe(400);
    });

    it('rejects unknown upgradeId', async () => {
      const res = await POST(makeRequest({ upgradeId: 'nonexistent_upgrade' }));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Invalid upgrade ID');
    });
  });

  // ===== SECURITY: Server-side validation =====
  describe('SECURITY: Server validates gold and upgrades', () => {
    it('rejects purchase when player cannot afford upgrade', async () => {
      // fuelTank tier 1 costs 50 gold, player has only 10
      setupDbMocks({ gold: 10, upgrades: {} });

      const res = await POST(makeRequest({ upgradeId: 'fuelTank' }));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Cannot afford upgrade or already maxed');
    });

    it('rejects purchase when upgrade is already maxed', async () => {
      // fuelTank has 4 tiers; level 4 = maxed
      setupDbMocks({ gold: 99999, upgrades: { fuelTank: 4 } });

      const res = await POST(makeRequest({ upgradeId: 'fuelTank' }));
      expect(res.status).toBe(400);
      expect(res.data.error).toBe('Cannot afford upgrade or already maxed');
    });

    it('client cannot manipulate gold — server deducts from DB value', async () => {
      // Player has 100 gold in DB. fuelTank tier 1 costs 50.
      // Even if a hacked client tried to send gold: 999999, it is ignored.
      setupDbMocks({ gold: 100, upgrades: {} });

      const res = await POST(makeRequest({ upgradeId: 'fuelTank' }));
      expect(res.status).toBe(200);
      expect(res.data.gold).toBe(50); // 100 - 50 = 50, server-computed
    });

    it('client cannot set arbitrary upgrades — server increments by 1', async () => {
      setupDbMocks({ gold: 200, upgrades: { wordRadar: 1 } });

      // wordRadar tier 2 costs 120
      const res = await POST(makeRequest({ upgradeId: 'wordRadar' }));
      expect(res.status).toBe(200);
      expect(res.data.upgrades.wordRadar).toBe(2); // incremented by 1, not arbitrary
      expect(res.data.gold).toBe(80); // 200 - 120
    });

    it('ignores any extra fields sent by client', async () => {
      setupDbMocks({ gold: 100, upgrades: {} });

      const res = await POST(makeRequest({
        upgradeId: 'fuelTank',
        gold: 999999,          // ignored
        upgrades: { all: 99 }, // ignored
        runeFragments: 999,    // ignored
        runes: [{ id: 'god' }], // ignored
      }));
      expect(res.status).toBe(200);
      expect(res.data.gold).toBe(50); // server-computed: 100 - 50
    });
  });

  // ===== HAPPY PATH =====
  describe('Happy path', () => {
    it('purchases first tier of an upgrade', async () => {
      // luckyPickaxe tier 1 costs 40
      setupDbMocks({ gold: 100, upgrades: {} });

      const res = await POST(makeRequest({ upgradeId: 'luckyPickaxe' }));
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.gold).toBe(60); // 100 - 40
      expect(res.data.upgrades.luckyPickaxe).toBe(1);
    });

    it('purchases next tier of an existing upgrade', async () => {
      // fuelTank tier 2 costs 100
      setupDbMocks({ gold: 150, upgrades: { fuelTank: 1 } });

      const res = await POST(makeRequest({ upgradeId: 'fuelTank' }));
      expect(res.status).toBe(200);
      expect(res.data.gold).toBe(50); // 150 - 100
      expect(res.data.upgrades.fuelTank).toBe(2);
    });

    it('preserves other upgrades when purchasing', async () => {
      setupDbMocks({ gold: 200, upgrades: { fuelTank: 2, wordRadar: 1 } });

      // armorPlating tier 1 costs 80
      const res = await POST(makeRequest({ upgradeId: 'armorPlating' }));
      expect(res.status).toBe(200);
      expect(res.data.upgrades.fuelTank).toBe(2);
      expect(res.data.upgrades.wordRadar).toBe(1);
      expect(res.data.upgrades.armorPlating).toBe(1);
    });
  });

  // ===== DB ERRORS =====
  describe('Database errors', () => {
    it('returns 404 when progression not found', async () => {
      setupDbMocks({ fetchError: { message: 'Not found' } });

      const res = await POST(makeRequest({ upgradeId: 'fuelTank' }));
      expect(res.status).toBe(404);
      expect(res.data.error).toBe('Progression not found');
    });

    it('returns 500 on update failure', async () => {
      setupDbMocks({ gold: 500, upgrades: {}, updateError: { message: 'DB down' } });

      const res = await POST(makeRequest({ upgradeId: 'fuelTank' }));
      expect(res.status).toBe(500);
      expect(res.data.error).toBe('Failed to save purchase');
    });
  });

  // ===== EDGE CASES =====
  describe('Edge cases', () => {
    it('allows purchase with exact gold amount', async () => {
      // fuelTank tier 1 costs 50, player has exactly 50
      setupDbMocks({ gold: 50, upgrades: {} });
      const res = await POST(makeRequest({ upgradeId: 'fuelTank' }));
      expect(res.status).toBe(200);
      expect(res.data.gold).toBe(0);
    });

    it('rejects when 1 gold short', async () => {
      setupDbMocks({ gold: 49, upgrades: {} });
      const res = await POST(makeRequest({ upgradeId: 'fuelTank' }));
      expect(res.status).toBe(400);
    });
  });
});
