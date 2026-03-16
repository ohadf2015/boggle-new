import { isWordHuntQuality } from '../wordQuality';

describe('isWordHuntQuality', () => {
  describe('blocks blacklisted words', () => {
    it.each([
      'admin', 'usage', 'error', 'input', 'output', 'setup', 'debug',
      'cache', 'token', 'query', 'proxy', 'stack', 'value', 'scope',
    ])('rejects jargon word "%s"', (word) => {
      expect(isWordHuntQuality(word)).toBe(false);
    });

    it.each([
      'acne', 'acids', 'tumor', 'ulcer', 'vomit', 'mucus', 'virus',
    ])('rejects medical/unpleasant word "%s"', (word) => {
      expect(isWordHuntQuality(word)).toBe(false);
    });

    it.each([
      'abuse', 'stab', 'slash', 'maim', 'kills',
    ])('rejects violence-primary word "%s"', (word) => {
      expect(isWordHuntQuality(word)).toBe(false);
    });

    it.each([
      'about', 'after', 'their', 'which', 'would', 'every', 'under',
    ])('rejects boring abstract word "%s"', (word) => {
      expect(isWordHuntQuality(word)).toBe(false);
    });
  });

  describe('allows quality words', () => {
    it.each([
      'flame', 'shark', 'quest', 'dream', 'pearl', 'tower', 'brave',
      'ghost', 'coral', 'storm', 'river', 'eagle', 'crown', 'forge',
    ])('accepts quality word "%s"', (word) => {
      expect(isWordHuntQuality(word)).toBe(true);
    });
  });

  describe('enforces structural rules', () => {
    it('rejects words shorter than 4 letters', () => {
      expect(isWordHuntQuality('cat')).toBe(false);
      expect(isWordHuntQuality('do')).toBe(false);
    });

    it('accepts 4+ letter words', () => {
      expect(isWordHuntQuality('tree')).toBe(true);
      expect(isWordHuntQuality('flame')).toBe(true);
    });

    it('rejects words starting with 3+ consonants', () => {
      expect(isWordHuntQuality('straw')).toBe(false);
      expect(isWordHuntQuality('schnapps')).toBe(false);
    });

    it('accepts words with 1-2 leading consonants', () => {
      expect(isWordHuntQuality('bloom')).toBe(true);
      expect(isWordHuntQuality('crane')).toBe(true);
    });
  });

  describe('case insensitive', () => {
    it('blocks blacklisted words regardless of case', () => {
      expect(isWordHuntQuality('ADMIN')).toBe(false);
      expect(isWordHuntQuality('Admin')).toBe(false);
    });

    it('accepts quality words regardless of case', () => {
      expect(isWordHuntQuality('FLAME')).toBe(true);
      expect(isWordHuntQuality('Flame')).toBe(true);
    });
  });
});
