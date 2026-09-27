/**
 * Tests for the canonical, process-wide word-set cache.
 *
 * The whole point of this module is that each big word list exists ONCE in the
 * heap: every consumer that asks for the same language must get the very same
 * Set instance back (identity, not just equality). If a second call rebuilt the
 * Set, we'd be back to the per-module duplication that OOM'd the server.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getEnglishWordSet,
  getSpanishBaseWordSet,
  getHebrewWordSet,
  getSwedishWordSet,
  __resetSharedWordSetsForTest,
} from '../sharedWordSets';

describe('sharedWordSets — single-copy caching', () => {
  beforeEach(() => {
    __resetSharedWordSetsForTest();
  });

  it('returns the SAME English Set instance on repeated calls (no duplicate copy)', async () => {
    const a = await getEnglishWordSet();
    const b = await getEnglishWordSet();
    expect(b).toBe(a); // identity — proves one copy in the heap
    expect(a.has('hello')).toBe(true);
    expect(a.has('HELLO')).toBe(false); // stored lowercased
  });

  it('returns the SAME Spanish base Set instance on repeated calls', async () => {
    const a = await getSpanishBaseWordSet();
    const b = await getSpanishBaseWordSet();
    expect(b).toBe(a);
    // Spanish base list is lowercased; a common word must be present.
    expect(a.has('hola')).toBe(true);
  });

  it('returns the SAME Hebrew Set instance on repeated calls', () => {
    const a = getHebrewWordSet();
    const b = getHebrewWordSet();
    expect(b).toBe(a);
    expect(a.size).toBeGreaterThan(0);
  });

  it('returns the SAME Swedish Set instance on repeated calls', () => {
    const a = getSwedishWordSet();
    const b = getSwedishWordSet();
    expect(b).toBe(a);
    expect(a.size).toBeGreaterThan(0);
  });

  it('English and Spanish caches are independent instances', async () => {
    const en = await getEnglishWordSet();
    const es = await getSpanishBaseWordSet();
    expect(en).not.toBe(es);
  });
});
