/**
 * TDD RED: building prompt→PRODUCE questions from a teacher's lesson.
 *
 * The distinction this file exists to protect is the one the whole mode rests
 * on: a question is only production if the thing the student supplies is the
 * lesson word itself, and there is nothing on screen to pick it out of.
 *
 * That is easy to get subtly wrong. The existing multiple-choice drill asks the
 * synonym question the other way round — it shows the WORD and asks which of
 * four synonyms matches. Reusing that draft unchanged would produce a "produce
 * mode" in which the student types a synonym and never writes the word being
 * taught. So `word` is asserted to be the lesson word on every focus, and the
 * absence of any `choices` field is asserted outright.
 *
 * The ordering rule is the second research constraint: interleaving beats
 * blocked practice on final tests, BUT it creates an undesirable difficulty for
 * low-prior-knowledge students who have not cleared a threshold on the material.
 * Those students need blocked practice first. So words the student is meeting
 * for the first time are grouped up front, each flagged for an exposure beat,
 * and words they have already produced are interleaved only after that block.
 */

import type { VocabularyWord } from '@/lib/supabase/education/types';
import { buildProduceQuestions, produceFocusAvailability } from '../produceQuestions';

const CELL: VocabularyWord = {
  word: 'cell',
  definition: 'a small room in a prison',
  example: 'The prisoner sat alone in his ___.',
  synonyms: ['chamber'],
  antonyms: ['hall'],
  canIntegrate: true,
};

const RIVER: VocabularyWord = {
  word: 'river',
  definition: 'a large natural stream of water',
  example: 'They swam across the ___.',
  synonyms: ['stream'],
  antonyms: ['desert'],
  canIntegrate: true,
};

const MOUNTAIN: VocabularyWord = {
  word: 'mountain',
  definition: 'a very high hill',
  example: 'They climbed the ___.',
  synonyms: ['peak'],
  antonyms: ['valley'],
  canIntegrate: true,
};

const BARE: VocabularyWord = { word: 'bare', canIntegrate: true };

const LESSON = [CELL, RIVER, MOUNTAIN];

describe('buildProduceQuestions — the student produces the LESSON WORD', () => {
  it('asks for the lesson word itself on a definition cue', () => {
    const [q] = buildProduceQuestions([CELL], 'definition', { seed: 1 });
    expect(q.word).toBe('cell');
    expect(q.prompt).toBe('a small room in a prison');
  });

  it('asks for the lesson word on a context cue, keeping the blank', () => {
    const [q] = buildProduceQuestions([CELL], 'context', { seed: 1 });
    expect(q.word).toBe('cell');
    expect(q.prompt).toContain('___');
  });

  it('INVERTS the synonym cue: shows the synonym, asks for the lesson word', () => {
    // The multiple-choice drill does this the other way round (prompt = the
    // word, choices = synonyms). Reused unchanged, the student would type
    // `chamber` and never produce `cell` — recognition wearing a text box.
    const [q] = buildProduceQuestions([CELL], 'synonym', { seed: 1 });
    expect(q.word).toBe('cell');
    expect(q.prompt).toBe('chamber');
  });

  it('inverts the antonym cue the same way', () => {
    const [q] = buildProduceQuestions([CELL], 'antonym', { seed: 1 });
    expect(q.word).toBe('cell');
    expect(q.prompt).toBe('hall');
  });

  it('never emits choices — there is nothing to recognise', () => {
    // The single property that separates this mode from every drill that
    // preceded it. If a choices array ever appears, the mode has silently
    // become multiple choice.
    const questions = buildProduceQuestions(LESSON, 'definition', { seed: 7 });
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q).not.toHaveProperty('choices');
      expect(q).not.toHaveProperty('answerIndex');
    }
  });

  it('carries only the teacher’s own words as the cue, never UI prose', () => {
    // Labels like "another word for:" are UI text and must come from t() in the
    // component. Baking English into the question makes the mode untranslatable.
    const [q] = buildProduceQuestions([CELL], 'synonym', { seed: 1 });
    expect(q.prompt).toBe('chamber');
    expect(q.focus).toBe('synonym');
  });
});

describe('buildProduceQuestions — runs on lessons multiple choice cannot', () => {
  it('builds a question from a SINGLE usable word', () => {
    // Multiple choice needs four words to fill four options, so a teacher with
    // two vocabulary words gets nothing from it. Production needs no
    // distractors, so the floor is one.
    const questions = buildProduceQuestions([CELL], 'definition', { seed: 1 });
    expect(questions).toHaveLength(1);
  });

  it('skips words that lack the field the focus needs', () => {
    const questions = buildProduceQuestions([CELL, BARE], 'definition', { seed: 1 });
    expect(questions.map((q) => q.word)).toEqual(['cell']);
  });

  it('returns an empty list rather than throwing when nothing is usable', () => {
    expect(buildProduceQuestions([BARE], 'definition', { seed: 1 })).toEqual([]);
  });

  it('is deterministic for a given seed', () => {
    const a = buildProduceQuestions(LESSON, 'definition', { seed: 'abc' });
    const b = buildProduceQuestions(LESSON, 'definition', { seed: 'abc' });
    expect(a).toEqual(b);
  });

  it('honours the requested question count', () => {
    const questions = buildProduceQuestions(LESSON, 'definition', { seed: 1, count: 2 });
    expect(questions).toHaveLength(2);
  });
});

describe('buildProduceQuestions — blocked practice before interleaving', () => {
  it('flags a word the student has never produced as a first exposure', () => {
    const questions = buildProduceQuestions(LESSON, 'definition', { seed: 3 });
    expect(questions.every((q) => q.firstExposure)).toBe(true);
  });

  it('does not flag a word the student has already produced', () => {
    const questions = buildProduceQuestions(LESSON, 'definition', {
      seed: 3,
      knownWords: ['cell', 'river', 'mountain'],
    });
    expect(questions.every((q) => q.firstExposure)).toBe(false);
  });

  it('puts EVERY new word before ANY review word', () => {
    // The ordering rule, stated as a property. A student who has not cleared a
    // threshold on this lesson's new words must meet them as a block first;
    // shuffling review words in among them is the "undesirable difficulty"
    // that specifically harms low-prior-knowledge students.
    const questions = buildProduceQuestions(LESSON, 'definition', {
      seed: 5,
      knownWords: ['river'],
    });
    const firstReviewAt = questions.findIndex((q) => !q.firstExposure);
    const lastNewAt = questions.map((q) => q.firstExposure).lastIndexOf(true);
    expect(firstReviewAt).toBeGreaterThan(-1);
    expect(lastNewAt).toBeLessThan(firstReviewAt);
  });

  it('matches known words through the locale normalizer, not raw string equality', () => {
    // A student's stored history and a teacher's list disagree about case and
    // accents constantly. `Cell` must count as the same word as `cell`, or the
    // student is shown a first exposure for a word they have long known.
    const questions = buildProduceQuestions([CELL], 'definition', {
      seed: 1,
      knownWords: ['CELL'],
    });
    expect(questions[0].firstExposure).toBe(false);
  });
});

describe('produceFocusAvailability', () => {
  it('counts how many questions each cue can build from the lesson', () => {
    const counts = produceFocusAvailability([CELL, BARE]);
    expect(counts.definition).toBe(1);
    expect(counts.synonym).toBe(1);
    expect(counts.antonym).toBe(1);
    expect(counts.context).toBe(1);
  });

  it('reports zero for a cue the lesson cannot support', () => {
    const counts = produceFocusAvailability([BARE]);
    expect(counts.definition).toBe(0);
    expect(counts.context).toBe(0);
  });
});
