/**
 * The teacher's timer and board size.
 *
 * ClassroomGameLobby asks the teacher for both, then HostPreGameView mounts and
 * unconditionally applies the 'fast' preset (1 min / MEDIUM) — overwriting the
 * choice before the teacher can see it. This maps the classroom settings onto
 * the host controls so the preset only fires for non-classroom rooms.
 *
 * The two vocabularies differ: the teacher picks a board SIZE
 * (small/medium/large); the host controls take a DIFFICULTY (EASY/MEDIUM/HARD).
 */

import { describe, it, expect } from 'vitest';
import { classroomHostPreset } from './classroomHostPreset';

describe('classroomHostPreset', () => {
  it('maps the teacher board size onto the host difficulty scale', () => {
    expect(classroomHostPreset({ timerSeconds: 180, difficulty: 'small' })?.difficulty).toBe('EASY');
    expect(classroomHostPreset({ timerSeconds: 180, difficulty: 'medium' })?.difficulty).toBe('MEDIUM');
    expect(classroomHostPreset({ timerSeconds: 180, difficulty: 'large' })?.difficulty).toBe('HARD');
  });

  it('converts the stored seconds back to the minutes the host timer expects', () => {
    expect(classroomHostPreset({ timerSeconds: 300, difficulty: 'medium' })?.timerMinutes).toBe(5);
    expect(classroomHostPreset({ timerSeconds: 60, difficulty: 'medium' })?.timerMinutes).toBe(1);
  });

  it('rounds a fractional minute up rather than down to a zero-length game', () => {
    expect(classroomHostPreset({ timerSeconds: 30, difficulty: 'medium' })?.timerMinutes).toBe(1);
  });

  it('carries the minimum word length through when the teacher set one', () => {
    expect(
      classroomHostPreset({ timerSeconds: 180, difficulty: 'medium', minWordLength: 4 })
        ?.minWordLength
    ).toBe(4);
  });

  it('defaults the minimum word length rather than emitting undefined', () => {
    expect(classroomHostPreset({ timerSeconds: 180, difficulty: 'medium' })?.minWordLength).toBe(3);
  });

  it('returns null for a non-classroom game so the normal preset still applies', () => {
    expect(classroomHostPreset(null)).toBeNull();
    expect(classroomHostPreset(undefined)).toBeNull();
  });

  it('falls back to sane values when a stored setting is malformed', () => {
    expect(classroomHostPreset({ timerSeconds: 0, difficulty: 'weird' as never })).toEqual({
      timerMinutes: 3,
      difficulty: 'MEDIUM',
      minWordLength: 3,
    });
  });
});
