import { describe, it, expect } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import { addQuizPlayer, createQuizSession, submitQuizAnswer, advanceQuiz } from '../vocabQuizEngine';
import { armBoss, bossFor, bossDefeated, bossMaxHp, scoreBossHits } from '../vocabQuizBoss';

const LESSON: VocabularyWord[] = [
  { word: 'abandon', definition: 'to leave behind for good', canIntegrate: true },
  { word: 'brittle', definition: 'hard but easily broken', canIntegrate: true },
  { word: 'candid', definition: 'honest and direct', canIntegrate: true },
  { word: 'dwindle', definition: 'to shrink little by little', canIntegrate: true },
  { word: 'endure', definition: 'to keep going through hardship', canIntegrate: true },
];

function session(questionCount = 4) {
  const s = createQuizSession({
    gameCode: 'BOSS01',
    classroomId: 'c1',
    words: LESSON,
    focus: 'any',
    questionCount,
    secondsPerQuestion: 10,
    seed: 'boss',
    now: 0,
    treasureChestsEnabled: false,
  });
  addQuizPlayer(s, { username: 'ana', userId: 'u-ana' });
  addQuizPlayer(s, { username: 'bo', userId: 'u-bo' });
  return s;
}

function answer(s: ReturnType<typeof session>, username: string, correct: boolean) {
  const q = s.questions[s.index];
  const choice = correct ? q.answerIndex : (q.answerIndex + 1) % q.choices.length;
  submitQuizAnswer(s, { username, index: s.index, choiceIndex: choice, now: s.questionStartedAt + 500 });
}

describe('boss HP', () => {
  it('scales with the class: questions x students x 0.6, never below 3', () => {
    expect(bossMaxHp(10, 2)).toBe(12);
    expect(bossMaxHp(10, 25)).toBe(150);
    expect(bossMaxHp(4, 0)).toBe(3);
  });

  it('is absent on a plain quiz', () => {
    expect(bossFor(session())).toBeUndefined();
  });

  it('arms at full health for the enrolled students', () => {
    const s = session(4);
    armBoss(s);
    expect(bossFor(s)).toEqual({ maxHp: 5, hp: 5, lastHits: 0, defeated: false });
  });
});

describe('scoring hits at each reveal', () => {
  it('takes one hit per right answer and ignores wrong ones', () => {
    const s = session(10);
    armBoss(s);
    answer(s, 'ana', true);
    answer(s, 'bo', false);
    scoreBossHits(s);
    // five lesson words -> five questions -> 6 HP for two students
    expect(bossFor(s)).toMatchObject({ maxHp: 6, hp: 5, lastHits: 1 });
  });

  it('counts a question once, however many times the reveal is rebuilt', () => {
    const s = session(10);
    armBoss(s);
    answer(s, 'ana', true);
    scoreBossHits(s);
    scoreBossHits(s);
    expect(bossFor(s)!.hp).toBe(5);
  });

  it('lands a critical double hit on a streak of three', () => {
    const s = session(10);
    armBoss(s);
    for (let q = 0; q < 3; q++) {
      answer(s, 'ana', true);
      scoreBossHits(s);
      advanceQuiz(s, 2_000 * (q + 1));
    }
    // 1 + 1 + 2 (third in a row is critical)
    expect(bossFor(s)!.hp).toBe(6 - 4);
    expect(bossFor(s)!.lastHits).toBe(2);
  });

  it('is defeated at zero and never goes negative', () => {
    const s = session(4);
    armBoss(s);
    for (let q = 0; q < 3; q++) {
      answer(s, 'ana', true);
      answer(s, 'bo', true);
      scoreBossHits(s);
      advanceQuiz(s, 2_000 * (q + 1));
    }
    expect(bossFor(s)).toMatchObject({ hp: 0, defeated: true });
    expect(bossDefeated(s)).toBe(true);
  });
});
