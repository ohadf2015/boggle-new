/**
 * Treasure Chest Resolver — Tests
 *
 * The resolver runs AFTER the answer was scored: `player.score` already
 * contains this question's points. Every outcome is a delta on top of that —
 * a chest must never erase the points the student just earned.
 */

import { describe, it, expect } from 'vitest';
import {
  applyChestOutcome,
  resolveChestOutcome,
  resolveChestResult,
} from '../treasureChestResolver';
import type { QuizPlayer } from '../vocabQuizEngine';

const player = (username: string, score: number): QuizPlayer => ({
  username,
  userId: null,
  score,
  streak: 0,
  bestStreak: 0,
  correctCount: 0,
  correctWords: [],
  answers: [],
});

const room = (...ps: QuizPlayer[]) => new Map(ps.map((p) => [p.username, p]));

describe('resolveChestOutcome', () => {
  it('is deterministic for the same seed', () => {
    expect(resolveChestOutcome('g:0:ana:1')).toBe(resolveChestOutcome('g:0:ana:1'));
  });

  it('produces every outcome across many seeds', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(resolveChestOutcome(`g:${i}:ana:${i % 3}`));
    expect([...seen].sort()).toEqual(['double', 'gain', 'small-loss', 'steal', 'swap']);
  });
});

describe('applyChestOutcome', () => {
  it('gain adds on top of the points already earned', () => {
    const players = room(player('ana', 150));
    const r = applyChestOutcome({ outcome: 'gain', username: 'ana', players, answerPoints: 150, amountRand: 0.5 });
    expect(r.amount).toBeGreaterThan(0);
    expect(players.get('ana')!.score).toBe(150 + r.amount);
    expect(r.myScore).toBe(150 + r.amount);
  });

  it('double adds the answer points again', () => {
    const players = room(player('ana', 150));
    const r = applyChestOutcome({ outcome: 'double', username: 'ana', players, answerPoints: 120, amountRand: 0 });
    expect(r.amount).toBe(120);
    expect(players.get('ana')!.score).toBe(270);
  });

  it('steal moves points from the leader to the actor', () => {
    const players = room(player('ana', 100), player('ben', 400), player('cy', 200));
    const r = applyChestOutcome({ outcome: 'steal', username: 'ana', players, answerPoints: 100, amountRand: 0 });
    expect(r.targetUsername).toBe('ben');
    expect(r.amount).toBeGreaterThan(0);
    expect(players.get('ben')!.score).toBe(400 - r.amount);
    expect(players.get('ana')!.score).toBe(100 + r.amount);
  });

  it('steal falls back to a gain when nobody else has points', () => {
    const players = room(player('ana', 100), player('ben', 0));
    const r = applyChestOutcome({ outcome: 'steal', username: 'ana', players, answerPoints: 100, amountRand: 0 });
    expect(r.outcome).toBe('gain');
    expect(players.get('ben')!.score).toBe(0);
    expect(players.get('ana')!.score).toBe(100 + r.amount);
  });

  it('swap trades scores with the leader', () => {
    const players = room(player('ana', 100), player('ben', 400));
    const r = applyChestOutcome({ outcome: 'swap', username: 'ana', players, answerPoints: 100, amountRand: 0 });
    expect(r.targetUsername).toBe('ben');
    expect(players.get('ana')!.score).toBe(400);
    expect(players.get('ben')!.score).toBe(100);
    expect(r.amount).toBe(300);
  });

  it('swap never lowers the actor: when they already lead it becomes a gain', () => {
    const players = room(player('ana', 500), player('ben', 400));
    const r = applyChestOutcome({ outcome: 'swap', username: 'ana', players, answerPoints: 100, amountRand: 0 });
    expect(r.outcome).toBe('gain');
    expect(players.get('ben')!.score).toBe(400);
    expect(players.get('ana')!.score).toBe(500 + r.amount);
  });

  it('small-loss is floored at 0 and reports the real delta', () => {
    const players = room(player('ana', 4));
    const r = applyChestOutcome({ outcome: 'small-loss', username: 'ana', players, answerPoints: 4, amountRand: 1 });
    expect(players.get('ana')!.score).toBe(0);
    expect(r.amount).toBe(-4);
  });

  it('small-loss never costs more than 25 points', () => {
    const players = room(player('ana', 300));
    const r = applyChestOutcome({ outcome: 'small-loss', username: 'ana', players, answerPoints: 150, amountRand: 0.99 });
    expect(r.amount).toBeLessThan(0);
    expect(r.amount).toBeGreaterThanOrEqual(-25);
    expect(players.get('ana')!.score).toBe(300 + r.amount);
  });

  it('returns standings sorted by score after the change', () => {
    const players = room(player('ana', 100), player('ben', 400));
    const r = applyChestOutcome({ outcome: 'swap', username: 'ana', players, answerPoints: 100, amountRand: 0 });
    expect(r.standings.map((s) => s.username)).toEqual(['ana', 'ben']);
  });
});

describe('resolveChestResult', () => {
  it('includes the actor and question-scoped determinism', () => {
    const a = resolveChestResult({ gameCode: 'g', questionIndex: 0, chest: 1, username: 'ana', players: room(player('ana', 150)), answerPoints: 150 });
    const b = resolveChestResult({ gameCode: 'g', questionIndex: 0, chest: 1, username: 'ana', players: room(player('ana', 150)), answerPoints: 150 });
    expect(a.actor).toBe('ana');
    expect(a.outcome).toBe(b.outcome);
    expect(a.amount).toBe(b.amount);
  });

  it('the chest picked is part of the seed — not every chest hides the same thing', () => {
    const outcomes = new Set<string>();
    for (let q = 0; q < 30; q++) {
      const per = [0, 1, 2].map(
        (chest) =>
          resolveChestResult({ gameCode: 'g', questionIndex: q, chest, username: 'ana', players: room(player('ana', 150), player('ben', 300)), answerPoints: 150 }).outcome
      );
      outcomes.add(per.join(','));
    }
    expect([...outcomes].some((o) => new Set(o.split(',')).size > 1)).toBe(true);
  });

  it('never leaves the actor below the points they had before the chest, except a small-loss', () => {
    for (let q = 0; q < 60; q++) {
      const players = room(player('ana', 150), player('ben', 300));
      const r = resolveChestResult({ gameCode: 'g', questionIndex: q, chest: q % 3, username: 'ana', players, answerPoints: 150 });
      if (r.outcome !== 'small-loss') expect(players.get('ana')!.score).toBeGreaterThanOrEqual(150);
      expect(players.get('ana')!.score).toBeGreaterThanOrEqual(0);
      expect(players.get('ben')!.score).toBeGreaterThanOrEqual(0);
    }
  });
});
