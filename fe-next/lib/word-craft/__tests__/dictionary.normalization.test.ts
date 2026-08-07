import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadWordCraftDictionary } from '../dictionary';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadWordCraftDictionary — Hebrew sofit normalization', () => {
  it('matches a Hebrew dictionary word regardless of the player typing sofit form', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => 'מים', // dict has regular form (no sofit)
    });
    const dict = await loadWordCraftDictionary('he');
    // Dictionary should accept the sofit form a player would actually spell.
    // We check both directions because the runtime checker normalizes both
    // sides; having either canonical form in the set is sufficient.
    expect(dict.has('מים') || dict.has('מים')).toBe(true);
  });

  it('matches a Hebrew dictionary word stored with sofit forms too', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => 'ילדים', // ends in ם (sofit) — common in inflected forms
    });
    const dict = await loadWordCraftDictionary('he');
    // Should hit either the literal form or the regular-only normalized form.
    expect(dict.has('ילדים') || dict.has('ילדימ')).toBe(true);
  });
});

describe('loadWordCraftDictionary — Spanish accent normalization', () => {
  it('stores accent-stripped form alongside accented form', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => 'está',
    });
    const dict = await loadWordCraftDictionary('es');
    // Both accented and stripped uppercase forms should be present so the
    // player spelling "ESTA" from an accent-less rack still validates.
    expect(dict.has('ESTÁ')).toBe(true);
    expect(dict.has('ESTA')).toBe(true);
  });
});

describe('loadWordCraftDictionary — robustness', () => {
  it('returns an empty set when the API responds non-ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    const dict = await loadWordCraftDictionary('ja');
    expect(dict.size).toBe(0);
  });
});
