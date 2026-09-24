import { describe, it, expect } from 'vitest';
import {
  LEITNER_INTERVAL_DAYS,
  REVIEW_RUN_SIZE,
  reviewKey,
  collectReviewCandidates,
  applyLeitnerAnswer,
  pickRunLesson,
  buildReviewRun,
  scoreReviewAnswer,
  summarizeReviewRun,
  type LeitnerState,
  type ReviewLessonInput,
} from '../missedWordsReview';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 23, 12);

const lesson = (id: string, words: Array<string | { word: string; definition?: string }>, language: ReviewLessonInput['language'] = 'en'): ReviewLessonInput => ({
  id,
  name: id,
  language,
  words: words.map((w) => (typeof w === 'string' ? { word: w } : w)),
});

describe('collectReviewCandidates', () => {
  it('GIVEN classroom attempts WHEN collected THEN missed words rank above unattempted, mastered words are dropped', () => {
    const c = collectReviewCandidates(
      [lesson('L1', ['apple', 'banana', 'cherry', 'grape'])],
      [{ lesson_id: 'L1', words_attempted: { banana: { attempts: 3, correct: 1 }, cherry: { attempts: 2, correct: 2 } }, words_mastered: ['grape'] }],
    );
    expect(c.map((x) => x.word)).toEqual(['banana', 'apple', 'cherry']);
    expect(c[0]).toMatchObject({ lessonId: 'L1', misses: 2 });
  });

  it('GIVEN a Hebrew progress key stored without final forms WHEN collected THEN it still matches the lesson word', () => {
    const c = collectReviewCandidates(
      [lesson('H', ['שלום', 'ספר'], 'he')],
      [{ lesson_id: 'H', words_attempted: { 'שלומ': { attempts: 2, correct: 0 } }, words_mastered: [] }],
    );
    expect(c[0]).toMatchObject({ word: 'שלום', misses: 2 });
  });

  it('GIVEN phrases and single letters WHEN collected THEN only reviewable words remain', () => {
    const c = collectReviewCandidates([lesson('L', ['ice cream', 'a', 'dog'])], []);
    expect(c.map((x) => x.word)).toEqual(['dog']);
  });

  it('GIVEN no progress rows WHEN collected THEN every lesson word is a candidate (derived from unmastered words)', () => {
    expect(collectReviewCandidates([lesson('L', ['dog', 'cat'])], [])).toHaveLength(2);
  });
});

describe('applyLeitnerAnswer', () => {
  it('GIVEN a new word answered right WHEN applied THEN it moves to box 2 and is due after box-2 interval', () => {
    const e = applyLeitnerAnswer(undefined, true, NOW);
    expect(e.box).toBe(2);
    expect(e.due).toBe(NOW + LEITNER_INTERVAL_DAYS[2] * DAY);
  });

  it('GIVEN a box-4 word answered wrong WHEN applied THEN it drops to box 1 and is due now', () => {
    const e = applyLeitnerAnswer({ box: 4, due: NOW - DAY, lapses: 0 }, false, NOW);
    expect(e).toEqual({ box: 1, due: NOW, lapses: 1 });
  });

  it('GIVEN a box-5 word answered right WHEN applied THEN it stays capped at 5', () => {
    expect(applyLeitnerAnswer({ box: 5, due: NOW, lapses: 0 }, true, NOW).box).toBe(5);
  });
});

describe('pickRunLesson + buildReviewRun', () => {
  const lessons = [lesson('A', ['dog', 'cat']), lesson('B', ['sun', 'moon', 'star', 'sky'])];

  it('GIVEN no Leitner state WHEN picking THEN the lesson with the most candidates wins', () => {
    const cands = collectReviewCandidates(lessons, []);
    expect(pickRunLesson(cands, {}, NOW)).toBe('B');
  });

  it('GIVEN a preferred lesson WHEN picking THEN it wins if it has candidates', () => {
    const cands = collectReviewCandidates(lessons, []);
    expect(pickRunLesson(cands, {}, NOW, 'A')).toBe('A');
    expect(pickRunLesson(cands, {}, NOW, 'nope')).toBe('B');
  });

  it('GIVEN not-yet-due words WHEN building THEN due and new words come first, and the run is always REVIEW_RUN_SIZE cards when any word exists', () => {
    const cands = collectReviewCandidates(lessons, []);
    const state: LeitnerState = {
      [reviewKey('B', 'sun')]: { box: 3, due: NOW + 5 * DAY, lapses: 0 },
      [reviewKey('B', 'moon')]: { box: 1, due: NOW - DAY, lapses: 2 },
    };
    const run = buildReviewRun(cands, state, NOW, 'B', 7);
    expect(run).toHaveLength(REVIEW_RUN_SIZE);
    expect(run[0].word).toBe('moon'); // overdue box 1 first
    // not-due 'sun' only appears after all due/new words have had a turn
    const firstSun = run.findIndex((c) => c.word === 'sun');
    const others = new Set(run.slice(0, firstSun).map((c) => c.word));
    expect(others).toEqual(new Set(['moon', 'star', 'sky']));
    expect(run.every((c) => c.lessonId === 'B')).toBe(true);
  });

  it('GIVEN no candidates WHEN building THEN the run is empty', () => {
    expect(buildReviewRun([], {}, NOW, null, 1)).toEqual([]);
  });

  it('GIVEN definitions for 4+ words WHEN building THEN meaning cards get 3 distractors from the same lesson; otherwise unscramble', () => {
    const defs = lesson('D', [
      { word: 'dog', definition: 'a pet that barks' },
      { word: 'cat', definition: 'a pet that purrs' },
      { word: 'cow', definition: 'gives milk' },
      { word: 'owl', definition: 'hoots at night' },
      { word: 'ant' },
    ]);
    const run = buildReviewRun(collectReviewCandidates([defs], []), {}, NOW, 'D', 3);
    const meaning = run.find((c) => c.word === 'dog')!;
    expect(meaning.kind).toBe('meaning');
    if (meaning.kind === 'meaning') {
      expect(meaning.options).toHaveLength(4);
      expect(meaning.options).toContain('a pet that barks');
      expect(new Set(meaning.options).size).toBe(4);
    }
    const ant = run.find((c) => c.word === 'ant')!;
    expect(ant.kind).toBe('unscramble');
    if (ant.kind === 'unscramble') {
      expect([...ant.tiles].sort()).toEqual(['a', 'n', 't']);
    }
  });

  it('GIVEN the same seed WHEN building twice THEN the run is identical (deterministic)', () => {
    const cands = collectReviewCandidates(lessons, []);
    expect(buildReviewRun(cands, {}, NOW, 'B', 42)).toEqual(buildReviewRun(cands, {}, NOW, 'B', 42));
  });
});

describe('scoring', () => {
  it('GIVEN a growing streak WHEN scoring THEN points climb and cap, wrong answers score 0', () => {
    expect(scoreReviewAnswer(false, 0)).toBe(0);
    expect(scoreReviewAnswer(true, 1)).toBe(100);
    expect(scoreReviewAnswer(true, 2)).toBe(125);
    expect(scoreReviewAnswer(true, 5)).toBe(200);
    expect(scoreReviewAnswer(true, 9)).toBe(200);
  });

  it('GIVEN a run of answers WHEN summarized THEN totals, best streak and chest tier are derived', () => {
    const s = summarizeReviewRun([true, true, false, true, true, true, true, true, true, true]);
    expect(s).toMatchObject({ correct: 9, total: 10, bestStreak: 7, chest: 'gold' });
    expect(s.score).toBeGreaterThan(900);
    expect(summarizeReviewRun([true, false, true, false, true, false, true]).chest).toBe('silver');
    expect(summarizeReviewRun([false, false, true]).chest).toBe('bronze');
    expect(summarizeReviewRun([]).chest).toBe('bronze');
  });
});

describe('buildReviewRun — graphemes', () => {
  const ACUTE = String.fromCharCode(0x301); // combining acute (NFD)
  const onlyMarks = /^\p{M}+$/u;

  it('GIVEN a Hebrew word with niqqud and an NFD accented word WHEN scrambled THEN every tile is a whole letter (marks stay on their letter)', () => {
    const cards = buildReviewRun(
      collectReviewCandidates([lesson('H', ['שָׁלוֹם'], 'he'), lesson('E', ['cafe' + ACUTE], 'es')], []),
      {}, NOW, 'H', 3,
    ).concat(buildReviewRun(collectReviewCandidates([lesson('E', ['cafe' + ACUTE], 'es')], []), {}, NOW, 'E', 3));
    const heb = cards.find((c) => c.lessonId === 'H' && c.kind === 'unscramble');
    const esp = cards.find((c) => c.lessonId === 'E' && c.kind === 'unscramble');
    if (heb?.kind !== 'unscramble' || esp?.kind !== 'unscramble') throw new Error('expected unscramble cards');
    expect(heb.tiles).toHaveLength(4);
    expect(esp.tiles).toHaveLength(4);
    for (const tile of [...heb.tiles, ...esp.tiles]) expect(onlyMarks.test(tile)).toBe(false);
    expect(heb.tiles.join('').length).toBe('שָׁלוֹם'.length);
  });

  it('GIVEN a pointed Hebrew word longer than 12 code points but under 12 letters WHEN collected THEN it is still reviewable', () => {
    const pointed = 'הִתְרַגַּשְׁתִּי';
    expect(pointed.length).toBeGreaterThan(12);
    expect(collectReviewCandidates([lesson('H', [pointed], 'he')], []).map((c) => c.word)).toEqual([pointed]);
  });
});
