/**
 * Regression: getCachedTrie() had a per-language switch that never listed 'ru',
 * so Russian games silently fell through to the English word set. Bots then
 * solved a Cyrillic grid against an English trie and found 0 words
 * (Sentry JAVASCRIPT-NEXTJS-201/203 "[BOT] solver found 0 words (language: ru)").
 */

const englishWords = new Set(['cat', 'dog']);
const russianWords = new Set(['кот', 'дом']);
const spanishWords = new Set(['gato', 'perro']);

vi.mock('../dictionary', () => ({
  isDictionaryWord: () => true,
  normalizeWord: (w: string) => w.toLowerCase(),
  dictionary: {
    get englishWords() { return englishWords; },
    get hebrewWords() { return new Set<string>(); },
    get swedishWords() { return new Set<string>(); },
    get japaneseWords() { return new Set<string>(); },
    get spanishWords() { return spanishWords; },
    get russianWords() { return russianWords; },
  },
}));

import { getCachedTrie, getTrieNode, clearSolverCaches } from '../modules/boggleSolver';

describe('getCachedTrie language coverage', () => {
  beforeEach(() => {
    clearSolverCaches();
  });

  it('builds the Russian trie from the Russian word set, not English', () => {
    const trie = getCachedTrie('ru');
    expect(trie).not.toBeNull();
    expect(getTrieNode(trie!, 'кот')).not.toBeNull();
    expect(getTrieNode(trie!, 'cat')).toBeNull();
  });

  it('builds the Spanish trie from the Spanish word set', () => {
    const trie = getCachedTrie('es');
    expect(trie).not.toBeNull();
    expect(getTrieNode(trie!, 'gato')).not.toBeNull();
    expect(getTrieNode(trie!, 'cat')).toBeNull();
  });

  it('covers every language the dictionary ships', () => {
    for (const lang of ['en', 'es', 'ru'] as const) {
      expect(getCachedTrie(lang)).not.toBeNull();
    }
  });
});
