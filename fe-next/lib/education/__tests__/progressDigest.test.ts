import { describe, it, expect } from 'vitest';
import { deriveProgressDigest } from '../progressDigest';
import type { ClassPulseLastGame } from '../classPulse';

const NOW = Date.parse('2026-09-19T12:00:00.000Z');

function lastGame(overrides: Partial<ClassPulseLastGame> = {}): ClassPulseLastGame {
  return {
    playedAt: new Date(NOW - 86400000).toISOString(),
    gameMode: 'vocab-quiz',
    participation: { played: 7, roster: 10 },
    averageAccuracyPct: 64,
    players: [
      { studentId: 's1', name: 'Ada', accuracyPct: 90 },
      { studentId: 's2', name: 'Blaise', accuracyPct: 25 },
    ],
    missedWords: [{ word: 'ephemeral', pct: 80 }],
    ...overrides,
  };
}

describe('deriveProgressDigest', () => {
  it('is last-game pulse plus coverage when a lesson exists', () => {
    const digest = deriveProgressDigest({
      rosterCount: 10,
      lastGame: lastGame(),
      coveragePct: 72,
      now: NOW,
    });
    expect(digest.state).toBe('needsReview');
    expect(digest.playedCount).toBe(7);
    expect(digest.gameRosterCount).toBe(10);
    expect(digest.absentCount).toBe(3);
    expect(digest.averageAccuracyPct).toBe(64);
    expect(digest.coveragePct).toBe(72);
    expect(digest.topMissedWords).toEqual(['ephemeral']);
    expect(digest.struggling.map((s) => s.name)).toEqual(['Blaise']);
  });

  it('does not invent coverage when the class has never played', () => {
    const digest = deriveProgressDigest({
      rosterCount: 10,
      lastGame: null,
      coveragePct: 72,
      now: NOW,
    });
    expect(digest.state).toBe('neverPlayed');
    expect(digest.coveragePct).toBeNull();
    expect(digest.playedCount).toBeNull();
  });

  it('does not invent coverage on a failed read', () => {
    const digest = deriveProgressDigest({
      rosterCount: 10,
      lastGame: null,
      lastGameUnavailable: true,
      coveragePct: 72,
      now: NOW,
    });
    expect(digest.state).toBe('unknown');
    expect(digest.coveragePct).toBeNull();
  });

  it('keeps an empty roster as invite, never a report', () => {
    const digest = deriveProgressDigest({
      rosterCount: 0,
      lastGame: lastGame(),
      coveragePct: 90,
      now: NOW,
    });
    expect(digest.state).toBe('noRoster');
    expect(digest.nextAction).toBe('invite');
    expect(digest.coveragePct).toBeNull();
  });
});
