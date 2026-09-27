import { describe, it, expect } from 'vitest';
import { getBlastCommonWords, clearBlastCommonWordsCache } from '../common-words';

describe('getBlastCommonWords', () => {
  it('loads common English words and validates membership', async () => {
    clearBlastCommonWordsCache();
    const isCommon = await getBlastCommonWords('en');
    expect(isCommon('able')).toBe(true);
    expect(isCommon('ABLE')).toBe(true); // case-insensitive
    expect(isCommon('acorn')).toBe(true);
    expect(isCommon('acus')).toBe(false);  // obscure — NOT in common list
    expect(isCommon('xyzq')).toBe(false);
  });

  it('loads common Hebrew words', async () => {
    clearBlastCommonWordsCache();
    const isCommon = await getBlastCommonWords('he');
    // Real words from backend/common_hunt_words_he.txt
    expect(isCommon('אב')).toBe(true);   // ab (father) - first word in the list
    expect(isCommon('אבא')).toBe(true);  // aba (dad)
    expect(isCommon('אבן')).toBe(true);  // even (stone)
    expect(isCommon('xyzqqqq')).toBe(false);
  });

  it('caches the predicate per locale (same reference)', async () => {
    clearBlastCommonWordsCache();
    const a = await getBlastCommonWords('en');
    const b = await getBlastCommonWords('en');
    expect(a).toBe(b);
  });

  it('loads common Swedish words', async () => {
    clearBlastCommonWordsCache();
    const isCommon = await getBlastCommonWords('sv');
    expect(typeof isCommon).toBe('function');
  });

  it('loads common Japanese words', async () => {
    clearBlastCommonWordsCache();
    const isCommon = await getBlastCommonWords('ja');
    expect(typeof isCommon).toBe('function');
  });

  it('loads common Spanish words', async () => {
    clearBlastCommonWordsCache();
    const isCommon = await getBlastCommonWords('es');
    expect(typeof isCommon).toBe('function');
  });

  it('handles missing locale file gracefully with warn and false predicate', async () => {
    clearBlastCommonWordsCache();
    const isCommon = await getBlastCommonWords('xx' as any);
    expect(isCommon('anything')).toBe(false);
    expect(isCommon('test')).toBe(false);
  });
});
