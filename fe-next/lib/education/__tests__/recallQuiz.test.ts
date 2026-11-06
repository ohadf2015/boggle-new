import { describe, expect, it } from 'vitest';
import {
  answerRecall,
  isRecallFinished,
  masteredCount,
  quizzableCards,
  recallTarget,
  startRecall,
  type RecallState,
} from '../recallQuiz';

const first = () => 0;

const deck = [
  { word: 'xylem', definition: 'Carries water up a plant' },
  { word: 'phloem', definition: 'Carries sugar around a plant' },
  { word: 'stomata', definition: 'Tiny pores on a leaf' },
  { word: 'root', definition: 'Holds the plant in the soil' },
  { word: 'petal', definition: 'Colourful part of a flower' },
];
const words = deck.map((c) => c.word);

const queueWords = (s: RecallState) => s.queue.map((k) => s.items[k].word);
const right = (s: RecallState) => answerRecall(s, s.question!.word, first);
const wrong = (s: RecallState) => answerRecall(s, s.question!.options.find((o) => o !== s.question!.word)!, first);

describe('quizzableCards', () => {
  it('given cards with and without definitions, when filtered, then only defined ones remain once each', () => {
    const out = quizzableCards([{ word: 'sun', definition: 'A star' }, { word: 'moon' }, { word: 'Sun', definition: 'dup' }, { word: 'sky', definition: '  ' }]);
    expect(out).toEqual([{ word: 'sun', definition: 'A star' }]);
  });
});

describe('recallTarget', () => {
  it('given a small deck, then each word must be recalled twice; a big deck once', () => {
    expect(recallTarget(12)).toBe(2);
    expect(recallTarget(13)).toBe(1);
  });
});

describe('startRecall', () => {
  it('given five words, when started, then every word is queued and the first question has four distinct options including the answer', () => {
    const s = startRecall(deck, { pool: words, target: 1, rng: first });
    expect(s.queue).toHaveLength(5);
    expect(new Set(queueWords(s))).toEqual(new Set(words));
    const q = s.question!;
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
    expect(q.options).toContain(q.word);
    expect(q.definition).toBe(deck.find((c) => c.word === q.word)!.definition);
  });

  it('given a pool of three words, then a question offers three options', () => {
    const s = startRecall(deck.slice(0, 3), { pool: words.slice(0, 3), target: 1, rng: first });
    expect(s.question!.options).toHaveLength(3);
  });

  it('given a distractor with the same spelling or the same definition, then it is never offered', () => {
    const items = [{ word: 'big', definition: 'Large' }, { word: 'huge', definition: 'large' }];
    const s = startRecall(items, { pool: ['big', 'BIG', 'huge', 'tiny'], target: 1, rng: first });
    const q = s.question!;
    const other = q.word === 'big' ? 'huge' : 'big';
    expect(q.options).not.toContain(other);
    expect(q.options.filter((o) => o.toLowerCase() === q.word)).toHaveLength(1);
    expect(q.options).toContain('tiny');
  });

  it('given the same seed, then the order and options repeat', () => {
    let a = 0.3;
    let b = 0.3;
    const ra = () => (a = (a * 9301 + 49297) % 1);
    const rb = () => (b = (b * 9301 + 49297) % 1);
    expect(startRecall(deck, { pool: words, target: 1, rng: ra })).toEqual(startRecall(deck, { pool: words, target: 1, rng: rb }));
  });
});

describe('answerRecall', () => {
  it('given target 1, when answered right, then the word leaves the queue and the streak grows', () => {
    const s0 = startRecall(deck, { pool: words, target: 1, rng: first });
    const asked = s0.question!.word;
    const s1 = right(s0);
    expect(queueWords(s1)).not.toContain(asked);
    expect(masteredCount(s1)).toBe(1);
    expect(s1.streak).toBe(1);
    expect(s1.last).toMatchObject({ correct: true, word: asked });
  });

  it('given target 2, when answered right once, then the word goes to the back of the queue', () => {
    const s0 = startRecall(deck, { pool: words, target: 2, rng: first });
    const asked = s0.question!.word;
    const s1 = right(s0);
    expect(queueWords(s1).at(-1)).toBe(asked);
    expect(masteredCount(s1)).toBe(0);
  });

  it('given a long queue, when answered wrong, then the word returns after three others and the streak resets', () => {
    const s0 = right(startRecall(deck, { pool: words, target: 2, rng: first }));
    const asked = s0.question!.word;
    const s1 = wrong(s0);
    expect(queueWords(s1).indexOf(asked)).toBe(3);
    expect(s1.streak).toBe(0);
    expect(s1.last).toMatchObject({ correct: false, word: asked, definition: deck.find((c) => c.word === asked)!.definition });
  });

  it('given a wrong answer, then earlier correct recalls still count', () => {
    let s = startRecall(deck.slice(0, 1), { pool: words, target: 2, rng: first });
    s = right(s);
    s = wrong(s);
    s = right(s);
    expect(isRecallFinished(s)).toBe(true);
  });

  it('given a queue shorter than three, when answered wrong, then the word goes to the end', () => {
    const s0 = startRecall(deck.slice(0, 2), { pool: words, target: 1, rng: first });
    const asked = s0.question!.word;
    const s1 = wrong(s0);
    expect(queueWords(s1)).toEqual([...queueWords(s0).slice(1), asked]);
  });

  it('given one word left, when answered wrong, then the same word is asked again', () => {
    const s0 = startRecall(deck.slice(0, 1), { pool: words, target: 1, rng: first });
    const s1 = wrong(s0);
    expect(s1.question!.word).toBe('xylem');
    expect(isRecallFinished(s1)).toBe(false);
  });

  it('given every word recalled to target, then the quiz is finished with no question', () => {
    let s = startRecall(deck.slice(0, 2), { pool: words, target: 2, rng: first });
    for (let i = 0; i < 4; i++) s = right(s);
    expect(isRecallFinished(s)).toBe(true);
    expect(s.question).toBeNull();
    expect(masteredCount(s)).toBe(2);
  });

  it('given a finished quiz, when answered again, then nothing changes', () => {
    let s = startRecall(deck.slice(0, 1), { pool: words, target: 1, rng: first });
    s = right(s);
    expect(answerRecall(s, 'xylem', first)).toBe(s);
  });

  it('given an answer in another case, then it still counts as right', () => {
    const s0 = startRecall(deck.slice(0, 1), { pool: words, target: 1, rng: first });
    expect(answerRecall(s0, 'XYLEM', first).last?.correct).toBe(true);
  });
});
