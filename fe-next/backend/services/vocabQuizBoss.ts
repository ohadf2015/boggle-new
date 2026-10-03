// Kept beside the session (WeakMap) so a plain quiz carries nothing; hits are tallied per question, so a leaver's damage stays.

import {
  BOSS_CRIT_STREAK,
  BOSS_HP_PER_ANSWER,
  BOSS_MIN_HP,
  type VocabQuizBoss,
} from '@/shared/types/vocabQuiz';
import type { VocabQuizSession } from './vocabQuizEngine.js';

interface BossState {
  maxHp: number;
  hp: number;
  lastHits: number;
  scoredIndex: number;
}

const BOSSES = new WeakMap<VocabQuizSession, BossState>();

export function bossMaxHp(questionCount: number, students: number): number {
  return Math.max(BOSS_MIN_HP, Math.ceil(questionCount * Math.max(1, students) * BOSS_HP_PER_ANSWER));
}

export function armBoss(session: VocabQuizSession): void {
  const maxHp = bossMaxHp(session.questions.length, session.players.size);
  BOSSES.set(session, { maxHp, hp: maxHp, lastHits: 0, scoredIndex: -1 });
}

/** The one damage rule: a right answer hits once, a streak of BOSS_CRIT_STREAK hits twice. */
export function hitFor(correct: boolean, streakAfter: number): number {
  if (!correct) return 0;
  return streakAfter >= BOSS_CRIT_STREAK ? 2 : 1;
}

export function scoreBossHits(session: VocabQuizSession): void {
  const boss = BOSSES.get(session);
  if (!boss || boss.scoredIndex === session.index) return;
  let hits = 0;
  for (const [username, answer] of session.answers) {
    hits += hitFor(answer.correct, session.players.get(username)?.streak ?? 0);
  }
  boss.hp = Math.max(0, boss.hp - hits);
  boss.lastHits = hits;
  boss.scoredIndex = session.index;
}

// A fallen boss makes this the last question: isLast, the tease, the finale total and askedWords all read the length.
export function settleBossReveal(session: VocabQuizSession): void {
  scoreBossHits(session);
  if (bossDefeated(session)) session.questions = session.questions.slice(0, session.index + 1);
}

export function bossFor(session: VocabQuizSession): VocabQuizBoss | undefined {
  const boss = BOSSES.get(session);
  if (!boss) return undefined;
  return { maxHp: boss.maxHp, hp: boss.hp, lastHits: boss.lastHits, defeated: boss.hp === 0 };
}

export function bossDefeated(session: VocabQuizSession): boolean {
  return BOSSES.get(session)?.hp === 0;
}

/** The private answer result, plus the damage it dealt when a boss is up. */
export function withBossHit<T extends { correct: boolean; streak: number }>(session: VocabQuizSession, result: T): T {
  return BOSSES.has(session) ? { ...result, bossHit: hitFor(result.correct, result.streak) } : result;
}

/** Spread onto any quiz payload: `{ boss }` for a boss round, nothing otherwise. */
export function withBoss<T extends object>(session: VocabQuizSession, payload: T): T {
  const boss = bossFor(session);
  return boss ? { ...payload, boss } : payload;
}
