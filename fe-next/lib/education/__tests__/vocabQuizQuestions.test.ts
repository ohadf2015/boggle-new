/**
 * Live Vocab Quiz — question-set assembly (RED first).
 *
 * Wraps the existing solo-practice builder (lib/education/vocabFocus) with the
 * three things a LIVE classroom round needs and solo practice does not:
 *   1. an honest per-focus question count the teacher sees BEFORE starting,
 *   2. a fallback when the chosen focus has too little data to fill a round,
 *   3. a mixed set for the `any` setting.
 *
 * Production reality this is built against (checked 2026-09-05): of 133 words
 * across 9 real lessons, 124 carry a definition and ZERO carry synonyms,
 * antonyms or example sentences. Definition-only is the normal case, not the
 * edge case, so the fallback path is the one that has to be right.
 */
import { describe, it, expect } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import { focusAvailability, buildQuizQuestions } from '../vocabQuizQuestions';
import { VOCAB_FOCUSES } from '../vocabFocus';

const word = (over: Partial<VocabularyWord> & { word: string }): VocabularyWord => ({
  canIntegrate: true,
  ...over,
});

/** Definitions only — the shape every real lesson in the database has today. */
const DEFINITIONS_ONLY: VocabularyWord[] = [
  word({ word: 'abandon', definition: 'to leave behind for good' }),
  word({ word: 'brittle', definition: 'hard but easily broken' }),
  word({ word: 'candid', definition: 'honest and direct' }),
  word({ word: 'dwindle', definition: 'to shrink little by little' }),
  word({ word: 'endure', definition: 'to keep going through hardship' }),
  word({ word: 'frantic', definition: 'wild with worry or hurry' }),
];

/** An enriched lesson — a teacher who filled in the optional columns. */
const FULLY_ENRICHED: VocabularyWord[] = [
  word({
    word: 'abandon',
    definition: 'to leave behind for good',
    synonyms: ['desert'],
    antonyms: ['keep'],
    example: 'They had to abandon the old house.',
  }),
  word({
    word: 'brittle',
    definition: 'hard but easily broken',
    synonyms: ['fragile'],
    antonyms: ['sturdy'],
    example: 'The brittle glass cracked in the cold.',
  }),
  word({
    word: 'candid',
    definition: 'honest and direct',
    synonyms: ['frank'],
    antonyms: ['evasive'],
    example: 'She gave a candid answer.',
  }),
  word({
    word: 'dwindle',
    definition: 'to shrink little by little',
    synonyms: ['shrink'],
    antonyms: ['grow'],
    example: 'Our supplies dwindle every day.',
  }),
  word({
    word: 'endure',
    definition: 'to keep going through hardship',
    synonyms: ['withstand'],
    antonyms: ['quit'],
    example: 'They endure the long winter.',
  }),
];

describe('focusAvailability', () => {
  it('reports a real question count per focus, not just "usable words"', () => {
    const counts = focusAvailability(FULLY_ENRICHED);
    expect(counts.definition).toBe(5);
    expect(counts.synonym).toBe(5);
    expect(counts.antonym).toBe(5);
    expect(counts.context).toBe(5);
  });

  it('reports zero for focuses the lesson has no data for', () => {
    const counts = focusAvailability(DEFINITIONS_ONLY);
    expect(counts.definition).toBe(6);
    expect(counts.synonym).toBe(0);
    expect(counts.antonym).toBe(0);
    expect(counts.context).toBe(0);
  });

  it('reports zero for a focus that has words but cannot fill four choices', () => {
    // Three words with definitions cannot make a 4-choice question.
    const counts = focusAvailability(DEFINITIONS_ONLY.slice(0, 3));
    expect(counts.definition).toBe(0);
  });

  it('reports zero across the board for an empty lesson', () => {
    // Keyed off the shared focus list so a newly added skill is covered here
    // automatically instead of quietly falling outside the assertion.
    const counts = focusAvailability([]);
    expect(Object.keys(counts).sort()).toEqual([...VOCAB_FOCUSES].sort());
    expect(Object.values(counts).every((n) => n === 0)).toBe(true);
  });
});

describe('buildQuizQuestions', () => {
  describe('given a focus the lesson supports', () => {
    it('builds only that focus', () => {
      const result = buildQuizQuestions(FULLY_ENRICHED, { focus: 'synonym', count: 5, seed: 'g1' });
      expect(result.focusUsed).toBe('synonym');
      expect(result.fallbackFrom).toBeNull();
      expect(result.questions).toHaveLength(5);
      expect(result.questions.every((q) => q.focus === 'synonym')).toBe(true);
    });

    it('gives every question four choices with exactly one right answer', () => {
      const { questions } = buildQuizQuestions(FULLY_ENRICHED, { focus: 'definition', count: 5, seed: 'g1' });
      for (const q of questions) {
        expect(q.choices).toHaveLength(4);
        expect(q.choices[q.answerIndex]).toBe(q.answer);
        expect(new Set(q.choices).size).toBe(4);
      }
    });

    it('caps the round at the number of questions the lesson can actually make', () => {
      const result = buildQuizQuestions(FULLY_ENRICHED, { focus: 'definition', count: 30, seed: 'g1' });
      expect(result.questions).toHaveLength(5);
    });

    it('is deterministic for a given seed and varies across seeds', () => {
      const a = buildQuizQuestions(FULLY_ENRICHED, { focus: 'definition', count: 5, seed: 'seed-a' });
      const b = buildQuizQuestions(FULLY_ENRICHED, { focus: 'definition', count: 5, seed: 'seed-a' });
      const c = buildQuizQuestions(FULLY_ENRICHED, { focus: 'definition', count: 5, seed: 'seed-b' });
      expect(a.questions).toEqual(b.questions);
      expect(a.questions.map((q) => q.word)).not.toEqual(c.questions.map((q) => q.word));
    });
  });

  describe('given a focus the lesson cannot support', () => {
    it('falls back to definition and says what it fell back from', () => {
      const result = buildQuizQuestions(DEFINITIONS_ONLY, { focus: 'synonym', count: 6, seed: 'g1' });
      expect(result.focusUsed).toBe('definition');
      expect(result.fallbackFrom).toBe('synonym');
      expect(result.questions).toHaveLength(6);
    });

    it('falls back to whatever the lesson does support when definition is also thin', () => {
      // No definitions and no example sentences: only synonym/antonym remain,
      // so a request for `context` cannot land on the usual definition fallback.
      const synonymsOnly = FULLY_ENRICHED.map((w) => ({
        ...w,
        definition: undefined,
        example: undefined,
      }));
      const result = buildQuizQuestions(synonymsOnly, { focus: 'context', count: 5, seed: 'g1' });
      expect(result.fallbackFrom).toBe('context');
      expect(['synonym', 'antonym']).toContain(result.focusUsed);
      expect(result.questions.length).toBeGreaterThan(0);
    });

    it('returns an empty round rather than a broken one when nothing is playable', () => {
      const result = buildQuizQuestions([word({ word: 'lonely' })], { focus: 'definition', count: 10, seed: 'g1' });
      expect(result.questions).toEqual([]);
      expect(result.focusUsed).toBeNull();
    });
  });

  describe("given the 'any' setting", () => {
    it('mixes every focus the lesson supports', () => {
      const result = buildQuizQuestions(FULLY_ENRICHED, { focus: 'any', count: 12, seed: 'g1' });
      const focuses = new Set(result.questions.map((q) => q.focus));
      expect(focuses.size).toBeGreaterThan(1);
      expect(result.focusUsed).toBe('any');
      expect(result.fallbackFrom).toBeNull();
    });

    it('quietly becomes a definition round when that is all the lesson has', () => {
      const result = buildQuizQuestions(DEFINITIONS_ONLY, { focus: 'any', count: 6, seed: 'g1' });
      expect(result.questions).toHaveLength(6);
      expect(result.questions.every((q) => q.focus === 'definition')).toBe(true);
    });

    it('never repeats the same lesson word twice in one mixed round', () => {
      const result = buildQuizQuestions(FULLY_ENRICHED, { focus: 'any', count: 20, seed: 'g1' });
      const words = result.questions.map((q) => q.word);
      expect(new Set(words).size).toBe(words.length);
    });
  });

  describe('persistence mapping', () => {
    // The teacher report keys on the LESSON word. For a synonym question the
    // right answer is a synonym ("desert"), which matches no lesson vocabulary
    // key — crediting `answer` instead of `word` would record zero mastery for
    // the whole class.
    it('tags every question with the lesson word, not the answer text', () => {
      const lessonWords = new Set(FULLY_ENRICHED.map((w) => w.word));
      const { questions } = buildQuizQuestions(FULLY_ENRICHED, { focus: 'synonym', count: 5, seed: 'g1' });
      expect(questions.length).toBeGreaterThan(0);
      for (const q of questions) {
        expect(lessonWords.has(q.word)).toBe(true);
        expect(q.answer).not.toBe(q.word);
      }
    });
  });
});
