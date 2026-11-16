import { describe, it, expect } from 'vitest';
import { waitingNudge, WAITING_DELAY_MS, WAITING_LOOKBACK_MS } from '../waitingStudents';

const NOW = Date.parse('2026-11-09T10:30:00.000Z');
const min = (n: number) => new Date(NOW - n * 60_000).toISOString();

describe('waitingNudge', () => {
  it('stays quiet when students joined less than 5 minutes ago', () => {
    expect(waitingNudge({
      joins: [{ classroomId: 'c1', joinedAt: min(4) }],
      rounds: [],
      now: NOW,
    })).toBeNull();
  });

  it('names the class whose students have been waiting 5 minutes with no round since they joined', () => {
    expect(waitingNudge({
      joins: [
        { classroomId: 'c1', joinedAt: min(8) },
        { classroomId: 'c1', joinedAt: min(6) },
        { classroomId: 'c1', joinedAt: min(1) },
      ],
      rounds: [],
      now: NOW,
    })).toEqual({ classroomId: 'c1', count: 3, waitingMs: 8 * 60_000 });
  });

  it('does not count a student who joined before the last round, or a class that already has a live room', () => {
    expect(waitingNudge({
      joins: [
        { classroomId: 'played', joinedAt: min(20) },
        { classroomId: 'played', joinedAt: min(12) },
        { classroomId: 'live', joinedAt: min(12) },
      ],
      rounds: [{ classroomId: 'played', at: min(9) }],
      liveClassroomIds: new Set(['live']),
      now: NOW,
    })).toBeNull();
  });

  it('counts only joins that arrived after the last round, once those have waited 5 minutes', () => {
    expect(waitingNudge({
      joins: [
        { classroomId: 'c1', joinedAt: min(40) },
        { classroomId: 'c1', joinedAt: min(8) },
        { classroomId: 'c1', joinedAt: min(6) },
      ],
      rounds: [{ classroomId: 'c1', at: min(10) }],
      now: NOW,
    })).toEqual({ classroomId: 'c1', count: 2, waitingMs: 8 * 60_000 });
  });

  it('ignores joins older than the lookback and prefers the class the teacher is looking at', () => {
    expect(waitingNudge({
      joins: [
        { classroomId: 'old', joinedAt: new Date(NOW - WAITING_LOOKBACK_MS - 60_000).toISOString() },
        { classroomId: 'other', joinedAt: min(12) },
        { classroomId: 'other', joinedAt: min(11) },
        { classroomId: 'selected', joinedAt: min(7) },
      ],
      rounds: [],
      preferId: 'selected',
      now: NOW,
    })).toEqual({ classroomId: 'selected', count: 1, waitingMs: 7 * 60_000 });
  });

  it('uses a 5 minute delay', () => {
    expect(WAITING_DELAY_MS).toBe(5 * 60_000);
  });
});
