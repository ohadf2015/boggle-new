/**
 * Tests for getReengagementRecipients() — recipient filtering.
 *
 * Focus: the new "any game" gate that skips users who played any mode
 * (MP, SP, brain drills, party, daily) within INACTIVITY_DAYS via
 * `player_engagement.last_played_at`.
 *
 * The legacy lib/__tests__/reengagementEmail.test.ts is quarantined
 * (vitest.config.ts exclude). This file lives in __tests__/ which is
 * included, so it actually runs.
 */

import { vi, describe, test, expect, beforeEach, type Mock } from 'vitest';

vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: vi.fn(),
  withTimeout: vi.fn((p: Promise<unknown>) => p),
  getTodayDate: vi.fn(() => '2026-04-27'),
  getLocalHour: vi.fn(() => 8), // inside the 7–9 AM window
  generateUnsubscribeToken: vi.fn(() => 'tok'),
  isEmailServiceConfigured: vi.fn(() => true),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: vi.fn() } })),
}));

import { getSupabaseAdmin } from '@/lib/email';
import { getReengagementRecipients } from '@/lib/reengagementEmail';

const mockGetSupabaseAdmin = getSupabaseAdmin as unknown as Mock;

interface QueryStub {
  table: string;
  data: unknown;
}

/**
 * Build a Supabase mock where each `.from(table)` call returns a fresh chain
 * whose terminal `.single()` / `.maybeSingle()` resolves to the matching stub.
 * Stubs are matched in declaration order — first stub for a table wins, then
 * is consumed (so a second `from('daily_puzzle_attempts')` hits the next stub).
 */
function makeSupabase(stubs: QueryStub[], authUsers: { id: string; email: string }[]) {
  const queue = [...stubs];

  const buildChain = (table: string) => {
    const result = (() => {
      const idx = queue.findIndex((s) => s.table === table);
      if (idx === -1) return { data: null, error: null };
      const [stub] = queue.splice(idx, 1);
      return { data: stub.data, error: null };
    })();

    // Thenable chain — awaiting at any point yields `result`. Also exposes
    // every chain method as a no-op returning self, plus terminal .single /
    // .maybeSingle that resolve the same result.
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.gte = vi.fn().mockReturnValue(chain);
    chain.lt = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.update = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn().mockResolvedValue(result);
    chain.maybeSingle = vi.fn().mockResolvedValue(result);
    chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return chain;
  };

  return {
    from: vi.fn((table: string) => buildChain(table)),
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: { users: authUsers },
          error: null,
        }),
      },
    },
  };
}

const baseProfile = {
  id: 'user-1',
  display_name: 'Test',
  username: 'test',
  timezone: 'UTC',
  country_code: 'US',
  email_unsubscribe_token: null,
  last_reengagement_email_sent_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getReengagementRecipients — any-game gate', () => {
  test('skips users who played any mode recently (player_engagement.last_played_at within window)', async () => {
    // GIVEN: user is daily-subscribed, hasn't played the daily lately,
    // BUT player_engagement.last_played_at shows recent activity in another mode
    const supa = makeSupabase(
      [
        { table: 'profiles', data: [baseProfile] },
        // No recent daily attempt
        { table: 'daily_puzzle_attempts', data: null },
        // Recent activity in some other game mode → MUST cause skip
        {
          table: 'player_engagement',
          data: { last_played_at: new Date().toISOString() },
        },
      ],
      [{ id: 'user-1', email: 'test@example.com' }],
    );
    mockGetSupabaseAdmin.mockReturnValue(supa);

    // WHEN
    const recipients = await getReengagementRecipients();

    // THEN
    expect(recipients).toEqual([]);
  });

  test('includes users with no recent activity in any mode', async () => {
    // GIVEN: subscribed, no recent daily, no recent any-game, but HAS a historical play
    const supa = makeSupabase(
      [
        { table: 'profiles', data: [baseProfile] },
        { table: 'daily_puzzle_attempts', data: null },        // no recent daily
        { table: 'player_engagement', data: null },            // no recent any-mode
        { table: 'daily_puzzle_attempts', data: { id: 'h1' } }, // historical play exists
      ],
      [{ id: 'user-1', email: 'test@example.com' }],
    );
    mockGetSupabaseAdmin.mockReturnValue(supa);

    const recipients = await getReengagementRecipients();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('test@example.com');
  });

  test('skips users with no historical play at all (never-played sign-ups)', async () => {
    const supa = makeSupabase(
      [
        { table: 'profiles', data: [baseProfile] },
        { table: 'daily_puzzle_attempts', data: null },  // no recent daily
        { table: 'player_engagement', data: null },      // no recent any-mode
        { table: 'daily_puzzle_attempts', data: null },  // no historical play
      ],
      [{ id: 'user-1', email: 'test@example.com' }],
    );
    mockGetSupabaseAdmin.mockReturnValue(supa);

    const recipients = await getReengagementRecipients();

    expect(recipients).toEqual([]);
  });
});
