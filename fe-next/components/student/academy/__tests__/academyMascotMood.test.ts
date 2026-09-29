import { describe, it, expect } from 'vitest';
import { academyMascotMood } from '../academyMascotMood';
import type { NextActionKind } from '../academyIslands';

const base = { streakAtRisk: false, streak: 0, reviewCount: 0 };

function mood(kind: NextActionKind, over: Partial<typeof base> = {}) {
  return academyMascotMood({ kind, ...base, ...over });
}

describe('academyMascotMood', () => {
  it('celebrates a live game above everything else', () => {
    const m = mood('live', { streakAtRisk: true, streak: 9, reviewCount: 4 });
    expect(m.variant).toBe('celebration');
    expect(m.lineKey).toBe('academy.student.mascotLive');
  });

  it('panics about an at-risk streak before any other chore', () => {
    const m = mood('next', { streakAtRisk: true, streak: 12 });
    expect(m.variant).toBe('scared');
    expect(m.lineKey).toBe('academy.student.mascotStreakRisk');
  });

  it('carries the streak count for the at-risk line', () => {
    const m = mood('next', { streakAtRisk: true, streak: 12 });
    expect(m.params).toEqual({ count: 12 });
  });

  it('squares up when the boss is unlocked', () => {
    expect(mood('boss')).toMatchObject({ variant: 'knight', lineKey: 'academy.student.mascotBoss' });
  });

  it('encourages review with the due count', () => {
    const m = mood('review', { reviewCount: 7 });
    expect(m.variant).toBe('encouraging');
    expect(m.lineKey).toBe('academy.student.mascotReview');
    expect(m.params).toEqual({ count: 7 });
  });

  it('waves a student with no class toward the join code', () => {
    expect(mood('join-class')).toMatchObject({ variant: 'waving', lineKey: 'academy.student.mascotJoin' });
  });

  it('is simply happy about the next lesson', () => {
    expect(mood('next')).toMatchObject({ variant: 'happy', lineKey: 'academy.student.mascotNext' });
  });

  it('is up for the workshop and for solo practice', () => {
    expect(mood('workshop')).toMatchObject({ variant: 'gaming', lineKey: 'academy.student.mascotWorkshop' });
    expect(mood('solo')).toMatchObject({ variant: 'gaming', lineKey: 'academy.student.mascotSolo' });
  });
});
