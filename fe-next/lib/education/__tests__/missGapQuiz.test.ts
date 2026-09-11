/**
 * Miss-gap homework quiz engine — RED first.
 *
 * The engine turns a class's missed words into a 2-3 minute tappable round set:
 * a 4-choice question (meaning when the teacher's definitions travelled with the
 * assignment, otherwise spot-the-spelling) and a tap-to-spell letter-tile round.
 */
import { describe, it, expect } from 'vitest';
import {
  buildMissGapRounds,
  scoreMissGapRun,
  starsForAccuracy,
  MISS_GAP_MAX_ROUNDS,
  type MissGapAnswer,
} from '../missGapQuiz';

const WORDS = ['bridge', 'anchor', 'quiver', 'marble', 'plunge', 'thistle'];

describe('buildMissGapRounds', () => {
  it('given missed words, builds one round per word capped at MISS_GAP_MAX_ROUNDS', () => {
    const many = Array.from({ length: 20 }, (_, i) => `word${i}`);
    const rounds = buildMissGapRounds({ words: many, seed: 'x' });
    expect(rounds).toHaveLength(MISS_GAP_MAX_ROUNDS);
  });

  it('given the same seed, is deterministic', () => {
    const a = buildMissGapRounds({ words: WORDS, seed: 'seed-1' });
    const b = buildMissGapRounds({ words: WORDS, seed: 'seed-1' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('given no definitions, mixes spot-the-spelling and tap-to-spell rounds', () => {
    const rounds = buildMissGapRounds({ words: WORDS, seed: 'mix' });
    const kinds = new Set(rounds.map((r) => r.kind));
    expect(kinds.has('spelling')).toBe(true);
    expect(kinds.has('spell')).toBe(true);
    expect(kinds.has('meaning')).toBe(false);
  });

  it('given definitions for every word, builds meaning rounds', () => {
    const definitions: Record<string, string> = {};
    for (const w of WORDS) definitions[w] = `the meaning of ${w}`;
    const rounds = buildMissGapRounds({ words: WORDS, seed: 'defs', definitions });
    expect(rounds.some((r) => r.kind === 'meaning')).toBe(true);
    const meaning = rounds.find((r) => r.kind === 'meaning')!;
    expect(meaning.choices).toHaveLength(4);
    expect(meaning.choices.filter((c) => c.correct)).toHaveLength(1);
    expect(meaning.choices.find((c) => c.correct)!.label).toBe(
      `the meaning of ${meaning.word}`,
    );
  });

  it('gives every choice round exactly four options with one correct answer', () => {
    const rounds = buildMissGapRounds({ words: WORDS, seed: 'choices' });
    for (const round of rounds.filter((r) => r.kind !== 'spell')) {
      expect(round.choices).toHaveLength(4);
      expect(round.choices.filter((c) => c.correct)).toHaveLength(1);
      expect(new Set(round.choices.map((c) => c.label)).size).toBe(4);
    }
  });

  it('spot-the-spelling distractors are misspellings, never the real word', () => {
    const rounds = buildMissGapRounds({ words: WORDS, seed: 'miss' });
    for (const round of rounds.filter((r) => r.kind === 'spelling')) {
      const wrong = round.choices.filter((c) => !c.correct).map((c) => c.label);
      expect(wrong).not.toContain(round.word);
      for (const w of wrong) expect(w.toLowerCase()).not.toBe(round.word.toLowerCase());
    }
  });

  it('tap-to-spell tiles contain every letter of the word', () => {
    const rounds = buildMissGapRounds({ words: WORDS, seed: 'tiles' });
    for (const round of rounds.filter((r) => r.kind === 'spell')) {
      const pool = [...round.tiles];
      for (const letter of round.word.toUpperCase()) {
        const idx = pool.indexOf(letter);
        expect(idx).toBeGreaterThanOrEqual(0);
        pool.splice(idx, 1);
      }
      expect(round.tiles.length).toBeGreaterThanOrEqual(round.word.length);
    }
  });

  it('drops blank and duplicate words', () => {
    const rounds = buildMissGapRounds({
      words: ['  ', 'Bridge', 'bridge', 'anchor'],
      seed: 'dupe',
    });
    expect(rounds.map((r) => r.word.toLowerCase())).toEqual(['bridge', 'anchor']);
  });

  it('gives every round a positive timer', () => {
    const rounds = buildMissGapRounds({ words: WORDS, seed: 'timer' });
    for (const round of rounds) expect(round.seconds).toBeGreaterThan(0);
  });
});

describe('scoreMissGapRun', () => {
  const rounds = buildMissGapRounds({ words: WORDS, seed: 'score' });
  const answer = (i: number, correct: boolean): MissGapAnswer => ({
    roundId: rounds[i].id,
    correct,
    msTaken: 1200,
  });

  it('given all correct, reports 100% accuracy and three stars', () => {
    const score = scoreMissGapRun(rounds, rounds.map((_, i) => answer(i, true)));
    expect(score.correct).toBe(rounds.length);
    expect(score.accuracy).toBe(100);
    expect(score.stars).toBe(3);
  });

  it('tracks the best run of consecutive correct answers', () => {
    const answers = [true, true, false, true, true, true].map((c, i) => answer(i, c));
    const score = scoreMissGapRun(rounds, answers);
    expect(score.bestStreak).toBe(3);
  });

  it('given a finished run with low accuracy, still awards one star', () => {
    const answers = rounds.map((_, i) => answer(i, false));
    const score = scoreMissGapRun(rounds, answers);
    expect(score.accuracy).toBe(0);
    expect(score.stars).toBe(1);
  });
});

describe('starsForAccuracy', () => {
  it('maps accuracy bands to 1-3 stars', () => {
    expect(starsForAccuracy(100)).toBe(3);
    expect(starsForAccuracy(90)).toBe(3);
    expect(starsForAccuracy(89)).toBe(2);
    expect(starsForAccuracy(70)).toBe(2);
    expect(starsForAccuracy(69)).toBe(1);
    expect(starsForAccuracy(0)).toBe(1);
  });
});
