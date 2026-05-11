import { describe, expect, it, vi } from 'vitest';
import { revalidateSubmission, type ServerDictLookup } from '../serverRevalidate';

const dict: ServerDictLookup = async (word, language) => {
  const valid: Record<string, Set<string>> = {
    en: new Set(['hello', 'world', 'lexiclash', 'wordhunt']),
    es: new Set(['hola', 'mundo']),
  };
  return valid[language]?.has(word.toLowerCase()) ?? false;
};

describe('revalidateSubmission', () => {
  it('accepts a submission with all valid words and recomputes finalScore', async () => {
    const result = await revalidateSubmission(
      {
        id: 'a',
        mode: 'sp',
        payload: { score: 9999, words: ['hello', 'world'], language: 'en' },
        clientCompletedAt: Date.now(),
      },
      dict,
    );
    expect(result.accepted).toBe(true);
    expect(result.rejectedWords).toEqual([]);
    expect(result.finalScore).toBeGreaterThan(0);
    expect(result.finalScore).toBeLessThan(9999);
  });

  it('rejects invalid words and reduces finalScore accordingly', async () => {
    const result = await revalidateSubmission(
      {
        id: 'b',
        mode: 'sp',
        payload: { score: 9999, words: ['hello', 'zzqx', 'fakeword'], language: 'en' },
        clientCompletedAt: Date.now(),
      },
      dict,
    );
    expect(result.rejectedWords).toEqual(['zzqx', 'fakeword']);
    expect(result.accepted).toBe(true);
  });

  it('returns finalScore=0 when payload has no words array', async () => {
    const result = await revalidateSubmission(
      {
        id: 'c',
        mode: 'sp',
        payload: { score: 100, language: 'en' },
        clientCompletedAt: Date.now(),
      },
      dict,
    );
    expect(result.finalScore).toBe(0);
    expect(result.rejectedWords).toEqual([]);
  });

  it('uses language-specific dictionary', async () => {
    const result = await revalidateSubmission(
      {
        id: 'd',
        mode: 'sp',
        payload: { score: 50, words: ['hola', 'hello'], language: 'es' },
        clientCompletedAt: Date.now(),
      },
      dict,
    );
    expect(result.rejectedWords).toEqual(['hello']);
  });

  it('never trusts client-claimed score — finalScore derived from word list only', async () => {
    const result = await revalidateSubmission(
      {
        id: 'e',
        mode: 'sp',
        payload: { score: 999999, words: ['hello'], language: 'en' },
        clientCompletedAt: Date.now(),
      },
      dict,
    );
    expect(result.finalScore).toBeLessThan(100);
  });

  it('rejects entire submission when 100% of words are invalid', async () => {
    const result = await revalidateSubmission(
      {
        id: 'f',
        mode: 'sp',
        payload: { score: 500, words: ['zzqx', 'fakeword', 'invalid'], language: 'en' },
        clientCompletedAt: Date.now(),
      },
      dict,
    );
    expect(result.accepted).toBe(false);
    expect(result.finalScore).toBe(0);
    expect(result.reason).toBe('all_words_rejected');
  });

  it('rejects when language is missing', async () => {
    const result = await revalidateSubmission(
      {
        id: 'g',
        mode: 'sp',
        payload: { score: 100, words: ['hello'] },
        clientCompletedAt: Date.now(),
      },
      dict,
    );
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('language_missing');
  });
});
