/**
 * Two new vocabulary skills a 6th–7th grade ELA teacher asked for and nothing
 * covered: multiple-meaning words and roots/affixes.
 *
 * Both are built off per-word data the teacher enters in the lesson editor
 * (`meanings: string[]`, `morphology: { root, prefix, suffix, rootMeaning }`)
 * and both must stay deterministic per seed like the original four focuses.
 */
import { describe, it, expect } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import {
  VOCAB_FOCUSES,
  availableFocuses,
  buildFocusQuestions,
  focusQuestionCounts,
  lessonWordStats,
  minWordsForFocus,
  usableForFocus,
  isVocabFocus,
  CHOICES_PER_QUESTION,
} from '../vocabFocus';
import {
  cleanMeanings,
  cleanMorphology,
  formatMorpheme,
  MULTI_MEANING_MIN_SENSES,
  ROOT_MEANING_BANK,
  AFFIX_BANK,
} from '../vocabFocusSkills';

const w = (word: string, extra: Partial<VocabularyWord> = {}): VocabularyWord => ({
  word,
  canIntegrate: true,
  ...extra,
});

const multiLesson: VocabularyWord[] = [
  w('bank', { meanings: ['the land beside a river', 'a place that keeps money'] }),
  w('trunk', { meanings: ['the thick stem of a tree', 'the storage space of a car'] }),
  w('pitch', { meanings: ['to throw a ball', 'how high or low a sound is'] }),
  w('wave', { meanings: ['a moving ridge of water', 'to move your hand in greeting'] }),
];

const rootLesson: VocabularyWord[] = [
  w('aquarium', { morphology: { root: 'aqua', rootMeaning: 'water' } }),
  w('biology', { morphology: { root: 'bio', rootMeaning: 'life' } }),
  w('telephone', { morphology: { root: 'phon', rootMeaning: 'sound' } }),
  w('portable', { morphology: { root: 'port', rootMeaning: 'carry' } }),
];

const affixLesson: VocabularyWord[] = [
  w('unhappy', { morphology: { prefix: 'un' } }),
  w('rebuild', { morphology: { prefix: 're' } }),
  w('careless', { morphology: { suffix: 'less' } }),
  w('joyful', { morphology: { suffix: 'ful' } }),
];

const opts = { seed: 'test', language: 'en' as const };

describe('vocabFocusSkills — data helpers', () => {
  it('cleanMeanings drops blanks and de-duplicates case-insensitively', () => {
    expect(cleanMeanings(w('x', { meanings: ['A river edge', '  ', 'a river edge', 'money place'] })))
      .toEqual(['A river edge', 'money place']);
    expect(cleanMeanings(w('x'))).toEqual([]);
  });

  it('cleanMorphology returns null when every part is blank', () => {
    expect(cleanMorphology(w('x', { morphology: { root: '  ', prefix: '' } }))).toBeNull();
    expect(cleanMorphology(w('x'))).toBeNull();
    expect(cleanMorphology(w('x', { morphology: { root: ' aqua ', rootMeaning: ' water ' } })))
      .toEqual({ root: 'aqua', rootMeaning: 'water' });
  });

  it('formatMorpheme marks where the part attaches', () => {
    expect(formatMorpheme('prefix', 'un')).toBe('un-');
    expect(formatMorpheme('suffix', 'ful')).toBe('-ful');
    expect(formatMorpheme('root', 'aqua')).toBe('aqua');
    // A teacher who already typed the hyphen is not double-hyphenated
    expect(formatMorpheme('prefix', 'un-')).toBe('un-');
    expect(formatMorpheme('suffix', '-ful')).toBe('-ful');
  });
});

describe('the focus union carries both new skills', () => {
  it('lists them after the original four, in canonical order', () => {
    expect([...VOCAB_FOCUSES]).toEqual([
      'definition',
      'synonym',
      'antonym',
      'context',
      'multiple_meaning',
      'roots_affixes',
    ]);
  });

  it('accepts them as valid focus values', () => {
    expect(isVocabFocus('multiple_meaning')).toBe(true);
    expect(isVocabFocus('roots_affixes')).toBe(true);
    expect(isVocabFocus('roots-affixes')).toBe(false);
  });

  it('gives the new skills their own, lower word minimum', () => {
    expect(minWordsForFocus('definition')).toBe(4);
    expect(minWordsForFocus('multiple_meaning')).toBe(2);
    expect(minWordsForFocus('roots_affixes')).toBe(2);
  });
});

describe('usableForFocus', () => {
  it('needs two distinct senses for multiple_meaning', () => {
    expect(usableForFocus(w('bank', { meanings: ['only one sense'] }), 'multiple_meaning')).toBe(false);
    expect(usableForFocus(w('bank', { meanings: ['a', 'b'] }), 'multiple_meaning')).toBe(true);
    expect(MULTI_MEANING_MIN_SENSES).toBe(2);
  });

  it('needs at least one word part for roots_affixes', () => {
    expect(usableForFocus(w('unhappy'), 'roots_affixes')).toBe(false);
    expect(usableForFocus(w('unhappy', { morphology: {} }), 'roots_affixes')).toBe(false);
    expect(usableForFocus(w('unhappy', { morphology: { prefix: 'un' } }), 'roots_affixes')).toBe(true);
  });
});

describe('buildFocusQuestions — multiple_meaning', () => {
  it('asks which lesson word carries BOTH senses', () => {
    const qs = buildFocusQuestions(multiLesson, 'multiple_meaning', { ...opts, count: 4 });
    expect(qs.length).toBeGreaterThan(0);
    const bank = qs.find((q) => q.word === 'bank')!;
    expect(bank.prompt).toContain('the land beside a river');
    expect(bank.prompt).toContain('a place that keeps money');
    expect(bank.answer).toBe('bank');
    expect(bank.choices[bank.answerIndex]).toBe('bank');
    expect(bank.choices).toHaveLength(CHOICES_PER_QUESTION);
  });

  it('draws distractors from the lesson words, never repeating the answer', () => {
    const qs = buildFocusQuestions(multiLesson, 'multiple_meaning', { ...opts, count: 4 });
    for (const q of qs) {
      expect(new Set(q.choices.map((c) => c.toLowerCase())).size).toBe(CHOICES_PER_QUESTION);
      const lessonWords = multiLesson.map((x) => x.word);
      expect(q.choices.every((c) => lessonWords.includes(c))).toBe(true);
    }
  });

  it('falls back to the built-in bank when the lesson is too small (English only)', () => {
    const tiny = [
      w('bank', { meanings: ['a river edge', 'a money place'] }),
      w('trunk', { meanings: ['a tree stem', 'a car boot'] }),
    ];
    const qs = buildFocusQuestions(tiny, 'multiple_meaning', { ...opts, count: 2 });
    expect(qs.length).toBeGreaterThan(0);
    expect(qs[0].choices).toHaveLength(CHOICES_PER_QUESTION);
  });

  it('does NOT use the English bank for a non-English lesson', () => {
    const hebrew = [
      w('קרן', { meanings: ['חלק בראש של חיה', 'כסף שהופרש למטרה'] }),
      w('ערך', { meanings: ['שווי של דבר', 'פריט במילון'] }),
    ];
    // Only 2 lesson words → 1 distractor available → no full 4-choice question
    expect(buildFocusQuestions(hebrew, 'multiple_meaning', { seed: 'he', language: 'he', count: 2 })).toEqual([]);
  });

  it('is deterministic per seed', () => {
    const a = buildFocusQuestions(multiLesson, 'multiple_meaning', { ...opts, count: 4 });
    const b = buildFocusQuestions(multiLesson, 'multiple_meaning', { ...opts, count: 4 });
    expect(a).toEqual(b);
  });

  it('skips words with only one sense', () => {
    const mixed = [...multiLesson, w('single', { meanings: ['just the one'] })];
    const qs = buildFocusQuestions(mixed, 'multiple_meaning', { ...opts, count: 10 });
    expect(qs.some((q) => q.word === 'single')).toBe(false);
  });
});

describe('buildFocusQuestions — roots_affixes', () => {
  it('asks what a root means when the teacher supplied a root meaning', () => {
    const qs = buildFocusQuestions(rootLesson, 'roots_affixes', { ...opts, count: 4 });
    const aqua = qs.find((q) => q.word === 'aquarium')!;
    expect(aqua.prompt).toContain('aqua');
    expect(aqua.prompt).toContain('aquarium');
    expect(aqua.answer).toBe('water');
    expect(aqua.choices).toHaveLength(CHOICES_PER_QUESTION);
    expect(aqua.choices[aqua.answerIndex]).toBe('water');
  });

  it('prefers other lesson root meanings as distractors before the built-in bank', () => {
    const qs = buildFocusQuestions(rootLesson, 'roots_affixes', { ...opts, count: 4 });
    const aqua = qs.find((q) => q.word === 'aquarium')!;
    const fromLesson = ['life', 'sound', 'carry'];
    expect(aqua.choices.filter((c) => fromLesson.includes(c))).toHaveLength(3);
  });

  it('asks which part the word carries when no root meaning was given', () => {
    const qs = buildFocusQuestions(affixLesson, 'roots_affixes', { ...opts, count: 4 });
    const unhappy = qs.find((q) => q.word === 'unhappy')!;
    expect(unhappy.prompt).toBe('unhappy');
    expect(unhappy.answer).toBe('un-');
    expect(unhappy.choices).toContain('un-');
    expect(unhappy.choices).toHaveLength(CHOICES_PER_QUESTION);
  });

  it('tops up thin distractor pools from the affix bank', () => {
    const tiny = [w('unhappy', { morphology: { prefix: 'un' } }), w('joyful', { morphology: { suffix: 'ful' } })];
    const qs = buildFocusQuestions(tiny, 'roots_affixes', { ...opts, count: 2 });
    expect(qs.length).toBeGreaterThan(0);
    expect(qs[0].choices).toHaveLength(CHOICES_PER_QUESTION);
    expect(AFFIX_BANK.length).toBeGreaterThan(3);
    expect(ROOT_MEANING_BANK.length).toBeGreaterThan(3);
  });

  it('never offers the correct answer twice', () => {
    const collide = [
      w('aquarium', { morphology: { root: 'aqua', rootMeaning: 'water' } }),
      w('aquatic', { morphology: { root: 'aqua', rootMeaning: 'water' } }),
      w('biology', { morphology: { root: 'bio', rootMeaning: 'life' } }),
      w('telephone', { morphology: { root: 'phon', rootMeaning: 'sound' } }),
    ];
    for (const q of buildFocusQuestions(collide, 'roots_affixes', { ...opts, count: 4 })) {
      const matches = q.choices.filter((c) => c.toLowerCase() === q.answer.toLowerCase());
      expect(matches).toHaveLength(1);
    }
  });

  it('skips words with no morphology at all', () => {
    const mixed = [...rootLesson, w('plain')];
    const qs = buildFocusQuestions(mixed, 'roots_affixes', { ...opts, count: 10 });
    expect(qs.some((q) => q.word === 'plain')).toBe(false);
  });
});

describe('readiness is derived from the builder, not from a word count', () => {
  it('unlocks the new focuses only when questions can actually be built', () => {
    expect(availableFocuses(multiLesson)).toContain('multiple_meaning');
    expect(availableFocuses(rootLesson)).toContain('roots_affixes');
    expect(availableFocuses([w('a'), w('b'), w('c'), w('d')])).toEqual([]);
  });

  it('does not unlock a focus whose questions all collapse', () => {
    // Two words, no bank (Hebrew) → cannot fill 4 choices
    const hebrew = [
      w('קרן', { meanings: ['חלק בראש', 'כסף'] }),
      w('ערך', { meanings: ['שווי', 'פריט'] }),
    ];
    expect(availableFocuses(hebrew, { language: 'he' })).not.toContain('multiple_meaning');
  });

  it('focusQuestionCounts reports one number per focus, matching the builder', () => {
    const counts = focusQuestionCounts(rootLesson, { seed: 'counts', language: 'en' });
    expect(counts.roots_affixes).toBe(
      buildFocusQuestions(rootLesson, 'roots_affixes', { seed: 'counts', language: 'en' }).length
    );
    expect(counts.definition).toBe(0);
    expect(Object.keys(counts).sort()).toEqual([...VOCAB_FOCUSES].sort());
  });
});

describe('lessonWordStats counts the new data', () => {
  it('reports words with 2+ senses and words with any word part', () => {
    const stats = lessonWordStats([
      w('bank', { meanings: ['a', 'b'] }),
      w('single', { meanings: ['only one'] }),
      w('unhappy', { morphology: { prefix: 'un' } }),
      w('plain'),
    ]);
    expect(stats.withMeanings).toBe(1);
    expect(stats.withMorphology).toBe(1);
    expect(stats.total).toBe(4);
  });
});
