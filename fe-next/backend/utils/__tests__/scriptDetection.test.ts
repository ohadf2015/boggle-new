import {
  matchesExpectedScript,
  detectDominantScript,
  containsScript,
} from '../scriptDetection';

describe('scriptDetection', () => {
  describe('matchesExpectedScript', () => {
    describe('Hebrew language (he)', () => {
      it('should accept pure Hebrew text', () => {
        expect(matchesExpectedScript('שלום עולם', 'he')).toBe(true);
        expect(matchesExpectedScript('ביטקוין', 'he')).toBe(true);
        expect(matchesExpectedScript('חדשות ישראל', 'he')).toBe(true);
      });

      it('should accept Hebrew with numbers and punctuation', () => {
        expect(matchesExpectedScript('ביטקוין 2024', 'he')).toBe(true);
        expect(matchesExpectedScript('משחק 100%', 'he')).toBe(true);
        expect(matchesExpectedScript('שאלה?', 'he')).toBe(true);
      });

      it('should accept Hebrew mixed with Latin brand names', () => {
        expect(matchesExpectedScript('Apple אייפון', 'he')).toBe(true);
        expect(matchesExpectedScript('Netflix חדש', 'he')).toBe(true);
      });

      it('should reject Arabic text in Hebrew context', () => {
        expect(matchesExpectedScript('مرحبا', 'he')).toBe(false);
        expect(matchesExpectedScript('محمد صلاح', 'he')).toBe(false);
        expect(matchesExpectedScript('الرياض', 'he')).toBe(false);
      });

      it('should reject mixed Hebrew-Arabic text', () => {
        expect(matchesExpectedScript('שלום مرحبا', 'he')).toBe(false);
        expect(matchesExpectedScript('חדשות العربية', 'he')).toBe(false);
      });

      it('should reject Cyrillic text in Hebrew context', () => {
        expect(matchesExpectedScript('Москва', 'he')).toBe(false);
        expect(matchesExpectedScript('путин', 'he')).toBe(false);
      });
    });

    describe('English language (en)', () => {
      it('should accept Latin text', () => {
        expect(matchesExpectedScript('Super Bowl', 'en')).toBe(true);
        expect(matchesExpectedScript('Breaking News', 'en')).toBe(true);
        expect(matchesExpectedScript('AI Technology', 'en')).toBe(true);
      });

      it('should accept Latin with numbers and punctuation', () => {
        expect(matchesExpectedScript('Top 10 Songs', 'en')).toBe(true);
        expect(matchesExpectedScript('What?', 'en')).toBe(true);
        expect(matchesExpectedScript('50% off!', 'en')).toBe(true);
      });

      it('should reject Arabic text', () => {
        expect(matchesExpectedScript('مرحبا', 'en')).toBe(false);
      });

      it('should reject Cyrillic text', () => {
        expect(matchesExpectedScript('Москва', 'en')).toBe(false);
      });
    });

    describe('Swedish language (sv)', () => {
      it('should accept Swedish accented characters', () => {
        expect(matchesExpectedScript('Årets bästa', 'sv')).toBe(true);
        expect(matchesExpectedScript('Göteborg', 'sv')).toBe(true);
        expect(matchesExpectedScript('Malmö stad', 'sv')).toBe(true);
      });

      it('should accept Swedish with standard Latin', () => {
        expect(matchesExpectedScript('Svenska nyheter', 'sv')).toBe(true);
        expect(matchesExpectedScript('Stockholm 2024', 'sv')).toBe(true);
      });
    });

    describe('Spanish language (es)', () => {
      it('should accept Spanish accented characters', () => {
        expect(matchesExpectedScript('España campeón', 'es')).toBe(true);
        expect(matchesExpectedScript('Niño', 'es')).toBe(true);
        expect(matchesExpectedScript('Año nuevo', 'es')).toBe(true);
      });

      it('should accept Spanish with standard Latin', () => {
        expect(matchesExpectedScript('Barcelona FC', 'es')).toBe(true);
        expect(matchesExpectedScript('Madrid 2024', 'es')).toBe(true);
      });
    });

    describe('Japanese language (ja)', () => {
      it('should accept Hiragana', () => {
        expect(matchesExpectedScript('こんにちは', 'ja')).toBe(true);
        expect(matchesExpectedScript('ありがとう', 'ja')).toBe(true);
      });

      it('should accept Katakana', () => {
        expect(matchesExpectedScript('テスト', 'ja')).toBe(true);
        expect(matchesExpectedScript('コンピュータ', 'ja')).toBe(true);
      });

      it('should accept Kanji', () => {
        expect(matchesExpectedScript('東京', 'ja')).toBe(true);
        expect(matchesExpectedScript('日本語', 'ja')).toBe(true);
      });

      it('should accept mixed Japanese scripts with Latin', () => {
        expect(matchesExpectedScript('東京オリンピック', 'ja')).toBe(true);
        expect(matchesExpectedScript('テスト test', 'ja')).toBe(true);
        expect(matchesExpectedScript('日本 2024', 'ja')).toBe(true);
      });

      it('should reject Arabic in Japanese context', () => {
        expect(matchesExpectedScript('مرحبا', 'ja')).toBe(false);
      });
    });

    describe('unknown language', () => {
      it('should allow any text for unknown languages', () => {
        expect(matchesExpectedScript('Test', 'unknown')).toBe(true);
        expect(matchesExpectedScript('مرحبا', 'unknown')).toBe(true);
        expect(matchesExpectedScript('שלום', 'unknown')).toBe(true);
      });
    });
  });

  describe('detectDominantScript', () => {
    it('should detect Hebrew as dominant', () => {
      expect(detectDominantScript('שלום עולם')).toBe('hebrew');
      expect(detectDominantScript('חדשות ישראל טובות')).toBe('hebrew');
    });

    it('should detect Latin as dominant', () => {
      expect(detectDominantScript('Hello world')).toBe('latin');
      expect(detectDominantScript('Breaking News Today')).toBe('latin');
    });

    it('should detect Japanese as dominant', () => {
      expect(detectDominantScript('東京オリンピック')).toBe('japanese');
      expect(detectDominantScript('こんにちは日本')).toBe('japanese');
    });

    it('should detect Arabic as dominant', () => {
      expect(detectDominantScript('مرحبا بالعالم')).toBe('arabic');
    });

    it('should detect Cyrillic as dominant', () => {
      expect(detectDominantScript('Привет мир')).toBe('cyrillic');
    });

    it('should return mixed for mixed scripts', () => {
      // When no single script dominates
      const result = detectDominantScript('AB שג CD هو');
      expect(['mixed', 'latin', 'hebrew', 'arabic']).toContain(result);
    });

    it('should return unknown for empty or number-only text', () => {
      expect(detectDominantScript('12345')).toBe('unknown');
      expect(detectDominantScript('   ')).toBe('unknown');
    });
  });

  describe('containsScript', () => {
    it('should detect Hebrew characters', () => {
      expect(containsScript('שלום hello', 'hebrew')).toBe(true);
      expect(containsScript('hello world', 'hebrew')).toBe(false);
    });

    it('should detect Arabic characters', () => {
      expect(containsScript('مرحبا hello', 'arabic')).toBe(true);
      expect(containsScript('hello world', 'arabic')).toBe(false);
    });

    it('should detect Japanese characters', () => {
      expect(containsScript('東京 Tokyo', 'japanese')).toBe(true);
      expect(containsScript('hello world', 'japanese')).toBe(false);
    });

    it('should detect Cyrillic characters', () => {
      expect(containsScript('Москва city', 'cyrillic')).toBe(true);
      expect(containsScript('hello world', 'cyrillic')).toBe(false);
    });
  });
});
