/**
 * The session's memory of the rounds already played.
 *
 * A round is only a moment if it has something to be bigger THAN. This module
 * is the "+40 vs last round" / "personal best" / "round 3 of this session"
 * arithmetic, kept pure so the numbers can be argued about without a browser.
 *
 * Round 1 deliberately produces nothing: a first round has no delta and cannot
 * be a personal best, and a teacher reloading the projector must see no chip
 * rather than a wrong "Round 1 streak".
 */

import { describe, it, expect } from 'vitest';
import {
  sessionKeyFor,
  appendRound,
  momentumFor,
  sweepStreak,
  MAX_SESSION_ROUNDS,
  type SessionRound,
} from '../roundEndHistory';

const round = (over: Partial<SessionRound> = {}): SessionRound => ({
  score: 100,
  rank: 1,
  players: 4,
  sweep: false,
  at: 1,
  ...over,
});

describe('sessionKeyFor', () => {
  it('is stable for the same teacher and lesson set', () => {
    const a = sessionKeyFor({ teacherName: 'Ms. Cohen', lessonIds: ['l1', 'l2'] });
    const b = sessionKeyFor({ teacherName: 'Ms. Cohen', lessonIds: ['l1', 'l2'] });
    expect(a).toBe(b);
  });

  it('separates two different lesson sets so their rounds never blend', () => {
    const a = sessionKeyFor({ teacherName: 'Ms. Cohen', lessonIds: ['l1'] });
    const b = sessionKeyFor({ teacherName: 'Ms. Cohen', lessonIds: ['l2'] });
    expect(a).not.toBe(b);
  });

  it('survives a lesson list the server hands back in another order', () => {
    const a = sessionKeyFor({ teacherName: 'Ms. Cohen', lessonIds: ['l1', 'l2'] });
    const b = sessionKeyFor({ teacherName: 'Ms. Cohen', lessonIds: ['l2', 'l1'] });
    expect(a).toBe(b);
  });
});

describe('momentumFor', () => {
  it('says nothing at all about round 1 — no delta, no personal best', () => {
    expect(momentumFor([], round({ score: 120 }))).toBeNull();
  });

  it('reads the delta against the round immediately before this one', () => {
    const m = momentumFor([round({ score: 80 }), round({ score: 100 })], round({ score: 140 }));
    expect(m).not.toBeNull();
    expect(m!.roundNumber).toBe(3);
    expect(m!.delta).toBe(40);
  });

  it('reports a drop as a negative delta rather than hiding it', () => {
    const m = momentumFor([round({ score: 200 })], round({ score: 150 }));
    expect(m!.delta).toBe(-50);
  });

  it('calls a new high a personal best', () => {
    const m = momentumFor([round({ score: 80 }), round({ score: 120 })], round({ score: 121 }));
    expect(m!.personalBest).toBe(true);
  });

  it('does not call a tie with an earlier round a personal best', () => {
    const m = momentumFor([round({ score: 120 })], round({ score: 120 }));
    expect(m!.personalBest).toBe(false);
  });

  it('does not call a drop a personal best even when the last round was worse', () => {
    const m = momentumFor([round({ score: 200 }), round({ score: 50 })], round({ score: 100 }));
    expect(m!.delta).toBe(50);
    expect(m!.personalBest).toBe(false);
  });

  it('notes a climb in placing so a student who did not win still has a win', () => {
    const m = momentumFor([round({ rank: 4 })], round({ rank: 2 }));
    expect(m!.rankDelta).toBe(2);
  });
});

describe('sweepStreak', () => {
  it('counts only the sweeps at the end of the session', () => {
    expect(sweepStreak([round({ sweep: true }), round({ sweep: false }), round({ sweep: true })])).toBe(1);
  });

  it('counts consecutive sweeps', () => {
    expect(sweepStreak([round({ sweep: false }), round({ sweep: true }), round({ sweep: true })])).toBe(2);
  });

  it('is zero for a session that has never swept', () => {
    expect(sweepStreak([round(), round()])).toBe(0);
  });
});

describe('appendRound', () => {
  it('adds the round to the end so order is play order', () => {
    const next = appendRound([round({ score: 10 })], round({ score: 20 }));
    expect(next.map((r) => r.score)).toEqual([10, 20]);
  });

  it('never grows without bound — a long session drops its oldest rounds', () => {
    let history: SessionRound[] = [];
    for (let i = 0; i < MAX_SESSION_ROUNDS + 5; i += 1) {
      history = appendRound(history, round({ score: i, at: i }));
    }
    expect(history).toHaveLength(MAX_SESSION_ROUNDS);
    expect(history[history.length - 1].score).toBe(MAX_SESSION_ROUNDS + 4);
  });
});
