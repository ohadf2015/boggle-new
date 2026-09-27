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
    it('rejects words shorter than 5 letters', () => {
      expect(isWordHuntQuality('cat')).toBe(false);
      expect(isWordHuntQuality('do')).toBe(false);
      expect(isWordHuntQuality('tree')).toBe(false);
      expect(isWordHuntQuality('bird')).toBe(false);
    });

    it('accepts 5+ letter words', () => {
      expect(isWordHuntQuality('flame')).toBe(true);
      expect(isWordHuntQuality('shark')).toBe(true);
      expect(isWordHuntQuality('castle')).toBe(true);
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

  describe('multilingual script support', () => {
    it('accepts Hebrew nouns (no Latin vowels)', () => {
      // Without language-aware filtering, Hebrew words have 0 Latin vowels
      // and would be rejected wholesale, blocking 6,856-noun pipeline output.
      expect(isWordHuntQuality('ציפור', 'he')).toBe(true);
      expect(isWordHuntQuality('משפחה', 'he')).toBe(true);
      expect(isWordHuntQuality('שולחן', 'he')).toBe(true);
    });

    it('accepts Japanese kanji compounds (no Latin vowels)', () => {
      // Japanese 5+ char threshold doesn't apply (ja uses 2-char kanji compounds),
      // but the per-language min is enforced upstream. Verify the script-blind
      // vowel heuristic doesn't reject 5+ kanji words.
      expect(isWordHuntQuality('日本語学校', 'ja')).toBe(true);
      expect(isWordHuntQuality('東京タワー学校', 'ja')).toBe(true);
    });

    it('accepts Swedish words with å/ä/ö (non-Latin vowels)', () => {
      // BJÖRN, FÅGEL, KVÄLL — only vowels are å/ä/ö, would be rejected
      // by Latin-only [aeiou] check.
      expect(isWordHuntQuality('björn', 'sv')).toBe(true);
      expect(isWordHuntQuality('fågel', 'sv')).toBe(true);
      expect(isWordHuntQuality('kväll', 'sv')).toBe(true);
    });

    it('still rejects Hebrew blacklisted words', () => {
      expect(isWordHuntQuality('רומבולה', 'he')).toBe(false);
      expect(isWordHuntQuality('פיליבסטר', 'he')).toBe(false);
    });

    it('still enforces 5-letter floor across scripts', () => {
      expect(isWordHuntQuality('בית', 'he')).toBe(false); // 3 chars
      expect(isWordHuntQuality('björn', 'sv')).toBe(true); // 5 chars
      expect(isWordHuntQuality('häst', 'sv')).toBe(false); // 4 chars
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
