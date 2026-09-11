import { describe, it, expect } from 'vitest';
import {
  IDLE_GRACE_MS,
  createActivityState,
  applyLeaderboard,
  buildRoster,
  summarizeClass,
} from '../classActivityModel';

const T0 = 1_000_000;

describe('classActivityModel', () => {
  describe('applyLeaderboard', () => {
    it('records words found per student and flags that data has arrived', () => {
      const s0 = createActivityState(T0);
      expect(s0.hasData).toBe(false);

      const s1 = applyLeaderboard(s0, [{ username: 'Dana', score: 12, wordsFound: 2 }], T0 + 5_000);
      expect(s1.hasData).toBe(true);
      expect(s1.byUser.Dana).toMatchObject({ wordsFound: 2, score: 12 });
    });

    it('treats an all-zero payload after real play as a NEW round and resets the clock', () => {
      // Class 2 guard: a long-lived activity map must not carry round N-1 into round N.
      let s = createActivityState(T0);
      s = applyLeaderboard(s, [{ username: 'Dana', score: 12, wordsFound: 3 }], T0 + 1_000);
      const next = applyLeaderboard(s, [{ username: 'Dana', score: 0, wordsFound: 0 }], T0 + 90_000);

      expect(next.startedAt).toBe(T0 + 90_000);
      expect(next.byUser.Dana.wordsFound).toBe(0);
    });

    it('does not reset when the class simply has not scored yet', () => {
      let s = createActivityState(T0);
      s = applyLeaderboard(s, [{ username: 'Dana', score: 0, wordsFound: 0 }], T0 + 1_000);
      s = applyLeaderboard(s, [{ username: 'Dana', score: 0, wordsFound: 0 }], T0 + 2_000);
      expect(s.startedAt).toBe(T0);
    });
  });

  describe('buildRoster', () => {
    const members = [
      { username: 'Teacher', isHost: true },
      { username: 'Bot Bo', isBot: true },
      { username: 'Dana' },
      { username: 'Eli' },
    ];

    it('excludes the host and bots — the count is students only', () => {
      const rows = buildRoster(members, createActivityState(T0), T0, 'Teacher');
      expect(rows.map((r) => r.username)).toEqual(['Dana', 'Eli']);
    });

    it('claims nobody is idle on the first paint of a round (Class 1 guard)', () => {
      // Membership resolves before any word is ever found; the grace window,
      // not the arrival of data, is what holds the verdict back.
      const rows = buildRoster(members, createActivityState(T0), T0 + 1_000, 'Teacher');
      expect(rows.every((r) => r.isIdle)).toBe(false);
      expect(summarizeClass(rows)).toEqual({ total: 2, active: 2, idle: 0 });
    });

    it('flags the WHOLE class when no leaderboard payload ever arrives', () => {
      // A round where nobody scores sends no `updateLeaderboard` at all — the
      // one case the teacher most needs on the projector.
      const rows = buildRoster(members, createActivityState(T0), T0 + IDLE_GRACE_MS + 1, 'Teacher');
      expect(summarizeClass(rows)).toEqual({ total: 2, active: 0, idle: 2 });
    });

    it('does not flag idle inside the grace window', () => {
      const state = applyLeaderboard(createActivityState(T0), [{ username: 'Dana', score: 5, wordsFound: 1 }], T0 + 500);
      const rows = buildRoster(members, state, T0 + IDLE_GRACE_MS - 1, 'Teacher');
      expect(rows.find((r) => r.username === 'Eli')?.isIdle).toBe(false);
    });

    it('flags a student with zero words after the grace window, and only that student', () => {
      const state = applyLeaderboard(createActivityState(T0), [{ username: 'Dana', score: 5, wordsFound: 1 }], T0 + 500);
      const rows = buildRoster(members, state, T0 + IDLE_GRACE_MS + 1, 'Teacher');
      expect(rows.find((r) => r.username === 'Dana')?.isIdle).toBe(false);
      expect(rows.find((r) => r.username === 'Eli')?.isIdle).toBe(true);
      expect(summarizeClass(rows)).toEqual({ total: 2, active: 1, idle: 1 });
    });

    it('sorts idle students first so the teacher sees who is stuck without scrolling', () => {
      const state = applyLeaderboard(
        createActivityState(T0),
        [
          { username: 'Dana', score: 5, wordsFound: 1 },
          { username: 'Zed', score: 20, wordsFound: 4 },
        ],
        T0 + 500,
      );
      const rows = buildRoster(
        [{ username: 'Dana' }, { username: 'Zed' }, { username: 'Eli' }],
        state,
        T0 + IDLE_GRACE_MS + 1,
      );
      expect(rows.map((r) => r.username)).toEqual(['Eli', 'Dana', 'Zed']);
    });
  });
});
