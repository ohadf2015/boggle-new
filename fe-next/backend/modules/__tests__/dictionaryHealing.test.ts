/**
 * Tests for the dictionary auto-healing sweep.
 *
 * Re-checks already auto-promoted en/es words against the offensive filter and
 * DEMOTES any that are now flagged (slur/offensive) — removing them from
 * word_scores, both in-memory Sets, and adding to the bot blacklist. This heals
 * historically-promoted bad words and any that slip through.
 */

import { vi } from 'vitest';

const {
  mockIsOffensiveWord,
  mockRemoveFromCommunityCache,
  mockRemoveApprovedWord,
} = vi.hoisted(() => ({
  mockIsOffensiveWord: vi.fn(),
  mockRemoveFromCommunityCache: vi.fn(),
  mockRemoveApprovedWord: vi.fn(),
}));

vi.mock('../../services/wiktionaryOffensiveFilter', () => ({
  isOffensiveWord: mockIsOffensiveWord,
}));
vi.mock('../../modules/communityWordManager', () => ({
  removeFromCommunityCache: mockRemoveFromCommunityCache,
}));
vi.mock('../../dictionary', () => ({
  removeApprovedWord: mockRemoveApprovedWord,
}));
vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Chainable Supabase stub: every query-builder method returns `this`; the
// builder is awaitable and resolves to { data: candidates, error: null }.
const { mockSupabase, calls } = vi.hoisted(() => {
  const calls = {
    deletedScores: [] as Array<Record<string, unknown>>,
    blacklisted: [] as Array<Record<string, unknown>>,
    updatedSubs: [] as Array<Record<string, unknown>>,
  };
  let candidates: Array<{ id: string; word: string; language: string }> = [];

  function builder(table: string) {
    const filters: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    const chain = () => b;
    b.select = chain;
    b.not = chain;
    b.in = chain;
    b.is = chain;
    b.limit = chain;
    b.eq = (col: string, val: unknown) => { filters[col] = val; return b; };
    b.delete = () => { (b as { _op?: string })._op = 'delete'; return b; };
    b.update = (row: Record<string, unknown>) => { (b as { _op?: string; _row?: unknown })._op = 'update'; (b as { _row?: unknown })._row = row; return b; };
    b.upsert = (row: Record<string, unknown>) => {
      if (table === 'bot_word_blacklist') calls.blacklisted.push(row);
      return Promise.resolve({ error: null });
    };
    // make the builder awaitable
    b.then = (resolve: (v: { data: unknown; error: null }) => unknown) => {
      const op = (b as { _op?: string })._op;
      if (table === 'word_scores' && op === 'delete') {
        calls.deletedScores.push({ ...filters });
        return resolve({ data: null, error: null });
      }
      if (table === 'invalid_word_submissions' && op === 'update') {
        calls.updatedSubs.push({ ...filters, row: (b as { _row?: unknown })._row });
        return resolve({ data: null, error: null });
      }
      // default: select query for candidates
      return resolve({ data: candidates, error: null });
    };
    return b;
  }

  const mockSupabase = {
    from: vi.fn((table: string) => builder(table)),
    __setCandidates: (c: typeof candidates) => { candidates = c; },
  };
  return { mockSupabase, calls };
});

vi.mock('../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => mockSupabase),
}));

import { runDictionaryHealing } from '../dictionaryHealing';

describe('runDictionaryHealing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.deletedScores.length = 0;
    calls.blacklisted.length = 0;
    calls.updatedSubs.length = 0;
    mockRemoveFromCommunityCache.mockReturnValue(undefined);
    mockRemoveApprovedWord.mockResolvedValue(true);
  });

  it('demotes an offensive auto-promoted word everywhere', async () => {
    mockSupabase.__setCandidates([
      { id: 'a', word: 'wop', language: 'en' },
      { id: 'b', word: 'pleat', language: 'en' },
    ]);
    mockIsOffensiveWord.mockImplementation(async (w: string) => w === 'wop');

    const result = await runDictionaryHealing();

    expect(result.scanned).toBe(2);
    expect(result.demoted).toBe(1);
    expect(result.words).toEqual(['wop']);

    // word_scores row deleted for the slur
    expect(calls.deletedScores).toContainEqual({ word: 'wop', language: 'en' });
    // removed from both in-memory Sets
    expect(mockRemoveFromCommunityCache).toHaveBeenCalledWith('wop', 'en');
    expect(mockRemoveApprovedWord).toHaveBeenCalledWith('wop', 'en');
    // blacklisted
    expect(calls.blacklisted).toContainEqual(
      expect.objectContaining({ word: 'wop', language: 'en' })
    );
    // marked rejected on the submission row
    expect(calls.updatedSubs).toContainEqual(
      expect.objectContaining({ id: 'a' })
    );

    // the clean word is untouched
    expect(mockRemoveApprovedWord).not.toHaveBeenCalledWith('pleat', 'en');
  });

  it('no-ops when nothing is offensive', async () => {
    mockSupabase.__setCandidates([{ id: 'x', word: 'pleat', language: 'en' }]);
    mockIsOffensiveWord.mockResolvedValue(false);

    const result = await runDictionaryHealing();

    expect(result.scanned).toBe(1);
    expect(result.demoted).toBe(0);
    expect(calls.deletedScores).toHaveLength(0);
    expect(mockRemoveApprovedWord).not.toHaveBeenCalled();
  });

  it('handles an empty candidate set', async () => {
    mockSupabase.__setCandidates([]);
    const result = await runDictionaryHealing();
    expect(result.scanned).toBe(0);
    expect(result.demoted).toBe(0);
  });
});
