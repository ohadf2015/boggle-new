import { evaluateWorldMechanic } from '../worldMechanics';

describe('worldMechanics', () => {
  describe('evaluateWorldMechanic', () => {
    it('should return no bonus for null mechanic', () => {
      const result = evaluateWorldMechanic('hello', null, []);
      expect(result.bonus).toBe(false);
      expect(result.multiplier).toBe(1.0);
    });

    it('should award synonymPairs bonus for 5+ letter words', () => {
      const result = evaluateWorldMechanic('water', 'synonymPairs', []);
      expect(result.bonus).toBe(true);
      expect(result.multiplier).toBe(1.25);
    });

    it('should not award synonymPairs for short words', () => {
      const result = evaluateWorldMechanic('cat', 'synonymPairs', []);
      expect(result.bonus).toBe(false);
    });

    it('should award etymologyRoots for words with Latin/Greek roots', () => {
      const result = evaluateWorldMechanic('telephone', 'etymologyRoots', []);
      expect(result.bonus).toBe(true);
      expect(result.multiplier).toBe(1.3);
    });

    it('should not award etymologyRoots for words without roots', () => {
      const result = evaluateWorldMechanic('dog', 'etymologyRoots', []);
      expect(result.bonus).toBe(false);
    });

    it('should award palindromes bonus', () => {
      const result = evaluateWorldMechanic('kayak', 'palindromes', []);
      expect(result.bonus).toBe(true);
      expect(result.multiplier).toBe(1.5);
    });

    it('should not award palindromes for non-palindromes', () => {
      const result = evaluateWorldMechanic('hello', 'palindromes', []);
      expect(result.bonus).toBe(false);
    });

    it('should award anagrams for words that are anagrams of previous', () => {
      const result = evaluateWorldMechanic('listen', 'anagrams', ['silent']);
      expect(result.bonus).toBe(true);
      expect(result.multiplier).toBe(1.5);
    });

    it('should not award anagrams for same word', () => {
      const result = evaluateWorldMechanic('listen', 'anagrams', ['listen']);
      expect(result.bonus).toBe(false);
    });

    it('should award compounds for 5+ letter words with double letters', () => {
      const result = evaluateWorldMechanic('coffee', 'compounds', []);
      expect(result.bonus).toBe(true);
      expect(result.multiplier).toBe(1.3);
    });

    it('should pick best multiplier for allMechanics', () => {
      // kayak is a palindrome (1.5x) — best possible
      const result = evaluateWorldMechanic('kayak', 'allMechanics', []);
      expect(result.bonus).toBe(true);
      expect(result.multiplier).toBe(1.5);
    });

    it('should return no bonus for unknown mechanic', () => {
      const result = evaluateWorldMechanic('hello', 'unknownMechanic', []);
      expect(result.bonus).toBe(false);
    });

    it('should include feedbackKey when bonus is awarded', () => {
      const result = evaluateWorldMechanic('water', 'synonymPairs', []);
      expect(result.feedbackKey).toBeDefined();
      expect(result.feedbackKey).toContain('adventure.mechanic');
    });
  });
});
