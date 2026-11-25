import { describe, it, expect, beforeEach } from 'vitest';
import { getHebrewWordSet, getSwedishWordSet, __resetSharedWordSetsForTest } from '../sharedWordSets';
import {
  createSafeReadFile,
  loadHebrewDictionary,
  loadSwedishDictionary,
} from '../../../backend/dictionaryLoaders';

// The Express game and the Next routes run in one process but load these lists
// through separately bundled modules; they must still hold one copy between them.
describe('sharedWordSets — one copy shared with the Express dictionary', () => {
  beforeEach(() => {
    __resetSharedWordSetsForTest();
  });

  it('Given Express loaded Hebrew first, When a Next route asks, Then it gets the same Set', async () => {
    const express = await loadHebrewDictionary(createSafeReadFile());
    expect(getHebrewWordSet()).toBe(express);
  });

  it('Given a Next route loaded Swedish first, When Express loads it, Then it reuses that Set', async () => {
    const next = getSwedishWordSet();
    expect(await loadSwedishDictionary(createSafeReadFile())).toBe(next);
  });

  it('Given both sides build Hebrew independently, Then membership is identical', async () => {
    const next = new Set(getHebrewWordSet());
    __resetSharedWordSetsForTest();
    const express = await loadHebrewDictionary(createSafeReadFile());
    expect(express.size).toBe(next.size);
    expect([...express].every((w) => next.has(w))).toBe(true);
  });
});
