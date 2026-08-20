/**
 * Word Collection: gather found words from quick rounds, track new words,
 * support guest persistence via localStorage.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPlayerCollectedWords, mergeGuestWords, saveGuestWords, getNewWordsFromRound, getQuickPlayWordProgress } from '@/lib/quickPlay/wordCollection';

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe('wordCollection', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  describe('guest word persistence', () => {
    it('saves guest words to localStorage', () => {
      const words = ['apple', 'banana', 'cherry'];
      saveGuestWords(words);
      expect(mockLocalStorage.getItem('quick_play_guest_words')).toBeDefined();
      const saved = JSON.parse(mockLocalStorage.getItem('quick_play_guest_words') ?? '[]');
      expect(saved).toContain('apple');
    });

    it('retrieves guest words from localStorage', () => {
      const words = ['apple', 'banana'];
      saveGuestWords(words);
      const retrieved = getPlayerCollectedWords(null);
      expect(retrieved).toContain('apple');
    });

    it('deduplicates on merge', () => {
      const stored = ['apple', 'banana'];
      const newWords = ['banana', 'cherry'];
      saveGuestWords(stored);
      const merged = mergeGuestWords(newWords);
      expect(merged).toHaveLength(3);
      expect(merged.filter(w => w === 'banana')).toHaveLength(1);
    });
  });

  describe('guest word progress — critical ordering bug', () => {
    it('FAILS: merge-before-detect loses all new words', async () => {
      // This test EXPOSES the bug: merging BEFORE detecting new words returns []
      mockLocalStorage.clear();
      mockLocalStorage.setItem('quick_play_guest_words', JSON.stringify(['apple']));

      const roundWords = [
        { word: 'apple', score: 10 },  // Already collected
        { word: 'banana', score: 15 }, // NEW
      ];

      const progress = await getQuickPlayWordProgress(roundWords, null);

      // BUG: progress.new is [] because merge() added banana to collection first,
      // then getNewWordsFromRound compares against a set that already contains it
      console.log('BUGGY OUTPUT:', { collected: progress.collected, new: progress.new });

      // THIS WILL FAIL with current code (bug is real)
      expect(progress.new).toContain('banana');
      expect(progress.new).not.toContain('apple');
    });

    it('tracks collection across rounds: same word not reported new twice', async () => {
      mockLocalStorage.clear();

      // Round 1: find "apple" + "banana"
      const round1 = [
        { word: 'apple', score: 10 },
        { word: 'banana', score: 15 },
      ];
      const progress1 = await getQuickPlayWordProgress(round1, null);
      expect(progress1.new).toHaveLength(2);
      expect(progress1.total).toBe(2);

      // Round 2: find "apple" again (should NOT be new)
      const round2 = [
        { word: 'apple', score: 10 },
        { word: 'cherry', score: 20 },
      ];
      const progress2 = await getQuickPlayWordProgress(round2, null);

      // CRITICAL: apple was in round 2 but is NOT new
      expect(progress2.new).not.toContain('apple');
      expect(progress2.new).toContain('cherry');
      expect(progress2.total).toBe(3);
    });

    it('preserves original casing from round in new words', async () => {
      mockLocalStorage.clear();

      const roundWords = [
        { word: 'Apple', score: 10 },    // Capital A (original casing from round)
        { word: 'BANANA', score: 15 },   // All caps (original casing from round)
      ];
      const progress = await getQuickPlayWordProgress(roundWords, null);

      // new words should have original casing from the round, not lowercased
      expect(progress.new).toContain('Apple');
      expect(progress.new).toContain('BANANA');
      expect(progress.new).not.toContain('apple');
      expect(progress.new).not.toContain('banana');
    });
  });

  describe('new word detection', () => {
    it('identifies words new to a player', () => {
      const allCollected = ['apple', 'banana'];
      const roundWords = ['apple', 'banana', 'cherry', 'date'];
      const newWords = getNewWordsFromRound(roundWords, allCollected);
      expect(newWords).toEqual(['cherry', 'date']);
    });

    it('handles empty collection', () => {
      const roundWords = ['apple', 'banana'];
      const newWords = getNewWordsFromRound(roundWords, []);
      expect(newWords).toEqual(['apple', 'banana']);
    });

    it('handles case-insensitive comparison', () => {
      const allCollected = ['APPLE', 'Banana'];
      const roundWords = ['apple', 'banana', 'cherry'];
      const newWords = getNewWordsFromRound(roundWords, allCollected);
      expect(newWords).toEqual(['cherry']);
    });
  });
});
