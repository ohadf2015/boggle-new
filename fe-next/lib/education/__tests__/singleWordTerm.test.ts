/**
 * Teacher lists feed the letter board, which only plays single words. A list
 * "If you are reading this...." saved "Rely on", "Hospice care" and "Blood
 * transfusion" — none of them can ever be played. These guard every path that
 * turns teacher input into lesson words.
 */
import {
  isMultiWordTerm,
  partitionTerms,
  invalidLessonTerms,
  withoutMultiWordTerms,
  formatRejectedTerms,
} from '../singleWordTerm';
import { mergeWords, MAX_LIST_WORDS } from '../library';
import { validateWordGoal } from '../wordGoalAssignment';
import { STARTER_LESSON_PACKS } from '../starterLessonPacks';
import { ASSIGNMENT_TEMPLATES } from '../assignmentTemplates';
import { FIRST_ASSIGNMENT_TEMPLATES } from '../firstAssignmentTemplates';

describe('isMultiWordTerm', () => {
  it.each(['Rely on', 'Hospice care', 'Blood transfusion', 'well-being', 'in–addition', 'a/b', 'snake_case', 'בית ספר', 'בית־ספר', '  two  words  '])(
    'rejects %j',
    (term) => expect(isMultiWordTerm(term)).toBe(true),
  );

  it.each(['cat', '  dog  ', 'café', "don't", "ג'ירפה", 'שָׁלוֹם', 'pre-', '-ish', 'солнце', '単語'])(
    'keeps %j',
    (term) => expect(isMultiWordTerm(term)).toBe(false),
  );

  it('treats empty input as not multi-word (dropped elsewhere)', () => {
    expect(isMultiWordTerm('')).toBe(false);
    expect(isMultiWordTerm('   ')).toBe(false);
  });
});

describe('list helpers', () => {
  const words = [
    { word: 'rely', canIntegrate: true },
    { word: 'Rely on', canIntegrate: false },
    { word: 'Hospice care', canIntegrate: false },
    { word: 'transfusion', canIntegrate: true },
  ];

  it('partitions pasted terms and keeps the original text of rejected ones', () => {
    expect(partitionTerms(['cat', ' Rely on ', '', 'dog'])).toEqual({ valid: ['cat', 'dog'], rejected: ['Rely on'] });
  });

  it('lists the multi-word terms in a lesson', () => {
    expect(invalidLessonTerms(words)).toEqual(['Rely on', 'Hospice care']);
    expect(invalidLessonTerms(null)).toEqual([]);
  });

  it('copies a list without its multi-word rows and leaves the source alone', () => {
    const copy = withoutMultiWordTerms(words);
    expect(copy.map((w) => w.word)).toEqual(['rely', 'transfusion']);
    expect(words).toHaveLength(4);
  });

  it('previews at most three terms', () => {
    expect(formatRejectedTerms(['a b', 'c d'])).toBe('"a b", "c d"');
    expect(formatRejectedTerms(['a b', 'c d', 'e f', 'g h', 'i j'])).toBe('"a b", "c d", "e f" +2');
  });
});

describe('mergeWords (paste, CSV/TSV file, starter pack in the list editor)', () => {
  it('never adds a multi-word term and reports it back', () => {
    const { words, added, rejected } = mergeWords(
      [{ word: 'cat', canIntegrate: true }],
      [{ word: 'Rely on' }, { word: 'dog' }, { word: 'Blood transfusion', definition: 'x' }],
      'en',
    );
    expect(words.map((w) => w.word)).toEqual(['cat', 'dog']);
    expect(added).toBe(1);
    expect(rejected).toEqual(['Rely on', 'Blood transfusion']);
    expect(MAX_LIST_WORDS).toBeGreaterThan(0);
  });
});

describe('validateWordGoal (word-list homework)', () => {
  it('rejects a list with multi-word terms and names them', () => {
    const r = validateWordGoal({ kind: 'word_list', dueDate: '2026-10-30', wordListRaw: 'cat, Rely on, dog\nHospice care' });
    expect(r).toEqual({ ok: false, error: 'multi_word_terms', rejected: ['Rely on', 'Hospice care'] });
  });

  it('still accepts a single-word list', () => {
    const r = validateWordGoal({ kind: 'word_list', dueDate: '2026-10-30', wordListRaw: 'cat, dog, fish' });
    expect(r.ok).toBe(true);
  });
});

describe('curated lists the app creates lessons from', () => {
  it('contain no multi-word terms (they would now be refused on save)', () => {
    const all = [
      ...STARTER_LESSON_PACKS.flatMap((p) => p.words.map((w) => w.word)),
      ...ASSIGNMENT_TEMPLATES.flatMap((t) => t.words.map((w) => w.word)),
      ...FIRST_ASSIGNMENT_TEMPLATES.flatMap((t) => t.words.map((w) => w.word)),
    ];
    expect(all.length).toBeGreaterThan(0);
    expect(all.filter(isMultiWordTerm)).toEqual([]);
  });
});
