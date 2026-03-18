import { evaluateWorldMechanic } from '../worldMechanics';

describe('worldMechanics', () => {
  describe('evaluateWorldMechanic', () => {
    it('returns no bonus for null mechanic', () => {
      const result = evaluateWorldMechanic('hello', null, []);
      expect(result.bonus).toBe(false);
      expect(result.multiplier).toBe(1.0);
    });

    it('returns no bonus for unknown mechanic', () => {
      const result = evaluateWorldMechanic('hello', 'unknownMechanic', []);
      expect(result.bonus).toBe(false);
    });

    // World 2 — Synonym Springs: word families
    describe('synonymPairs', () => {
      it('awards bonus when word shares stem with previous word', () => {
        const result = evaluateWorldMechanic('playing', 'synonymPairs', ['play']);
        expect(result.bonus).toBe(true);
        expect(result.multiplier).toBe(1.25);
      });

      it('does not award bonus for first word (no previous)', () => {
        const result = evaluateWorldMechanic('water', 'synonymPairs', []);
        expect(result.bonus).toBe(false);
      });

      it('does not award bonus for unrelated words', () => {
        const result = evaluateWorldMechanic('table', 'synonymPairs', ['chair']);
        expect(result.bonus).toBe(false);
      });

      it('does not award bonus for short words', () => {
        const result = evaluateWorldMechanic('cat', 'synonymPairs', ['cats']);
        expect(result.bonus).toBe(false);
      });
    });

    // World 3 — Root Caverns: Latin/Greek roots
    describe('etymologyRoots', () => {
      it('awards bonus for words with Latin/Greek roots', () => {
        const result = evaluateWorldMechanic('telephone', 'etymologyRoots', []);
        expect(result.bonus).toBe(true);
        expect(result.multiplier).toBe(1.3);
      });

      it('does not award for words without roots', () => {
        const result = evaluateWorldMechanic('dog', 'etymologyRoots', []);
        expect(result.bonus).toBe(false);
      });
    });

    // World 4 — Idiom Archipelago: words within words
    describe('idioms', () => {
      it('awards bonus when word contains 2+ previously found words', () => {
        const result = evaluateWorldMechanic('together', 'idioms', ['get', 'her', 'the']);
        expect(result.bonus).toBe(true);
        expect(result.multiplier).toBe(1.35);
      });

      it('does not award for word containing only 1 previous word', () => {
        const result = evaluateWorldMechanic('playing', 'idioms', ['play']);
        expect(result.bonus).toBe(false);
      });

      it('does not award for short words', () => {
        const result = evaluateWorldMechanic('cat', 'idioms', ['at', 'ca']);
        expect(result.bonus).toBe(false);
      });
    });

    // World 5 — Compound Canyon: compound word fragments
    describe('compounds', () => {
      it('awards bonus for words with compound fragments', () => {
        const result = evaluateWorldMechanic('sunlight', 'compounds', []);
        expect(result.bonus).toBe(true);
        expect(result.multiplier).toBe(1.3);
      });

      it('does not award for words without compound fragments', () => {
        const result = evaluateWorldMechanic('apple', 'compounds', []);
        expect(result.bonus).toBe(false);
      });
    });

    // World 6 — Anagram Labyrinth
    describe('anagrams', () => {
      it('awards bonus for anagrams of previous words', () => {
        const result = evaluateWorldMechanic('listen', 'anagrams', ['silent']);
        expect(result.bonus).toBe(true);
        expect(result.multiplier).toBe(1.5);
      });

      it('does not award for same word', () => {
        const result = evaluateWorldMechanic('listen', 'anagrams', ['listen']);
        expect(result.bonus).toBe(false);
      });
    });

    // World 7 — Mirror Palace
    describe('palindromes', () => {
      it('awards bonus for palindromes', () => {
        const result = evaluateWorldMechanic('kayak', 'palindromes', []);
        expect(result.bonus).toBe(true);
        expect(result.multiplier).toBe(1.5);
      });

      it('does not award for non-palindromes', () => {
        const result = evaluateWorldMechanic('hello', 'palindromes', []);
        expect(result.bonus).toBe(false);
      });

      it('does not award for 2-letter palindromes', () => {
        const result = evaluateWorldMechanic('aa', 'palindromes', []);
        expect(result.bonus).toBe(false);
      });
    });

    // World 8 — Neologism Nebula: rare/unusual words
    describe('rareWords', () => {
      it('awards bonus for words with rare bigrams', () => {
        const result = evaluateWorldMechanic('sphinx', 'rareWords', []);
        expect(result.bonus).toBe(true);
        expect(result.multiplier).toBe(1.4);
      });

      it('awards bonus for words starting with uncommon letters', () => {
        const result = evaluateWorldMechanic('xylophone', 'rareWords', []);
        expect(result.bonus).toBe(true);
      });

      it('does not award for common words', () => {
        const result = evaluateWorldMechanic('table', 'rareWords', []);
        expect(result.bonus).toBe(false);
      });

      it('does not award for short words', () => {
        const result = evaluateWorldMechanic('cat', 'rareWords', []);
        expect(result.bonus).toBe(false);
      });
    });

    // World 9 — Polyglot Peaks: unique-letter or multi-vowel words
    describe('multilingual', () => {
      it('awards bonus for all-unique-letter words of 5+ letters', () => {
        const result = evaluateWorldMechanic('fresh', 'multilingual', []);
        expect(result.bonus).toBe(true);
        expect(result.multiplier).toBe(1.35);
      });

      it('awards bonus for words with 4+ distinct vowels', () => {
        const result = evaluateWorldMechanic('education', 'multilingual', []);
        expect(result.bonus).toBe(true);
      });

      it('does not award for common repeated-letter words', () => {
        const result = evaluateWorldMechanic('hello', 'multilingual', []);
        expect(result.bonus).toBe(false);
      });

      it('does not award for short words', () => {
        const result = evaluateWorldMechanic('art', 'multilingual', []);
        expect(result.bonus).toBe(false);
      });
    });

    // World 10 — Lexicon Throne: best of all
    describe('allMechanics', () => {
      it('picks best multiplier across all mechanics', () => {
        // kayak is a palindrome (1.5x) — best possible
        const result = evaluateWorldMechanic('kayak', 'allMechanics', []);
        expect(result.bonus).toBe(true);
        expect(result.multiplier).toBe(1.5);
      });
    });

    it('includes feedbackKey when bonus is awarded', () => {
      const result = evaluateWorldMechanic('playing', 'synonymPairs', ['play']);
      expect(result.feedbackKey).toBeDefined();
      expect(result.feedbackKey).toContain('adventure.mechanic');
    });
  });
});
