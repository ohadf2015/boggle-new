/**
 * Tests for wordPactManager
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  createPact,
  getPact,
  recordPactPlay,
  resetDailyPacts,
  dissolvePact,
  computeMultiplier,
} from '../wordPactManager';

// Helper: create a chainable mock where every method returns the same object
// and the final awaitable resolves to `result`.
function createChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, Mock> = {};
  const handler = {
    get(_target: unknown, prop: string) {
      if (prop === 'then') {
        // Make chain thenable (awaitable)
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      if (!chain[prop]) {
        chain[prop] = vi.fn().mockReturnValue(new Proxy({}, handler));
      }
      return chain[prop];
    },
  };
  return new Proxy({}, handler);
}

const { mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockSupabase = { from: mockFrom };
  return { mockFrom, mockSupabase };
});

vi.mock('../supabaseServer', () => ({
  getSupabase: () => mockSupabase,
}));

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const PLAYER_A = 'player-aaa';
const PLAYER_B = 'player-bbb';
const PACT_ID = 'pact-123';

const basePact = {
  id: PACT_ID,
  player1_id: PLAYER_A,
  player2_id: PLAYER_B,
  player1_played_today: false,
  player2_played_today: false,
  last_reset_date: new Date().toISOString().split('T')[0],
  active: true,
  streak: 0,
  created_at: new Date().toISOString(),
};

describe('computeMultiplier', () => {
  it('returns 1.5 when both played', () => {
    expect(computeMultiplier(true, true)).toBe(1.5);
  });

  it('returns 2.0 when only you played', () => {
    expect(computeMultiplier(true, false)).toBe(2.0);
  });

  it('returns 1.0 when only partner played', () => {
    expect(computeMultiplier(false, true)).toBe(1.0);
  });

  it('returns 1.0 when neither played', () => {
    expect(computeMultiplier(false, false)).toBe(1.0);
  });
});

describe('createPact', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a pact when neither player has one', async () => {
    // Call 1: select().eq().or() → no existing pacts
    // Call 2: insert().select().single() → returns new pact
    mockFrom
      .mockReturnValueOnce(createChain({ data: [], error: null }))
      .mockReturnValueOnce(createChain({ data: basePact, error: null }));

    const result = await createPact(PLAYER_A, PLAYER_B);
    expect(mockFrom).toHaveBeenCalledWith('word_pacts');
    expect(result.player1_id).toBe(PLAYER_A);
    expect(result.player2_id).toBe(PLAYER_B);
  });

  it('throws when a player already has a pact', async () => {
    mockFrom.mockReturnValueOnce(
      createChain({ data: [{ id: 'existing' }], error: null })
    );

    await expect(createPact(PLAYER_A, PLAYER_B)).rejects.toThrow('ALREADY_IN_PACT');
  });

  it('throws on insert error', async () => {
    mockFrom
      .mockReturnValueOnce(createChain({ data: [], error: null }))
      .mockReturnValueOnce(createChain({ data: null, error: { message: 'dup' } }));

    await expect(createPact(PLAYER_A, PLAYER_B)).rejects.toThrow('PACT_CREATE_FAILED');
  });
});

describe('getPact', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no active pact', async () => {
    mockFrom.mockReturnValueOnce(
      createChain({ data: null, error: { code: 'PGRST116' } })
    );

    const result = await getPact(PLAYER_A);
    expect(result).toBeNull();
  });

  it('returns pact with friend info', async () => {
    // Call 1: pact query
    // Call 2: profile query
    mockFrom
      .mockReturnValueOnce(createChain({ data: basePact, error: null }))
      .mockReturnValueOnce(createChain({ data: { username: 'FriendB', avatar_image: 'avatar.png' }, error: null }));

    const result = await getPact(PLAYER_A);
    expect(result).not.toBeNull();
    expect(result!.friendId).toBe(PLAYER_B);
    expect(result!.friendUsername).toBe('FriendB');
    expect(result!.friendAvatar).toBe('avatar.png');
  });

  it('returns Unknown username when profile not found', async () => {
    mockFrom
      .mockReturnValueOnce(createChain({ data: basePact, error: null }))
      .mockReturnValueOnce(createChain({ data: null, error: null }));

    const result = await getPact(PLAYER_A);
    expect(result!.friendUsername).toBe('Unknown');
  });
});

describe('recordPactPlay', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no pact exists', async () => {
    mockFrom.mockReturnValueOnce(
      createChain({ data: null, error: { code: 'PGRST116' } })
    );

    const result = await recordPactPlay(PLAYER_A);
    expect(result).toBeNull();
  });

  it('marks player1 as played and returns 2.0x when partner has not played', async () => {
    // Call 1: select pact
    // Call 2: update played flag
    mockFrom
      .mockReturnValueOnce(createChain({ data: { ...basePact }, error: null }))
      .mockReturnValueOnce(createChain({ data: null, error: null }));

    const result = await recordPactPlay(PLAYER_A);
    expect(result).not.toBeNull();
    expect(result!.multiplier).toBe(2.0);
    expect(result!.pact.player1_played_today).toBe(true);
  });

  it('returns 1.5x when both players have played', async () => {
    mockFrom
      .mockReturnValueOnce(createChain({ data: { ...basePact, player2_played_today: true }, error: null }))
      .mockReturnValueOnce(createChain({ data: null, error: null }));

    const result = await recordPactPlay(PLAYER_A);
    expect(result).not.toBeNull();
    expect(result!.multiplier).toBe(1.5);
  });

  it('resets daily flags when date has changed', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    mockFrom
      .mockReturnValueOnce(createChain({
        data: { ...basePact, last_reset_date: yesterday, player1_played_today: true, player2_played_today: true, streak: 2 },
        error: null,
      }))
      .mockReturnValueOnce(createChain({ data: null, error: null })) // reset update
      .mockReturnValueOnce(createChain({ data: null, error: null })); // play update

    const result = await recordPactPlay(PLAYER_A);
    expect(result).not.toBeNull();
    expect(result!.pact.streak).toBe(3); // incremented because both played yesterday
    expect(result!.multiplier).toBe(2.0); // only player1 played today after reset
  });
});

describe('resetDailyPacts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 0 when no stale pacts', async () => {
    mockFrom.mockReturnValueOnce(
      createChain({ data: [], error: null })
    );

    const count = await resetDailyPacts();
    expect(count).toBe(0);
  });

  it('resets pacts and increments streak when both played', async () => {
    // Call 1: select stale pacts
    // Call 2: update pact
    mockFrom
      .mockReturnValueOnce(createChain({
        data: [{ id: PACT_ID, player1_played_today: true, player2_played_today: true, streak: 3 }],
        error: null,
      }))
      .mockReturnValueOnce(createChain({ data: null, error: null }));

    const count = await resetDailyPacts();
    expect(count).toBe(1);
  });

  it('resets streak to 0 when only one played', async () => {
    mockFrom
      .mockReturnValueOnce(createChain({
        data: [{ id: PACT_ID, player1_played_today: true, player2_played_today: false, streak: 5 }],
        error: null,
      }))
      .mockReturnValueOnce(createChain({ data: null, error: null }));

    const count = await resetDailyPacts();
    expect(count).toBe(1);
  });
});

describe('dissolvePact', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets active to false and returns true', async () => {
    mockFrom.mockReturnValueOnce(
      createChain({ data: null, error: null })
    );

    const result = await dissolvePact(PLAYER_A);
    expect(result).toBe(true);
  });

  it('returns false on error', async () => {
    mockFrom.mockReturnValueOnce(
      createChain({ data: null, error: { message: 'fail' } })
    );

    const result = await dissolvePact(PLAYER_A);
    expect(result).toBe(false);
  });
});
