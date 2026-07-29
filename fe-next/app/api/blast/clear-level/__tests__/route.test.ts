import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---------------------------------------------------------------

const inserted: Record<string, unknown[]> = {};
const singleQueue: Record<string, Array<{ data: unknown; error: unknown }>> = {};
let rpcResult: { data: unknown; error: unknown } = { data: null, error: null };

function makeFrom() {
  return vi.fn((table: string) => {
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.single = () =>
      Promise.resolve((singleQueue[table] ?? []).shift() ?? { data: null, error: null });
    q.insert = (payload: unknown) => {
      (inserted[table] ??= []).push(payload);
      return Promise.resolve({ error: null });
    };
    q.update = () => q;
    // Make the chain awaitable for the `.update(...).eq(...)` path.
    q.then = (resolve: (v: unknown) => void) => resolve({ error: null });
    return q;
  });
}

const supabaseMock = {
  auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } } })) },
  from: makeFrom(),
  rpc: vi.fn(() => Promise.resolve(rpcResult)),
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(supabaseMock)),
}));

vi.mock('@/backend/services/economy/awardCoins', () => ({
  awardCoinsServer: vi.fn(() => Promise.resolve()),
}));

// A tiny 2-word theme level; star rating uses level.words.
const TEST_LEVEL = { words: ['cat', 'dog'], columns: [] };
vi.mock('@/lib/blast/v2/level-source-registry', () => ({
  buildRegistry: vi.fn(() => ({})),
  getLevelSourceForLevel: vi.fn(() => ({ resolve: vi.fn(() => Promise.resolve(TEST_LEVEL)) })),
}));

// Keep the REAL starRating (the behavior under test); stub only the caps so the
// submission always passes anti-cheat.
vi.mock('@/lib/blast/v2/anti-cheat', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/blast/v2/anti-cheat')>();
  return {
    ...actual,
    applyAntiCheatCapsWithLevel: vi.fn(() => ({ ok: true, trustedCoins: 300 })),
    applyAntiCheatCaps: vi.fn(() => ({ ok: true, trustedCoins: 300 })),
  };
});

import { POST } from '../route';

function req(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as Parameters<typeof POST>[0];
}

const baseSubmission = {
  levelNumber: 1,
  locale: 'en',
  wordsFound: ['cat', 'dog'],
  earnedCoins: 300,
  earnedGems: 5,
  hintsUsed: 0,
  wrongAttempts: 0,
  cascadesTriggered: 2,
  timeSeconds: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(inserted)) delete inserted[k];
  for (const k of Object.keys(singleQueue)) delete singleQueue[k];
  rpcResult = { data: null, error: null };
});

describe('/api/blast/clear-level', () => {
  it('persists the REAL star rating, not a hardcoded 1', async () => {
    // dup check (none) + existingProgress (none → triggers insert)
    singleQueue['blast_level_clears'] = [{ data: null, error: null }];
    singleQueue['blast_progress'] = [{ data: null, error: null }];
    rpcResult = {
      data: [{ total_coins_earned_blast: 300, current_chest_progress: 0.3, current_chest_number: 1 }],
      error: null,
    };

    const res = await POST(req(baseSubmission));
    const json = await res.json();

    // All theme found, 0 hints, 0 wrong, fast → masterful → 3 stars.
    const clearRow = inserted['blast_level_clears']?.[0] as { stars: number };
    expect(clearRow.stars).toBe(3);
    expect(json.coins).toBe(300);
  });

  it('caps stars at 1 when not every theme word was found', async () => {
    singleQueue['blast_level_clears'] = [{ data: null, error: null }];
    singleQueue['blast_progress'] = [{ data: null, error: null }];
    rpcResult = { data: [{ total_coins_earned_blast: 50, current_chest_progress: 0.1, current_chest_number: 1 }], error: null };

    await POST(req({ ...baseSubmission, wordsFound: ['cat'] })); // missing 'dog'

    const clearRow = inserted['blast_level_clears']?.[0] as { stars: number };
    expect(clearRow.stars).toBe(1);
  });

  it('surfaces a swallowed RPC error and falls back to a DB read for the response', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    singleQueue['blast_level_clears'] = [{ data: null, error: null }];
    // 1st single = existingProgress (none); 2nd single = fallback read after RPC error
    singleQueue['blast_progress'] = [
      { data: null, error: null },
      { data: { total_coins_earned_blast: 999, current_chest_progress: 0.42, current_chest_number: 2 }, error: null },
    ];
    rpcResult = { data: null, error: { message: 'column ... is ambiguous' } };

    const res = await POST(req(baseSubmission));
    const json = await res.json();

    expect(errSpy).toHaveBeenCalledWith(
      '[blast/clear-level] increment_blast_progress RPC failed',
      expect.objectContaining({ userId: 'u1' }),
    );
    // Response reflects the true persisted row, not a misleading zero.
    expect(json.coins).toBe(999);
    expect(json.chestProgress).toBe(0.42);
    expect(json.chestNumber).toBe(2);
    errSpy.mockRestore();
  });
});
