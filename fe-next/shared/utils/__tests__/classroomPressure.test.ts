/**
 * The pressure dials, normalized in ONE place.
 *
 * Three consumers read the same raw value: the server merging it into the
 * startGame payload, the quiz engine deciding whether speed counts, and every
 * client deciding what to render. Three independent "what does `hidden` mean"
 * interpretations is recurring pitfall class 3 — so the defaults and the
 * tolerance for garbage (an old client, a hand-edited Redis record) live here
 * and nowhere else.
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CLASSROOM_PRESSURE,
  normalizeClassroomPressure,
  readClassroomPressure,
  pressureFromStartPayload,
  isLeaderboardHidden,
  isStudentTimerHidden,
  shouldSuppressTimerUrgency,
  trimLeaderboardForPressure,
} from '../classroomPressure';

describe('DEFAULT_CLASSROOM_PRESSURE', () => {
  it('is the hyped game-show: everything on', () => {
    // The free-tier default is the loud one. Calm is what Pro unlocks, so a
    // missing/garbage value must always resolve BACK to loud, never to calm.
    expect(DEFAULT_CLASSROOM_PRESSURE).toEqual({
      leaderboard: 'full',
      timer: 'full',
      speedScoring: true,
    });
  });
});

describe('normalizeClassroomPressure', () => {
  it('returns the defaults for absent input', () => {
    expect(normalizeClassroomPressure(undefined)).toEqual(DEFAULT_CLASSROOM_PRESSURE);
    expect(normalizeClassroomPressure(null)).toEqual(DEFAULT_CLASSROOM_PRESSURE);
    expect(normalizeClassroomPressure({})).toEqual(DEFAULT_CLASSROOM_PRESSURE);
  });

  it('keeps each valid choice', () => {
    expect(
      normalizeClassroomPressure({ leaderboard: 'top3', timer: 'gentle', speedScoring: false })
    ).toEqual({ leaderboard: 'top3', timer: 'gentle', speedScoring: false });
    expect(
      normalizeClassroomPressure({ leaderboard: 'hidden', timer: 'off', speedScoring: true })
    ).toEqual({ leaderboard: 'hidden', timer: 'off', speedScoring: true });
  });

  it('fills missing fields with defaults independently', () => {
    expect(normalizeClassroomPressure({ leaderboard: 'hidden' })).toEqual({
      leaderboard: 'hidden',
      timer: 'full',
      speedScoring: true,
    });
  });

  it('drops values outside the enum back to the default', () => {
    expect(
      normalizeClassroomPressure({ leaderboard: 'invisible', timer: 0, speedScoring: 'no' })
    ).toEqual(DEFAULT_CLASSROOM_PRESSURE);
  });
});

describe('readClassroomPressure', () => {
  it('reads the pressure sub-object off a classroom settings record', () => {
    const settings = { gameMode: 'classic', pressure: { leaderboard: 'hidden' } };
    expect(readClassroomPressure(settings)).toEqual({
      leaderboard: 'hidden',
      timer: 'full',
      speedScoring: true,
    });
  });

  it('resolves to defaults when the settings carry no pressure', () => {
    expect(readClassroomPressure({ gameMode: 'blast' })).toEqual(DEFAULT_CLASSROOM_PRESSURE);
    expect(readClassroomPressure(undefined)).toEqual(DEFAULT_CLASSROOM_PRESSURE);
  });
});

describe('pressureFromStartPayload', () => {
  it('returns null when the payload carries no pressure — a non-classroom room', () => {
    // Presence is the signal. A quick-play room must read as "no dials", not
    // as "a teacher set the loud defaults", or every casual game would render
    // classroom calm-mode affordances.
    expect(pressureFromStartPayload({ letterGrid: [] })).toBeNull();
    expect(pressureFromStartPayload({ pressure: undefined })).toBeNull();
    expect(pressureFromStartPayload(null)).toBeNull();
  });

  it('normalizes a carried pressure object', () => {
    expect(pressureFromStartPayload({ pressure: { leaderboard: 'top3' } })).toEqual({
      leaderboard: 'top3',
      timer: 'full',
      speedScoring: true,
    });
  });
});

describe('rendering semantics', () => {
  it('hides the leaderboard only on hidden, never on top3', () => {
    expect(isLeaderboardHidden(normalizeClassroomPressure({ leaderboard: 'hidden' }))).toBe(true);
    expect(isLeaderboardHidden(normalizeClassroomPressure({ leaderboard: 'top3' }))).toBe(false);
    expect(isLeaderboardHidden(DEFAULT_CLASSROOM_PRESSURE)).toBe(false);
  });

  it('hides the student timer only when pressure is off', () => {
    expect(isStudentTimerHidden(normalizeClassroomPressure({ timer: 'off' }))).toBe(true);
    expect(isStudentTimerHidden(normalizeClassroomPressure({ timer: 'gentle' }))).toBe(false);
    expect(isStudentTimerHidden(DEFAULT_CLASSROOM_PRESSURE)).toBe(false);
  });

  it('suppresses urgency on gentle AND off — an invisible timer must not glow', () => {
    expect(shouldSuppressTimerUrgency(normalizeClassroomPressure({ timer: 'gentle' }))).toBe(true);
    expect(shouldSuppressTimerUrgency(normalizeClassroomPressure({ timer: 'off' }))).toBe(true);
    expect(shouldSuppressTimerUrgency(DEFAULT_CLASSROOM_PRESSURE)).toBe(false);
  });

  it('trims the board to the podium three only on top3', () => {
    const board = [
      { username: 'a', score: 90 },
      { username: 'b', score: 80 },
      { username: 'c', score: 70 },
      { username: 'd', score: 60 },
    ];
    expect(trimLeaderboardForPressure(board, normalizeClassroomPressure({ leaderboard: 'top3' }))).toHaveLength(3);
    expect(trimLeaderboardForPressure(board, DEFAULT_CLASSROOM_PRESSURE)).toHaveLength(4);
    // Hidden is not "trim to zero" — the caller swaps in the reveal beat instead.
    expect(trimLeaderboardForPressure(board, normalizeClassroomPressure({ leaderboard: 'hidden' }))).toHaveLength(4);
  });
});
