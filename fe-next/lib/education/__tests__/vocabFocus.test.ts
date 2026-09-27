/**
 * vocabFocus — pure question builder for targeted vocabulary practice
 * (definition / synonym / antonym / context clues).
 */
import { describe, it, expect } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import {
  VOCAB_FOCUSES,
  MIN_WORDS_PER_FOCUS,
  availableFocuses,
  buildFocusQuestions,
  lessonWordStats,
  parseFocusParam,
  readAssignmentFocus,
  focusPracticeHref,
  isVocabFocus,
} from '../vocabFocus';

const w = (word: string, extra: Partial<VocabularyWord> = {}): VocabularyWord => ({
  word,
  canIntegrate: true,
  ...extra,
});

const fullLesson: VocabularyWord[] = [
  w('happy', { definition: 'feeling joy', synonyms: ['glad', 'cheerful'], antonyms: ['sad'], example: 'The ___ dog wagged its tail.' }),
  w('brave', { definition: 'not afraid', synonyms: ['bold'], antonyms: ['cowardly'], example: 'The ___ knight faced the dragon.' }),
  w('quick', { definition: 'moving fast', synonyms: ['fast', 'rapid'], antonyms: ['slow'], example: 'A ___ rabbit ran by.' }),
  w('tiny', { definition: 'very small', synonyms: ['little'], antonyms: ['huge'], example: 'A ___ ant crawled up.' }),
  w('loud', { definition: 'making a lot of noise', synonyms: ['noisy'], antonyms: ['quiet'], example: 'The ___ drum woke everyone.' }),
];

describe('vocabFocus', () => {
  describe('availableFocuses', () => {
    it('returns nothing for a lesson with only bare words', () => {
      // Given words with no extra data
      const words = [w('a'), w('b'), w('c'), w('d')];
      // When
      const focuses = availableFocuses(words);
      // Then
      expect(focuses).toEqual([]);
    });

    it('unlocks a focus only once at least MIN_WORDS_PER_FOCUS words carry that data', () => {
      // Given 3 words with synonyms + 1 without
      const words = [
        w('a', { synonyms: ['x'] }),
        w('b', { synonyms: ['y'] }),
        w('c', { synonyms: ['z'] }),
        w('d'),
      ];
      expect(MIN_WORDS_PER_FOCUS).toBe(4);
      expect(availableFocuses(words)).not.toContain('synonym');
      // When the 4th gets a synonym
      words[3] = w('d', { synonyms: ['q'] });
      expect(availableFocuses(words)).toContain('synonym');
    });

    it('lists the four classic focuses for a fully-filled lesson, in canonical order', () => {
      // multiple_meaning / roots_affixes need their own per-word data, which
      // this lesson does not carry — see vocabFocusSkills.test.ts.
      expect(availableFocuses(fullLesson)).toEqual(['definition', 'synonym', 'antonym', 'context']);
      expect(VOCAB_FOCUSES.slice(0, 4)).toEqual(['definition', 'synonym', 'antonym', 'context']);
    });

    it('ignores empty strings / whitespace-only data', () => {
      const words = [
        w('a', { definition: '  ', synonyms: ['', ' '] }),
        w('b', { definition: '  ' }),
        w('c', { definition: '' }),
        w('d', { definition: 'real' }),
      ];
      expect(availableFocuses(words)).toEqual([]);
    });

    it('treats an example that mentions the word but has no blank as usable for context', () => {
      const words = [
        w('happy', { example: 'The happy dog barked.' }),
        w('brave', { example: 'The ___ knight.' }),
        w('quick', { example: 'The ___ fox.' }),
        w('tiny', { example: 'A ___ ant.' }),
      ];
      expect(availableFocuses(words)).toContain('context');
    });
  });

  describe('buildFocusQuestions', () => {
    it('is deterministic for the same seed and differs for another seed', () => {
      const a = buildFocusQuestions(fullLesson, 'synonym', { count: 5, seed: 42 });
      const b = buildFocusQuestions(fullLesson, 'synonym', { count: 5, seed: 42 });
      const c = buildFocusQuestions(fullLesson, 'synonym', { count: 5, seed: 7 });
      expect(a).toEqual(b);
      expect(a.map((q) => q.word).join() === c.map((q) => q.word).join()
        && a.map((q) => q.choices.join()).join() === c.map((q) => q.choices.join()).join()).toBe(false);
    });

    it('builds 4-choice questions with exactly one right answer at answerIndex', () => {
      const qs = buildFocusQuestions(fullLesson, 'definition', { count: 5, seed: 1 });
      expect(qs).toHaveLength(5);
      for (const q of qs) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices.map((c) => c.toLowerCase())).size).toBe(4);
        expect(q.answerIndex).toBeGreaterThanOrEqual(0);
        expect(q.answerIndex).toBeLessThan(4);
        expect(q.choices[q.answerIndex]).toBe(q.answer);
        expect(q.focus).toBe('definition');
      }
    });

    it('definition focus: prompt is the definition and choices are lesson words', () => {
      const qs = buildFocusQuestions(fullLesson, 'definition', { count: 5, seed: 3 });
      const lessonWords = fullLesson.map((x) => x.word);
      for (const q of qs) {
        const src = fullLesson.find((x) => x.word === q.word)!;
        expect(q.prompt).toBe(src.definition);
        expect(q.answer).toBe(q.word);
        for (const c of q.choices) expect(lessonWords).toContain(c);
      }
    });

    it('synonym focus: prompt is the word, answer is one of its synonyms, distractors come from OTHER words', () => {
      const qs = buildFocusQuestions(fullLesson, 'synonym', { count: 5, seed: 9 });
      expect(qs).toHaveLength(5);
      for (const q of qs) {
        const src = fullLesson.find((x) => x.word === q.word)!;
        expect(q.prompt).toBe(src.word);
        expect(src.synonyms).toContain(q.answer);
        const distractors = q.choices.filter((_, i) => i !== q.answerIndex);
        for (const d of distractors) {
          // never one of this word's own synonyms, never the word itself
          expect(src.synonyms).not.toContain(d);
          expect(d).not.toBe(src.word);
          // must be a synonym of some other lesson word
          const owner = fullLesson.find((x) => x.word !== src.word && x.synonyms?.includes(d));
          expect(owner).toBeDefined();
        }
      }
    });

    it('antonym focus: mirrors synonym logic using antonyms', () => {
      const qs = buildFocusQuestions(fullLesson, 'antonym', { count: 5, seed: 11 });
      expect(qs).toHaveLength(5);
      for (const q of qs) {
        const src = fullLesson.find((x) => x.word === q.word)!;
        expect(src.antonyms).toContain(q.answer);
        const distractors = q.choices.filter((_, i) => i !== q.answerIndex);
        for (const d of distractors) {
          expect(src.antonyms).not.toContain(d);
          expect(fullLesson.some((x) => x.word !== src.word && x.antonyms?.includes(d))).toBe(true);
        }
      }
    });

    it('context focus: prompt is the sentence with a blank and choices are lesson words', () => {
      const qs = buildFocusQuestions(fullLesson, 'context', { count: 5, seed: 5 });
      expect(qs).toHaveLength(5);
      for (const q of qs) {
        expect(q.prompt).toContain('___');
        expect(q.prompt.toLowerCase()).not.toContain(q.word.toLowerCase());
        expect(q.answer).toBe(q.word);
        for (const c of q.choices) expect(fullLesson.map((x) => x.word)).toContain(c);
      }
    });

    it('context focus: blanks out the word when the teacher forgot the ___', () => {
      const words = [
        w('happy', { example: 'The Happy dog barked.' }),
        w('brave', { example: 'The ___ knight.' }),
        w('quick', { example: 'The ___ fox.' }),
        w('tiny', { example: 'A ___ ant.' }),
      ];
      const qs = buildFocusQuestions(words, 'context', { count: 4, seed: 2 });
      const happyQ = qs.find((q) => q.word === 'happy')!;
      expect(happyQ.prompt).toBe('The ___ dog barked.');
    });

    it('caps the count at the number of usable words and never repeats a word', () => {
      const qs = buildFocusQuestions(fullLesson, 'antonym', { count: 50, seed: 1 });
      expect(qs).toHaveLength(5);
      expect(new Set(qs.map((q) => q.word)).size).toBe(5);
    });

    it('returns [] when fewer than MIN_WORDS_PER_FOCUS words are usable', () => {
      const words = [w('a', { synonyms: ['x'] }), w('b', { synonyms: ['y'] }), w('c', { synonyms: ['z'] })];
      expect(buildFocusQuestions(words, 'synonym', { count: 5, seed: 1 })).toEqual([]);
    });

    it('carries the definition along for feedback', () => {
      const qs = buildFocusQuestions(fullLesson, 'synonym', { count: 5, seed: 1 });
      const q = qs.find((x) => x.word === 'happy')!;
      expect(q.definition).toBe('feeling joy');
    });

    it('skips a word whose distractor pool is too thin (all other synonyms collide)', () => {
      // Given: every word shares the same synonym, so no valid distractors exist for any of them
      const words = [
        w('a', { synonyms: ['same'] }),
        w('b', { synonyms: ['same'] }),
        w('c', { synonyms: ['same'] }),
        w('d', { synonyms: ['same'] }),
      ];
      expect(buildFocusQuestions(words, 'synonym', { count: 4, seed: 1 })).toEqual([]);
    });
  });

  describe('lessonWordStats', () => {
    it('counts words with each kind of data', () => {
      expect(lessonWordStats(fullLesson)).toEqual({
        total: 5,
        withDefinitions: 5,
        withSynonyms: 5,
        withAntonyms: 5,
        withExamples: 5,
        withMeanings: 0,
        withMorphology: 0,
      });
      expect(lessonWordStats([w('a', { definition: 'x' }), w('b', { synonyms: ['y'] }), w('c')])).toEqual({
        total: 3,
        withDefinitions: 1,
        withSynonyms: 1,
        withAntonyms: 0,
        withExamples: 0,
        withMeanings: 0,
        withMorphology: 0,
      });
    });
  });

  describe('URL / assignment helpers', () => {
    it('parseFocusParam only accepts the four focuses', () => {
      expect(parseFocusParam('synonym')).toBe('synonym');
      expect(parseFocusParam('context')).toBe('context');
      expect(parseFocusParam('any')).toBeNull();
      expect(parseFocusParam('nope')).toBeNull();
      expect(parseFocusParam(null)).toBeNull();
      expect(parseFocusParam(undefined)).toBeNull();
    });

    it('isVocabFocus is a type guard', () => {
      expect(isVocabFocus('antonym')).toBe(true);
      expect(isVocabFocus('any')).toBe(false);
      expect(isVocabFocus(3)).toBe(false);
    });

    it('readAssignmentFocus tolerates any assignment shape', () => {
      expect(readAssignmentFocus({ practice_focus: 'synonym' })).toBe('synonym');
      expect(readAssignmentFocus({ practice_focus: 'any' })).toBeNull();
      expect(readAssignmentFocus({ practice_focus: null })).toBeNull();
      expect(readAssignmentFocus({})).toBeNull();
      expect(readAssignmentFocus(null)).toBeNull();
      expect(readAssignmentFocus(undefined)).toBeNull();
    });

    it('focusPracticeHref deep-links into the lesson practice page', () => {
      expect(focusPracticeHref('en', 'abc', 'context')).toBe('/en/student/lessons/abc?mode=vocab_focus&focus=context');
      expect(focusPracticeHref('he', 'abc', null)).toBe('/he/student/lessons/abc?mode=vocab_focus');
    });
  });
});
