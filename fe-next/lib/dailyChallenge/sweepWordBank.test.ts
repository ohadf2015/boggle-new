import { describe, it, expect, vi } from 'vitest';
import { sweepWordBank, type SweepDeps } from './sweepWordBank';
import type { DailyWordVerdict } from '@/lib/ai-service/dailyWordJudge';

function verdict(ok: boolean, extra: Partial<DailyWordVerdict> = {}): DailyWordVerdict {
  return { ok, reason: extra.reason ?? '', meaning: extra.meaning ?? '', interestingness: extra.interestingness };
}

/**
 * Build deps backed by an in-memory bank. A word's "judged" state is modelled by
 * removing it from the unjudged pool once markApproved/markRejected runs — exactly
 * how the real getUnjudged (filters judged_at IS NULL) behaves across batches.
 */
function memDeps(
  pool: Record<string, string[]>,
  judgeFn: (word: string, language: string) => Promise<DailyWordVerdict>,
  batchSize = 25,
) {
  const remaining: Record<string, string[]> = {};
  for (const [lang, words] of Object.entries(pool)) remaining[lang] = [...words];
  const approved: Array<{ lang: string; word: string; meaning: string; interestingness: number }> = [];
  const rejected: Array<{ lang: string; word: string; reason: string }> = [];

  const deps: SweepDeps = {
    getUnjudged: vi.fn(async (language: string, limit: number) =>
      (remaining[language] ?? []).slice(0, Math.min(limit, batchSize)),
    ),
    judge: judgeFn,
    markApproved: vi.fn(async (language, wordUpper, meaning, interestingness) => {
      remaining[language] = (remaining[language] ?? []).filter((w) => w.toUpperCase() !== wordUpper);
      approved.push({ lang: language, word: wordUpper, meaning, interestingness });
    }),
    markRejected: vi.fn(async (language, wordUpper, reason) => {
      remaining[language] = (remaining[language] ?? []).filter((w) => w.toUpperCase() !== wordUpper);
      rejected.push({ lang: language, word: wordUpper, reason });
    }),
  };
  return { deps, approved, rejected, remaining };
}

describe('sweepWordBank', () => {
  it('approves good words (storing meaning + interestingness) and blocks bad ones', async () => {
    const judge = vi.fn(async (word: string) =>
      word === 'GARDEN'
        ? verdict(true, { meaning: 'place to grow plants', interestingness: 5 })
        : verdict(false, { reason: 'proper noun' }),
    );
    const { deps, approved, rejected } = memDeps({ en: ['GARDEN', 'KABUL'] }, judge);

    const summary = await sweepWordBank(deps, { languages: ['en'] });

    expect(summary.judged).toBe(2);
    expect(summary.approved).toBe(1);
    expect(summary.rejected).toBe(1);
    expect(approved).toEqual([{ lang: 'en', word: 'GARDEN', meaning: 'place to grow plants', interestingness: 5 }]);
    expect(rejected).toEqual([{ lang: 'en', word: 'KABUL', reason: 'proper noun' }]);
  });

  it('drains the whole pool across multiple batches', async () => {
    const words = Array.from({ length: 60 }, (_, i) => `WORD${i}`);
    const judge = vi.fn(async () => verdict(true, { meaning: 'm', interestingness: 3 }));
    const { deps } = memDeps({ en: words }, judge, 25);

    const summary = await sweepWordBank(deps, { languages: ['en'], batchSize: 25 });

    expect(summary.approved).toBe(60); // 25 + 25 + 10, no word left behind
    expect(summary.judged).toBe(60);
  });

  it('FAIL-CLOSED: a judge error leaves the word unjudged (never auto-approved) and is reported', async () => {
    const judge = vi.fn(async (word: string) => {
      if (word === 'BOOM') throw new Error('Vertex down');
      return verdict(true, { meaning: 'm' });
    });
    const { deps, approved, rejected, remaining } = memDeps({ en: ['GOODWORD', 'BOOM'] }, judge);

    const summary = await sweepWordBank(deps, { languages: ['en'] });

    expect(approved.map((a) => a.word)).toEqual(['GOODWORD']);
    expect(rejected).toEqual([]); // an error is NOT a rejection
    expect(remaining.en).toEqual(['BOOM']); // still unjudged → retried next run
    expect(summary.failures.length).toBe(1);
    expect(summary.failures[0]).toContain('BOOM');
  });

  it('does not spin forever when an entire batch keeps failing (no-progress break)', async () => {
    const judge = vi.fn(async () => {
      throw new Error('all down');
    });
    const { deps } = memDeps({ en: ['A1', 'A2', 'A3'] }, judge);

    const summary = await sweepWordBank(deps, { languages: ['en'] });

    // Each word attempted once; loop breaks instead of re-fetching the same failing batch.
    expect(judge).toHaveBeenCalledTimes(3);
    expect(summary.judged).toBe(0);
    expect(summary.failures.length).toBe(3);
  });

  it('respects maxPerLanguage to cap LLM spend per run', async () => {
    const words = Array.from({ length: 100 }, (_, i) => `W${i}`);
    const judge = vi.fn(async () => verdict(true, { meaning: 'm' }));
    const { deps } = memDeps({ en: words }, judge);

    const summary = await sweepWordBank(deps, { languages: ['en'], maxPerLanguage: 30, batchSize: 25 });

    expect(summary.judged).toBe(30); // stops at the cap, remainder picked up next run
  });

  describe('dictionary backstop (deterministic, catches LLM misses)', () => {
    it('rejects a non-dictionary word WITHOUT calling the judge (saves LLM, catches non-words)', async () => {
      const judge = vi.fn(async () => verdict(true, { meaning: 'm' }));
      const { deps, approved, rejected } = memDeps({ en: ['HAJART'] }, judge);
      deps.isValidWord = vi.fn(async () => false); // not in dictionary

      const summary = await sweepWordBank(deps, { languages: ['en'] });

      expect(judge).not.toHaveBeenCalled(); // dict-rejected before the LLM
      expect(approved).toEqual([]);
      expect(rejected).toEqual([{ lang: 'en', word: 'HAJART', reason: 'not in dictionary' }]);
      expect(summary.rejected).toBe(1);
    });

    it('still judges words that ARE in the dictionary', async () => {
      const judge = vi.fn(async () => verdict(true, { meaning: 'def' }));
      const { deps, approved } = memDeps({ en: ['GARDEN'] }, judge);
      deps.isValidWord = vi.fn(async () => true);

      await sweepWordBank(deps, { languages: ['en'] });
      expect(judge).toHaveBeenCalledOnce();
      expect(approved.map((a) => a.word)).toEqual(['GARDEN']);
    });

    it('falls through to the judge when the dictionary is unavailable (null), not fail-closed on dict gaps', async () => {
      const judge = vi.fn(async () => verdict(true, { meaning: 'def' }));
      const { deps, approved } = memDeps({ en: ['GARDEN'] }, judge);
      deps.isValidWord = vi.fn(async () => null); // dict not loaded

      await sweepWordBank(deps, { languages: ['en'] });
      expect(judge).toHaveBeenCalledOnce();
      expect(approved.map((a) => a.word)).toEqual(['GARDEN']);
    });
  });

  it('processes each language independently', async () => {
    const judge = vi.fn(async (word: string) => verdict(word !== 'BADHE'));
    const { deps, approved, rejected } = memDeps({ en: ['GOODEN'], he: ['BADHE'] }, judge);

    const summary = await sweepWordBank(deps, { languages: ['en', 'he'] });

    expect(approved.map((a) => `${a.lang}:${a.word}`)).toEqual(['en:GOODEN']);
    expect(rejected.map((r) => `${r.lang}:${r.word}`)).toEqual(['he:BADHE']);
    expect(summary.judged).toBe(2);
  });
});
