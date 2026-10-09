import { describe, it, expect } from 'vitest';
import { freqKey, tokenizeForFreq, countTokens, topCounts, rankOf, selectFreqCandidates } from '../frequency';

describe('tokenizeForFreq', () => {
  it('es: lowercases, folds accents, keeps ñ, drops digits and non-Spanish letters', () => {
    expect(tokenizeForFreq('el niño comió 3 árboles, árbol y ça-va', 'es')).toEqual([
      'el', 'niño', 'comio', 'arboles', 'arbol', 'y', 'va',
    ]);
  });

  it('ru: lowercases, folds ё to е, drops Latin tokens', () => {
    expect(tokenizeForFreq('ёлка и ёлка стоят в moscow 1990 года', 'ru')).toEqual([
      'елка', 'и', 'елка', 'стоят', 'в', 'года',
    ]);
  });

  it('skips capitalized tokens so proper nouns (Asia, Анна) do not lift their common-noun homographs', () => {
    expect(tokenizeForFreq('Asia y asia; Анна и анна', 'es')).toEqual(['y', 'asia']);
    expect(tokenizeForFreq('Анна и анна', 'ru')).toEqual(['и', 'анна']);
  });

  it('NFC-normalizes decomposed accents before folding', () => {
    expect(tokenizeForFreq('café mañana', 'es')).toEqual(['cafe', 'mañana']);
  });
});

describe('freqKey', () => {
  it('matches the tokenizer keying so lookups fold the same way', () => {
    expect(freqKey('Árbol', 'es')).toBe('arbol');
    expect(freqKey('ЁЖ', 'ru')).toBe('еж');
  });
});

describe('countTokens + topCounts', () => {
  const counts = countTokens(['la casa y la casa', 'la mesa'], 'es');

  it('counts across texts', () => {
    expect(counts.get('la')).toBe(3);
    expect(counts.get('casa')).toBe(2);
    expect(counts.get('mesa')).toBe(1);
  });

  it('ranks by count desc, ties alphabetically, capped at N', () => {
    expect(topCounts(counts, 3)).toEqual([['la', 3], ['casa', 2], ['mesa', 1]]);
    expect(topCounts(counts, 2)).toEqual([['la', 3], ['casa', 2]]);
  });
});

describe('rankOf', () => {
  const inTop = rankOf([['la', 9], ['casa', 5], ['árbol', 2]] as [string, number][], 'es');

  it('is true only for words within the top N (1-based), folded like the corpus', () => {
    expect(inTop('la', 1)).toBe(true);
    expect(inTop('casa', 1)).toBe(false);
    expect(inTop('Casa', 2)).toBe(true);
    expect(inTop('arbol', 3)).toBe(true);
    expect(inTop('perro', 40000)).toBe(false);
  });
});

describe('selectFreqCandidates', () => {
  const inTop = rankOf([['casa', 9], ['árbol', 8], ['mesa', 7], ['león', 6], ['zzz', 5], ['comer', 4], ['oso', 1]] as [string, number][], 'es');
  const dict = new Set(['casa', 'arbol', 'mesa', 'leon', 'oso', 'comer']);

  it('keeps 3-4 letter in-dictionary top-N words not already banked, keyed folded but looked up as spelled', () => {
    const out = selectFreqCandidates(['casa', 'Árbol', 'mesa', 'león', 'oso', 'comer', 'zzz', 'casa'], {
      lang: 'es', inTop, n: 6, dict, bankKeys: new Set(['mesa', 'león']),
    });
    expect(out).toEqual([{ word: 'casa', key: 'casa' }]);
  });

  it('dedupes against the folded form of existing bank keys', () => {
    const out = selectFreqCandidates(['leon'], { lang: 'es', inTop, n: 7, dict, bankKeys: new Set(['león']) });
    expect(out).toEqual([]);
  });

  it('skips words a reviewer denied (folded match)', () => {
    const out = selectFreqCandidates(['casa', 'oso'], { lang: 'es', inTop, n: 7, dict, bankKeys: new Set(), deny: new Set(['Casa']) });
    expect(out).toEqual([{ word: 'oso', key: 'oso' }]);
  });

  it('admits 5-6 letter words when maxLen is 6 (ru mini pools are 4x4..6x6)', () => {
    const ruTop = rankOf([['город', 3], ['дом', 2], ['елка', 1]] as [string, number][], 'ru');
    const dict = new Set(['город', 'дом', 'елка']);
    expect(selectFreqCandidates(['город', 'дом', 'елка'], { lang: 'ru', inTop: ruTop, n: 3, dict, bankKeys: new Set(), maxLen: 6 }))
      .toEqual([{ word: 'город', key: 'город' }, { word: 'дом', key: 'дом' }, { word: 'елка', key: 'елка' }]);
    expect(selectFreqCandidates(['город'], { lang: 'ru', inTop: ruTop, n: 3, dict, bankKeys: new Set() })).toEqual([]);
  });

  it('respects N and folds ru ё for the key', () => {
    const ruTop = rankOf([['ёж', 1], ['елка', 2], ['дом', 3]] as [string, number][], 'ru');
    const out = selectFreqCandidates(['ёлка', 'дом'], { lang: 'ru', inTop: ruTop, n: 2, dict: new Set(['елка', 'дом']), bankKeys: new Set() });
    expect(out).toEqual([{ word: 'ёлка', key: 'елка' }]);
  });
});
