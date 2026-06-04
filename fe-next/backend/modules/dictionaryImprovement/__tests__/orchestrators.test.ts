/**
 * TDD — thin orchestrators wired with INJECTED deps (no real DB/network).
 *  - runProactiveDiscovery: load candidates → prioritize → drop known →
 *    enqueue a bounded batch into the existing verification queue.
 *  - runDictionaryMetrics: recall@gold + precision@sample → qualityGate → save.
 */
import { describe, it, expect, vi } from 'vitest';
import { runProactiveDiscovery } from '../proactiveDiscovery';
import { runDictionaryMetrics } from '../metricsJob';
import type { Candidate } from '../types';

describe('runProactiveDiscovery', () => {
  it('loads, prioritizes, drops known, and enqueues a bounded novel batch', async () => {
    const enqueued: Candidate[] = [];
    const deps = {
      loadCandidateWords: vi.fn(async () => ['Cat', 'dog', 'known', 'xqz1']),
      freqRank: vi.fn(async () => new Map([['dog', 1], ['cat', 2]])),
      filterNovel: vi.fn(async (_lang: string, words: string[]) => words.filter((w) => w !== 'known')),
      enqueue: vi.fn(async (_lang: string, words: Candidate[]) => {
        enqueued.push(...words);
        return words.length;
      }),
    };
    const res = await runProactiveDiscovery('en', { limit: 10, deps });
    expect(res.considered).toBe(3); // cat, dog, known (xqz1 dropped: invalid form)
    expect(res.novel).toBe(2); // known removed
    expect(res.queued).toBe(2);
    expect(enqueued.map((c) => c.word)).toEqual(['dog', 'cat']); // freq order
    expect(deps.enqueue).toHaveBeenCalledOnce();
  });

  it('respects the limit and enqueues nothing when no novel words remain', async () => {
    const deps = {
      loadCandidateWords: vi.fn(async () => ['a', 'b', 'c']),
      filterNovel: vi.fn(async () => []),
      enqueue: vi.fn(async () => 0),
    };
    const res = await runProactiveDiscovery('sv', { limit: 2, deps });
    expect(res.queued).toBe(0);
    expect(deps.enqueue).not.toHaveBeenCalled();
  });
});

describe('runDictionaryMetrics', () => {
  const baseDeps = () => ({
    loadGoldValid: vi.fn(async () => ['cat', 'dog', 'bird']),
    loadGoldInvalid: vi.fn(async () => ['qzxbk', 'wjmpf']),
    has: ((w: string) => w === 'cat' || w === 'dog') as (w: string) => boolean,
    sampleAcceptedWords: vi.fn(async () => ['x', 'y', 'z']),
    reverify: vi.fn(async (_lang: string, w: string) => w !== 'y'), // y is garbage
    dictSize: vi.fn(async () => 100),
    loadPrevPrecision: vi.fn(async () => null as number | null),
    save: vi.fn(async (_row: Record<string, unknown>) => {}),
  });

  it('computes recall + precision, passes the gate on first run, and saves a row', async () => {
    const deps = baseDeps();
    const res = await runDictionaryMetrics('en', { sampleN: 3, deps });
    expect(res.recall).toBeCloseTo(2 / 3, 5);
    expect(res.precision).toBeCloseTo(2 / 3, 5);
    expect(res.gate.ok).toBe(true);
    expect(deps.save).toHaveBeenCalledOnce();
    const row = deps.save.mock.calls[0][0] as Record<string, unknown>;
    expect(row.language).toBe('en');
    expect(row.recall_at_gold).toBeCloseTo(2 / 3, 5);
  });

  it('fails the gate when precision regresses beyond tolerance (still records the row)', async () => {
    const deps = baseDeps();
    deps.loadPrevPrecision = vi.fn(async () => 0.99);
    const res = await runDictionaryMetrics('en', { sampleN: 3, deps });
    expect(res.gate.ok).toBe(false);
    expect(deps.save).toHaveBeenCalledOnce(); // metrics always recorded
  });

  it('records gold_invalid_n and flags a known-invalid word the dict wrongly accepts', async () => {
    const deps = baseDeps();
    deps.has = (w: string) => w === 'cat' || w === 'dog' || w === 'qzxbk'; // qzxbk = false-accept
    await runDictionaryMetrics('en', { sampleN: 3, deps });
    const row = deps.save.mock.calls[0][0] as Record<string, unknown>;
    expect(row.gold_invalid_n).toBe(2);
    expect(String(row.notes)).toMatch(/gold_invalid_accepted=1\/2/);
  });
});
