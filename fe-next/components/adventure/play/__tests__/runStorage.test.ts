import { describe, it, expect, beforeEach } from 'vitest';
import { readRunBest, recordRunBest } from '../runStorage';

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
  };
}

describe('run best word', () => {
  beforeEach(() => { (globalThis as { sessionStorage?: unknown }).sessionStorage = memoryStorage(); });

  it('Given nothing stored, then there is no best word', () => {
    expect(readRunBest(1)).toBeNull();
  });

  it('Given levels of one run, then the best word across them wins', () => {
    recordRunBest(1, 1, { word: 'cat', pts: 3 });
    recordRunBest(1, 2, { word: 'planet', pts: 12 });
    recordRunBest(1, 3, { word: 'dog', pts: 3 });
    expect(readRunBest(1)).toEqual({ word: 'planet', pts: 12 });
  });

  it('Given a level-1 record, then a new run starts and the old best is forgotten', () => {
    recordRunBest(1, 2, { word: 'planet', pts: 12 });
    recordRunBest(1, 1, { word: 'cat', pts: 3 });
    expect(readRunBest(1)).toEqual({ word: 'cat', pts: 3 });
  });

  it('keeps worlds apart and tolerates a null candidate', () => {
    recordRunBest(2, 1, { word: 'sun', pts: 3 });
    recordRunBest(1, 1, null);
    expect(readRunBest(1)).toBeNull();
    expect(readRunBest(2)).toEqual({ word: 'sun', pts: 3 });
  });

  it('survives storage that throws', () => {
    (globalThis as { sessionStorage?: unknown }).sessionStorage = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => {} };
    expect(() => recordRunBest(1, 1, { word: 'cat', pts: 3 })).not.toThrow();
    expect(readRunBest(1)).toBeNull();
  });
});

describe('run words per level (feeds the draft cards\' live values)', () => {
  beforeEach(() => { (globalThis as { sessionStorage?: unknown }).sessionStorage = memoryStorage(); });

  it('Given levels of one run, then each level keeps its words in order', async () => {
    const { recordRunWords, readRunWords } = await import('../runStorage');
    recordRunWords(1, 1, ['cat', 'dog']);
    recordRunWords(1, 2, ['planet']);
    expect(readRunWords(1)).toEqual([['cat', 'dog'], ['planet']]);
  });

  it('Given the same level recorded twice, then it is replaced, not duplicated', async () => {
    const { recordRunWords, readRunWords } = await import('../runStorage');
    recordRunWords(1, 1, ['cat']);
    recordRunWords(1, 2, ['planet']);
    recordRunWords(1, 2, ['planet', 'sun']);
    expect(readRunWords(1)).toEqual([['cat'], ['planet', 'sun']]);
  });

  it('Given a level-1 record, then the previous run\'s words are forgotten', async () => {
    const { recordRunWords, readRunWords } = await import('../runStorage');
    recordRunWords(1, 1, ['cat']);
    recordRunWords(1, 2, ['planet']);
    recordRunWords(1, 1, ['dog']);
    expect(readRunWords(1)).toEqual([['dog']]);
  });

  it('Given storage that throws, then reads come back empty', async () => {
    const { readRunWords } = await import('../runStorage');
    (globalThis as { sessionStorage?: unknown }).sessionStorage = { getItem: () => { throw new Error('blocked'); } };
    expect(readRunWords(1)).toEqual([]);
  });
});
