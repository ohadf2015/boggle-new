/**
 * TDD RED: grading a word the student TYPED from memory.
 *
 * Every existing vocabulary drill in this product is recognition — the student
 * picks the right word out of four. The research brief is blunt about what that
 * buys: retrieval practice benefits production/recall, and showed *no* benefit
 * over plain restudy on recognition tasks. A multiple-choice game teaches
 * choosing. Producing the word from a meaning is the half that was missing.
 *
 * Grading typed input is where a produce mode quietly dies in five of the six
 * locales we ship, so the rules are pinned per language here:
 *
 *   he — a student types without niqqud; a teacher may paste a vowelled word.
 *        Sofit finals are a second axis (ך vs כ).
 *   ru — ё and е are interchanged constantly in real typing.
 *   es — accents are routinely dropped on a phone keyboard.
 *
 * All three route through the SAME normalizer the board already uses
 * (shared/utils/wordNormalization), not a second set of rules invented here.
 *
 * The near-miss tier is deliberate. A student who types `recieve` for `receive`
 * retrieved the word and misspelled it — that is a different event from not
 * knowing it, and flattening the two into "wrong" throws away the thing the
 * teacher most wants to see. It earns partial credit, never full.
 *
 * The one thing tolerance must never do is credit a DIFFERENT word the teacher
 * is also teaching. `cell` and `sell` are one edit apart; if both are on the
 * list, a slip must not silently score the wrong one.
 */

import {
  checkProducedAnswer,
  produceScore,
  produceHint,
  PRODUCE_BASE_POINTS,
  PRODUCE_MIN_POINTS,
} from '../produceAnswer';

describe('checkProducedAnswer — exact retrieval', () => {
  it('accepts the word typed exactly', () => {
    expect(checkProducedAnswer('cell', 'cell', { language: 'en' })).toBe('correct');
  });

  it('ignores case and surrounding whitespace', () => {
    // A phone keyboard auto-capitalizes; a student pastes with a trailing space.
    expect(checkProducedAnswer('  CELL ', 'cell', { language: 'en' })).toBe('correct');
  });

  it('rejects a word the student did not produce', () => {
    expect(checkProducedAnswer('dog', 'cell', { language: 'en' })).toBe('wrong');
  });

  it('treats an empty or whitespace-only answer as wrong, never as a near miss', () => {
    expect(checkProducedAnswer('', 'cell', { language: 'en' })).toBe('wrong');
    expect(checkProducedAnswer('   ', 'cell', { language: 'en' })).toBe('wrong');
  });
});

describe('checkProducedAnswer — locale orthography', () => {
  it('he: accepts an unvowelled answer for a word the teacher entered with niqqud', () => {
    // The student types what is on their keyboard. Niqqud is stripped on both
    // sides; testing the harder opaque-orthography skill by accident is not a
    // decision anyone made.
    expect(checkProducedAnswer('שמים', 'שָׁמַיִם', { language: 'he' })).toBe('correct');
  });

  it('he: accepts the sofit spelling of a final letter', () => {
    // מלך typed with the final kaf vs stored with the regular form.
    expect(checkProducedAnswer('מלך', 'מלכ', { language: 'he' })).toBe('correct');
  });

  it('ru: folds ё to е, which real typing interchanges freely', () => {
    expect(checkProducedAnswer('еж', 'ёж', { language: 'ru' })).toBe('correct');
    expect(checkProducedAnswer('ёж', 'еж', { language: 'ru' })).toBe('correct');
  });

  it('es: accepts the unaccented spelling a phone keyboard produces', () => {
    expect(checkProducedAnswer('cancion', 'canción', { language: 'es' })).toBe('correct');
  });

  it('sv: keeps å/ä/ö significant rather than folding them to a/o', () => {
    // Swedish needs NO accent folding — å ä ö are distinct letters, and folding
    // them would accept a genuinely different word.
    expect(checkProducedAnswer('har', 'hår', { language: 'sv' })).not.toBe('correct');
  });
});

describe('checkProducedAnswer — near miss', () => {
  it('grades a one-character misspelling as a near miss, not as wrong', () => {
    expect(checkProducedAnswer('recieve', 'receive', { language: 'en' })).toBe('near-miss');
  });

  it('grades a single dropped letter as a near miss', () => {
    expect(checkProducedAnswer('cel', 'cell', { language: 'en' })).toBe('near-miss');
  });

  it('grades a two-character miss as wrong — tolerance is one slip, not a guess', () => {
    // `sall` is two substitutions from `cell`. (`cll` would NOT belong here: it
    // is a single deletion, so the rule below must and does accept it.)
    expect(checkProducedAnswer('sall', 'cell', { language: 'en' })).toBe('wrong');
    expect(checkProducedAnswer('cll', 'cell', { language: 'en' })).toBe('near-miss');
  });

  it('NEVER credits a different word from the same lesson as a near miss', () => {
    // `sell` is one edit from `cell`. If the teacher is teaching both, a slip
    // must not quietly score the word the student did not produce.
    const verdict = checkProducedAnswer('sell', 'cell', {
      language: 'en',
      otherWords: ['sell', 'bell'],
    });
    expect(verdict).toBe('wrong');
  });

  it('allows the near miss when the lookalike is NOT one of the teacher’s words', () => {
    expect(
      checkProducedAnswer('sell', 'cell', { language: 'en', otherWords: ['dog', 'house'] })
    ).toBe('near-miss');
  });

  it('does not allow near misses on very short words, where one edit is a different word', () => {
    // At 3 letters almost every neighbour is a real, different word.
    expect(checkProducedAnswer('bat', 'cat', { language: 'en' })).toBe('wrong');
  });
});

describe('produceScore — correctness first, never speed', () => {
  it('pays full points for an unaided correct production', () => {
    expect(produceScore('correct', 0)).toBe(PRODUCE_BASE_POINTS);
  });

  it('pays less for each hint taken', () => {
    const none = produceScore('correct', 0);
    const one = produceScore('correct', 1);
    const two = produceScore('correct', 2);
    expect(one).toBeLessThan(none);
    expect(two).toBeLessThan(one);
  });

  it('never drops a correct production to zero, however many hints were used', () => {
    // A student who needed the whole ladder still retrieved and produced the
    // word. Scaffolded retrieval is the mechanism, not a failure state — scoring
    // it as nothing teaches them to stop asking for help.
    for (const hints of [3, 4, 10, 99]) {
      expect(produceScore('correct', hints)).toBeGreaterThanOrEqual(PRODUCE_MIN_POINTS);
    }
  });

  it('pays a near miss less than a clean production but more than nothing', () => {
    const nearMiss = produceScore('near-miss', 0);
    expect(nearMiss).toBeGreaterThan(0);
    expect(nearMiss).toBeLessThan(produceScore('correct', 0));
  });

  it('pays nothing for a wrong answer', () => {
    expect(produceScore('wrong', 0)).toBe(0);
    expect(produceScore('wrong', 3)).toBe(0);
  });

  it('takes no time argument at all — speed cannot enter the score', () => {
    // The strongest possible statement of the accessibility constraint: there is
    // no parameter through which elapsed time could influence points. Dyslexia
    // is associated with impaired timing processing, so a clock must not be the
    // axis that decides who looks like they learned the words.
    expect(produceScore.length).toBe(2);
  });
});

describe('produceHint — a ladder, not an answer', () => {
  it('reveals the length first', () => {
    expect(produceHint('cell', 0, 'en')).toEqual({ kind: 'length', length: 4 });
  });

  it('reveals the first letter next, then a second letter', () => {
    expect(produceHint('cell', 1, 'en')).toEqual({ kind: 'letters', revealed: 'c' });
    expect(produceHint('cell', 2, 'en')).toEqual({ kind: 'letters', revealed: 'ce' });
  });

  it('stops before it can spell the whole word', () => {
    // The ladder must never hand over the answer — at that point the student is
    // copying, not retrieving, and the score would be unearned.
    for (let i = 0; i < 12; i++) {
      const hint = produceHint('cell', i, 'en');
      if (hint && hint.kind === 'letters') {
        expect(hint.revealed.length).toBeLessThan('cell'.length);
      }
    }
  });

  it('returns null once the ladder is exhausted', () => {
    expect(produceHint('cell', 99, 'en')).toBeNull();
  });
});
