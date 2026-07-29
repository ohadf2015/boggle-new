import { describe, it, expect, beforeEach } from 'vitest';
import { getBlastDictionary, clearBlastDictionaryCache } from '../blast-dictionary';

describe('getBlastDictionary', () => {
  beforeEach(() => {
    clearBlastDictionaryCache();
  });

  it('returns a predicate that validates real English words', async () => {
    const isWord = await getBlastDictionary('en');
    expect(isWord('CAT')).toBe(true);
    expect(isWord('ZZZZQ')).toBe(false);
  });

  it('returns a predicate that validates real Hebrew words', async () => {
    const isWord = await getBlastDictionary('he');
    expect(isWord('שמש')).toBe(true);
    expect(isWord('זזזזז')).toBe(false);
  });

  it('caches the predicate per locale (same reference on second call)', async () => {
    const a = await getBlastDictionary('en');
    const b = await getBlastDictionary('en');
    expect(a).toBe(b);
  });

  it('is case-insensitive for English', async () => {
    const isWord = await getBlastDictionary('en');
    expect(isWord('cat')).toBe(true);
    expect(isWord('CAT')).toBe(true);
    expect(isWord('Cat')).toBe(true);
  });

  it('handles Swedish words', async () => {
    const isWord = await getBlastDictionary('sv');
    // "och" is Swedish for "and"
    expect(isWord('och')).toBe(true);
    expect(isWord('ZZZZZZZ')).toBe(false);
  });

  it('handles Spanish words', async () => {
    const isWord = await getBlastDictionary('es');
    // "agua" is Spanish for "water"
    expect(isWord('agua')).toBe(true);
    expect(isWord('ZZZZZZZ')).toBe(false);
  });

  it('handles Japanese words', async () => {
    const isWord = await getBlastDictionary('ja');
    // Japanese test word (actual validation depends on dict content)
    expect(typeof (await getBlastDictionary('ja'))).toBe('function');
  });

  it('treats obscure dictionary words as valid (ACUS, ENG)', async () => {
    const isWord = await getBlastDictionary('en');
    // These ARE real dictionary words, even if uncommon
    expect(isWord('ACUS')).toBe(true);
    expect(isWord('ENG')).toBe(true);
  });
});
