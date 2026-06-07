import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression for the curated-level bonus-word bug: a clear whose wordsFound
// includes an OFF-THEME bonus word must return 200 and persist a clear row.
// Before the fix, validateLevelClear rejected it → 400 → the whole clear (and
// all progress/coins/chest) was lost. This file uses the REAL anti-cheat so the
// membership-reject path is actually exercised (route.test.ts stubs the caps).

const inserted: Record<string, unknown[]> = {};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'u1' } } })) },
      from: vi.fn((table: string) => {
        const q: Record<string, unknown> = {};
        q.select = () => q;
        q.eq = () => q;
        q.single = () => Promise.resolve({ data: null, error: null });
        q.insert = (payload: unknown) => {
          (inserted[table] ??= []).push(payload);
          return Promise.resolve({ error: null });
        };
        q.update = () => q;
        q.then = (resolve: (v: unknown) => void) => resolve({ error: null });
        return q;
      }),
      rpc: vi.fn(() =>
        Promise.resolve({
          data: [{ total_coins_earned_blast: 100, current_chest_progress: 0.2, current_chest_number: 1 }],
          error: null,
        }),
      ),
    }),
  ),
}));

vi.mock('@/backend/services/economy/awardCoins', () => ({
  awardCoinsServer: vi.fn(() => Promise.resolve()),
}));

// Curated level (number 1 ≤ cutoff) with a 2-word theme. NOTE: anti-cheat is NOT
// mocked here — the real validateLevelClear runs against this level.
const TEST_LEVEL = { words: ['cat', 'dog'], columns: [], locale: 'en', levelNumber: 1 };
vi.mock('@/lib/blast/v2/level-source-registry', () => ({
  buildRegistry: vi.fn(() => ({})),
  getLevelSourceForLevel: vi.fn(() => ({ resolve: vi.fn(() => Promise.resolve(TEST_LEVEL)) })),
}));

import { POST } from '../route';

function req(body: unknown) {
  return { json: () => Promise.resolve(body) } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(inserted)) delete inserted[k];
});

describe('/api/blast/clear-level — curated clear with off-theme bonus word', () => {
  it('returns 200 and persists the clear (does NOT 400 on the bonus word)', async () => {
    const res = await POST(
      req({
        levelNumber: 1,
        locale: 'en',
        wordsFound: ['cat', 'dog', 'tree'], // 'tree' = off-theme bonus find
        earnedCoins: 100,
        earnedGems: 3,
        hintsUsed: 0,
        wrongAttempts: 0,
        cascadesTriggered: 1,
        timeSeconds: 30, // >= 5s * 2 theme words
      }),
    );

    expect(res.status).toBe(200);
    expect(inserted['blast_level_clears']?.length).toBe(1);
  });
});
