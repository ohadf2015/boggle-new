/**
 * The live "is this one of the teacher's lesson words?" check must normalize
 * BOTH sides of the compare, exactly like the post-game report path does
 * (`matchKey` in backend/modules/classroomSummary.ts, whose own doc comment
 * documents this bug class and says "Normalize BOTH sides").
 *
 * Historically the live path did not: `gameStartHandler` built the Set with a
 * bare `w.toUpperCase()` and `wordValidationHandler` queried it with a bare
 * `normalizedWord.toUpperCase()`. That is an asymmetric-path bug
 * (.claude/rules/60-recurring-pitfalls.md, Class 3) with deterministic fallout:
 *
 *   he — the board carries ONLY regular-form letters (backend/utils/gameUtils.ts
 *        `hebrewLetters` has no ך ם ן ף ץ), so a student can never trace the
 *        sofit spelling a teacher correctly types. Every Hebrew lesson word
 *        ending in כ/מ/נ/פ/צ missed, always.
 *   ru — Ё is deliberately excluded from the board pool (gameUtils.ts comment:
 *        "it folds to Е at validate time"), so a lesson word spelled with ё
 *        could never be matched.
 *   es — accent agreement between what the teacher typed and what the board
 *        offered decided the match.
 *
 * Given-When-Then throughout.
 */

import { describe, it, expect } from 'vitest';
import type { Language } from '@/shared/types';
import { buildLessonVocabulary, isLessonWord } from '../../utils/lessonVocabulary';

/** Mirrors the real flow: teacher's list in, student's traced word queried. */
function matches(lessonWords: string[], submitted: string, language: Language): boolean {
  const vocab = buildLessonVocabulary(lessonWords, language);
  return isLessonWord(vocab, submitted, language);
}

describe('lesson vocabulary matching normalizes both sides', () => {
  describe('Hebrew — sofit finals (the board can only produce regular forms)', () => {
    // Fixtures verified present in the shipped dictionary backend/hebrew_words.txt
    // (which is stored pre-normalized, i.e. regular finals).
    it('matches מים (water) typed with sofit ם against the traced regular form', () => {
      expect(matches(['מים'], 'מימ', 'he')).toBe(true);
    });

    it('matches שלום (peace/hello) typed with sofit ם', () => {
      expect(matches(['שלום'], 'שלומ', 'he')).toBe(true);
    });

    it('matches חלון (window) typed with sofit ן', () => {
      expect(matches(['חלון'], 'חלונ', 'he')).toBe(true);
    });

    it('matches לחם (bread) typed with sofit ם', () => {
      expect(matches(['לחם'], 'לחמ', 'he')).toBe(true);
    });

    it('still rejects a Hebrew word that is not in the lesson', () => {
      expect(matches(['מים'], 'ספר', 'he')).toBe(false);
    });
  });

  describe('Russian — ё folds to е (Ё is not on the board at all)', () => {
    it('matches ёлка when the student can only produce елка', () => {
      expect(matches(['ёлка'], 'елка', 'ru')).toBe(true);
    });

    it('matches мёд when the student can only produce мед', () => {
      expect(matches(['мёд'], 'мед', 'ru')).toBe(true);
    });

    it('rejects a Russian word outside the lesson', () => {
      expect(matches(['ёлка'], 'вода', 'ru')).toBe(false);
    });
  });

  describe('Spanish — accents must not decide the match', () => {
    it('matches an accented lesson word against an unaccented trace', () => {
      expect(matches(['café'], 'CAFE', 'es')).toBe(true);
    });

    it('matches an unaccented lesson word against an accented trace', () => {
      expect(matches(['cafe'], 'CAFÉ', 'es')).toBe(true);
    });

    it('matches canción against cancion', () => {
      expect(matches(['canción'], 'cancion', 'es')).toBe(true);
    });

    it('does not collapse ñ into n', () => {
      expect(matches(['año'], 'ano', 'es')).toBe(false);
    });
  });

  describe('Swedish — å/ä/ö are real letters and must be preserved, not folded', () => {
    it('matches träd case-insensitively', () => {
      expect(matches(['träd'], 'TRÄD', 'sv')).toBe(true);
    });

    it('does not fold ä into a', () => {
      expect(matches(['träd'], 'TRAD', 'sv')).toBe(false);
    });
  });

  describe('Japanese — left untouched', () => {
    it('matches a hiragana lesson word exactly', () => {
      expect(matches(['みず'], 'みず', 'ja')).toBe(true);
    });
  });

  describe('English — unchanged behaviour', () => {
    it('matches case-insensitively', () => {
      expect(matches(['water'], 'WATER', 'en')).toBe(true);
    });

    it('tolerates stray whitespace in the teacher list', () => {
      expect(matches(['  water '], 'water', 'en')).toBe(true);
    });
  });

  describe('Hebrew — niqqud (vowel points) on the teacher side', () => {
    /**
     * Vowelled vs unvowelled is a real difficulty axis in Hebrew teaching, and a
     * teacher of young learners plausibly types the vowelled form. The board can
     * never carry niqqud, so without stripping it the lesson word is
     * unmatchable — the same "unmatchable by construction" shape as sofit.
     * `lib/education/produceAnswer.ts:76` already does sanitize-then-normalize
     * for exactly this reason.
     */
    it('matches מַיִם written with niqqud against the traced bare form', () => {
      expect(matches(['מַיִם'], 'מימ', 'he')).toBe(true);
    });

    it('matches a lesson word carrying an RTL mark from a pasted document', () => {
      expect(matches(['מים‏'], 'מימ', 'he')).toBe(true);
    });
  });

  describe('invisible characters from pasted lesson lists', () => {
    it('ignores a non-breaking space pasted around an English word', () => {
      expect(matches([' water '], 'water', 'en')).toBe(true);
    });

    it('ignores a zero-width space inside a pasted Spanish word', () => {
      expect(matches(['café​'], 'CAFE', 'es')).toBe(true);
    });
  });

  describe('Unicode form — the teacher types in an IME, the board does not', () => {
    /**
     * The student's word comes off the board and is always precomposed ASCII or
     * kana. The teacher's word is typed or pasted, so it can arrive in a
     * different Unicode form that is visually identical and byte-different.
     */
    it('matches a DECOMPOSED (NFD) Japanese lesson word against the traced form', () => {
      // が as か + combining dakuten (U+3099) rather than the precomposed U+304C.
      expect(matches(['がっこう'], 'がっこう', 'ja')).toBe(true);
    });

    it('matches a FULL-WIDTH Latin lesson word against an ASCII trace', () => {
      // A Japanese IME left in Japanese mode types English as full-width.
      expect(matches(['ＷＡＴＥＲ'], 'WATER', 'en')).toBe(true);
    });

    it('matches half-width katakana against its full-width form', () => {
      expect(matches(['ｶﾞ'], 'ガ', 'ja')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns false when there is no lesson vocabulary at all', () => {
      expect(isLessonWord(undefined, 'water', 'en')).toBe(false);
    });

    it('ignores empty entries in the teacher list', () => {
      const vocab = buildLessonVocabulary(['', '   ', 'water'], 'en');
      expect(vocab.size).toBe(1);
      expect(isLessonWord(vocab, 'water', 'en')).toBe(true);
    });
  });
});
