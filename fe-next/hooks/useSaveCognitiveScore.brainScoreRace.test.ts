import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * Sentry JAVASCRIPT-NEXTJS-242: two results screens saved at once, both read
 * `brain_scores` (no row yet) and both INSERTed — the second lost on
 * `brain_scores_user_id_key`. A fetch-then-insert can never be race-free; the
 * first write must be an upsert on `user_id` that keeps the row already there.
 */

type Call = { table: string; op: string; args: unknown[] };
const calls: Call[] = [];

function chain(table: string): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        // awaiting the chain resolves to itself; `data`/`error` read as undefined → "no row yet"
        if (prop === 'then' || prop === 'data' || prop === 'error') return undefined;
        return (...args: unknown[]) => {
          calls.push({ table, op: String(prop), args });
          return proxy;
        };
      },
    }
  );
  return proxy;
}

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ from: (table: string) => chain(table) }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/utils/logger', () => ({ __esModule: true, default: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/cognitiveScoring', () => ({
  calculateGameCognitiveScores: () => ({
    processingSpeed: 60, workingMemory: 55, attention: 50, flexibility: 45, vocabulary: 70,
    wordsPerMinute: 4, avgWordLength: 4.5, maxCombo: 2, uniqueWordLengths: 3,
    rareWordCount: 0, legendaryWordCount: 0, hintsUsed: 0, gridSize: 25, gameDurationSeconds: 90,
  }),
  updateBrainScore: vi.fn(),
  getTierFromScore: () => 'bronze',
  calculateTierProgress: () => 10,
}));

import { useSaveCognitiveScore } from './useSaveCognitiveScore';

describe('useSaveCognitiveScore — first brain score write', () => {
  beforeEach(() => { calls.length = 0; });

  it('upserts on user_id and keeps an existing row instead of a bare insert', async () => {
    const { result } = renderHook(() => useSaveCognitiveScore());
    await act(async () => {
      await result.current.saveCognitiveScore({
        playerWordData: [
          { word: 'tree', isValid: true, comboBonus: 0 },
          { word: 'stone', isValid: true, comboBonus: 1 },
        ] as never,
        gameDuration: 90,
      });
    });

    const brainWrites = calls.filter((c) => c.table === 'brain_scores' && (c.op === 'insert' || c.op === 'upsert'));
    expect(brainWrites).toHaveLength(1);
    expect(brainWrites[0].op).toBe('upsert');
    expect(brainWrites[0].args[0]).toMatchObject({ user_id: 'user-1', games_analyzed: 1 });
    expect(brainWrites[0].args[1]).toEqual({ onConflict: 'user_id', ignoreDuplicates: true });
  });
});
