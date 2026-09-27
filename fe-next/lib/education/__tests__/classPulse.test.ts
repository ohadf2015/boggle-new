/**
 * Class pulse — the derivation behind the teacher's at-a-glance class state.
 *
 * Every assertion here is about a claim the teacher's screen makes to their
 * face. The strip this replaces rendered `member_count` under the copy
 * "{count} students are in {classroom} right now", so a class of 28 with an
 * empty room told the teacher 28 students were present. A number that is
 * wrong in the reassuring direction is worse than no number, which is why
 * "enrolled", "played" and "absent" are three separate fields here and none
 * of them is allowed to stand in for another.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveClassPulse,
  STRUGGLING_ACCURACY_PCT,
  STRUGGLING_LIST_LIMIT,
  MISSED_WORD_LIST_LIMIT,
  type ClassPulseLastGame,
} from '../classPulse';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-09-15T10:00:00.000Z');

function lastGame(overrides: Partial<ClassPulseLastGame> = {}): ClassPulseLastGame {
  return {
    playedAt: new Date(NOW - DAY).toISOString(),
    gameMode: 'vocab-quiz',
    participation: { played: 4, roster: 4 },
    averageAccuracyPct: 82,
    players: [
      { studentId: 's1', name: 'Ada', accuracyPct: 95 },
      { studentId: 's2', name: 'Blaise', accuracyPct: 88 },
      { studentId: 's3', name: 'Cleo', accuracyPct: 80 },
      { studentId: 's4', name: 'Dov', accuracyPct: 65 },
    ],
    missedWords: [],
    ...overrides,
  };
}

describe('deriveClassPulse', () => {
  describe('given a classroom with nobody in it', () => {
    it('reports no roster and asks the teacher to invite, even though a game was played', () => {
      // A class can empty out after a game (students leave, a rig is purged).
      // The teacher's next move is still "get students in", not "review".
      const pulse = deriveClassPulse({ rosterCount: 0, lastGame: lastGame(), now: NOW });

      expect(pulse.state).toBe('noRoster');
      expect(pulse.nextAction).toBe('invite');
      expect(pulse.rosterCount).toBe(0);
    });
  });

  describe('given a roster that has never played', () => {
    it('reports neverPlayed and asks the teacher to play', () => {
      const pulse = deriveClassPulse({ rosterCount: 12, lastGame: null, now: NOW });

      expect(pulse.state).toBe('neverPlayed');
      expect(pulse.nextAction).toBe('play');
      expect(pulse.rosterCount).toBe(12);
      expect(pulse.playedCount).toBeNull();
      expect(pulse.absentCount).toBeNull();
      expect(pulse.averageAccuracyPct).toBeNull();
      expect(pulse.daysSinceLastGame).toBeNull();
    });
  });

  describe('given a game where everyone did well', () => {
    it('reports ready and asks the teacher to play again', () => {
      const pulse = deriveClassPulse({
        rosterCount: 4,
        lastGame: lastGame({
          players: [
            { studentId: 's1', name: 'Ada', accuracyPct: 95 },
            { studentId: 's2', name: 'Blaise', accuracyPct: 88 },
          ],
          participation: { played: 2, roster: 4 },
        }),
        now: NOW,
      });

      expect(pulse.state).toBe('ready');
      expect(pulse.nextAction).toBe('playAgain');
      expect(pulse.struggling).toEqual([]);
      expect(pulse.topMissedWords).toEqual([]);
    });
  });

  describe('given a game with students below the struggling threshold', () => {
    it('names them, worst first, and asks the teacher to review', () => {
      const pulse = deriveClassPulse({
        rosterCount: 4,
        lastGame: lastGame({
          players: [
            { studentId: 's1', name: 'Ada', accuracyPct: 95 },
            { studentId: 's4', name: 'Dov', accuracyPct: 30 },
            { studentId: 's3', name: 'Cleo', accuracyPct: 45 },
          ],
        }),
        now: NOW,
      });

      expect(pulse.state).toBe('needsReview');
      expect(pulse.nextAction).toBe('review');
      expect(pulse.struggling.map((s) => s.name)).toEqual(['Dov', 'Cleo']);
    });

    it('treats the threshold as "below", not "at or below"', () => {
      const atThreshold = deriveClassPulse({
        rosterCount: 2,
        lastGame: lastGame({
          players: [{ studentId: 's1', name: 'Ada', accuracyPct: STRUGGLING_ACCURACY_PCT }],
        }),
        now: NOW,
      });
      const belowThreshold = deriveClassPulse({
        rosterCount: 2,
        lastGame: lastGame({
          players: [{ studentId: 's1', name: 'Ada', accuracyPct: STRUGGLING_ACCURACY_PCT - 1 }],
        }),
        now: NOW,
      });

      expect(atThreshold.struggling).toEqual([]);
      expect(belowThreshold.struggling).toHaveLength(1);
    });

    it('caps the named list so one glance stays one glance', () => {
      const players = Array.from({ length: STRUGGLING_LIST_LIMIT + 3 }, (_, i) => ({
        studentId: `s${i}`,
        name: `Student ${i}`,
        accuracyPct: 10 + i,
      }));
      const pulse = deriveClassPulse({ rosterCount: 20, lastGame: lastGame({ players }), now: NOW });

      expect(pulse.struggling).toHaveLength(STRUGGLING_LIST_LIMIT);
      // The cap must not hide the size of the problem.
      expect(pulse.strugglingCount).toBe(players.length);
    });
  });

  describe('given words the class missed', () => {
    it('surfaces the worst ones and asks for review even when no student is below the threshold', () => {
      const pulse = deriveClassPulse({
        rosterCount: 4,
        lastGame: lastGame({
          players: [{ studentId: 's1', name: 'Ada', accuracyPct: 99 }],
          missedWords: [
            { word: 'ephemeral', pct: 80 },
            { word: 'candid', pct: 20 },
            { word: 'tacit', pct: 60 },
            { word: 'lucid', pct: 0 },
          ],
        }),
        now: NOW,
      });

      expect(pulse.nextAction).toBe('review');
      // Worst first, and a word nobody missed is not a missed word.
      expect(pulse.topMissedWords).toEqual(
        ['ephemeral', 'tacit', 'candid'].slice(0, MISSED_WORD_LIST_LIMIT)
      );
      expect(pulse.topMissedWords).not.toContain('lucid');
    });
  });

  describe('participation', () => {
    it('reports who played and who was absent as separate numbers', () => {
      const pulse = deriveClassPulse({
        rosterCount: 10,
        lastGame: lastGame({ participation: { played: 7, roster: 10 } }),
        now: NOW,
      });

      expect(pulse.playedCount).toBe(7);
      expect(pulse.absentCount).toBe(3);
    });

    it('keeps the game-time roster separate from the class as it is now', () => {
      // 12 students are enrolled TODAY; only 10 were on the roster when the
      // game ran. Reporting "12 enrolled" beside "7 played, 3 absent" would
      // ask the teacher to believe 7 + 3 = 12. The participation line reads
      // against the roster the game actually had.
      const pulse = deriveClassPulse({
        rosterCount: 12,
        lastGame: lastGame({ participation: { played: 7, roster: 10 } }),
        now: NOW,
      });

      expect(pulse.rosterCount).toBe(12);
      expect(pulse.gameRosterCount).toBe(10);
      expect(pulse.playedCount! + pulse.absentCount!).toBe(pulse.gameRosterCount);
    });

    it('never reports a negative absence when guests outnumber the roster', () => {
      // A classroom game accepts guests, so `played` can exceed the roster.
      // "-4 absent" is the kind of number that makes a teacher stop trusting
      // the screen.
      const pulse = deriveClassPulse({
        rosterCount: 6,
        lastGame: lastGame({ participation: { played: 10, roster: 6 } }),
        now: NOW,
      });

      expect(pulse.absentCount).toBe(0);
    });
  });

  describe('recency', () => {
    it('counts whole days since the last game', () => {
      const pulse = deriveClassPulse({
        rosterCount: 4,
        lastGame: lastGame({ playedAt: new Date(NOW - 3 * DAY - 1000).toISOString() }),
        now: NOW,
      });

      expect(pulse.daysSinceLastGame).toBe(3);
    });

    it('reports today as zero days, not one', () => {
      const pulse = deriveClassPulse({
        rosterCount: 4,
        lastGame: lastGame({ playedAt: new Date(NOW - 60 * 1000).toISOString() }),
        now: NOW,
      });

      expect(pulse.daysSinceLastGame).toBe(0);
    });

    it('returns null rather than NaN for an unparseable timestamp', () => {
      // A NaN here renders as "NaN days ago" on the teacher's screen.
      const pulse = deriveClassPulse({
        rosterCount: 4,
        lastGame: lastGame({ playedAt: 'not a date' }),
        now: NOW,
      });

      expect(pulse.daysSinceLastGame).toBeNull();
    });

    it('clamps a future timestamp to zero instead of going negative', () => {
      const pulse = deriveClassPulse({
        rosterCount: 4,
        lastGame: lastGame({ playedAt: new Date(NOW + 2 * DAY).toISOString() }),
        now: NOW,
      });

      expect(pulse.daysSinceLastGame).toBe(0);
    });
  });
});
