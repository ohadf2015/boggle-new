import { describe, it, expect } from 'vitest';
import { classStats, hostPodium, studentGap, studentPlacing } from '@/components/education/live/eduResultsModel';
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';

const summary = (over: Partial<ClassroomSummary> = {}) =>
  ({ teacherName: 'Ms Cohen', lessonNames: [], lessonIds: [], totalWords: 10, coverage: [], missedWords: [], classFoundCount: 4, masteryByPlayer: {}, ...over }) as ClassroomSummary;

const players: PlayerResult[] = [
  { username: 'Ms Cohen', score: 0, isHost: true, wordsFoundCount: 0 },
  { username: 'Noa', score: 30, wordsFoundCount: 6 },
  { username: 'Ido', score: 10, allWords: [{ word: 'cat', score: 1 }, { word: 'dog', score: 1 }] as PlayerResult['allWords'] },
  { username: 'Maya', score: 20, wordsFoundCount: 4 },
];

describe('classStats', () => {
  it('given a round, when summarised, then the teacher is not counted and numbers are class-wide', () => {
    expect(classStats(summary(), players)).toEqual({ students: 3, words: 12, avgScore: 20, lesson: { found: 4, total: 10 } });
  });

  it('given no lesson word landed, when summarised, then lesson coverage is omitted', () => {
    expect(classStats(summary({ classFoundCount: 0 }), players).lesson).toBeNull();
  });

  it('given bots played beside students, when summarised, then bots are not counted as students', () => {
    const withBots: PlayerResult[] = [...players, { username: 'Sprout Bot', score: 90, wordsFoundCount: 9, isBot: true }];
    expect(classStats(summary(), withBots)).toEqual({ students: 3, words: 12, avgScore: 20, lesson: { found: 4, total: 10 } });
  });

  it('given a bots-only practice round, when summarised, then no students are counted', () => {
    const rehearsal: PlayerResult[] = [players[0], { username: 'Sprout Bot', score: 90, isBot: true }, { username: 'Hunter Bot', score: 40, isBot: true }];
    expect(classStats(summary(), rehearsal).students).toBe(0);
  });

  it('given an empty room, when summarised, then nothing divides by zero', () => {
    expect(classStats(summary(), [])).toEqual({ students: 0, words: 0, avgScore: 0, lesson: { found: 4, total: 10 } });
  });
});

describe('hostPodium', () => {
  it('given the server podium, when shown, then it keeps the server ranks without the host and carries avatars', () => {
    const podium = hostPodium(
      summary({ podium: [{ username: 'Ms Cohen', score: 0, rank: 1 }, { username: 'Noa', score: 30, rank: 2 }, { username: 'Maya', score: 20, rank: 3 }] }),
      [...players.slice(0, 3), { ...players[3], avatar: { emoji: 'x', color: 'y' } }],
    );
    expect(podium.map((p) => [p.username, p.rank])).toEqual([['Noa', 1], ['Maya', 2]]);
    expect(podium[1].avatar).toEqual({ emoji: 'x', color: 'y' });
  });

  it('given no server podium, when shown, then the top three by score are used', () => {
    expect(hostPodium(summary(), players).map((p) => p.username)).toEqual(['Noa', 'Maya', 'Ido']);
  });
});

describe('studentPlacing', () => {
  it('given final scores, when a student looks, then their rank counts students only', () => {
    expect(studentPlacing(players, 'Maya', 'Ms Cohen')).toEqual({ rank: 2, total: 3, score: 20 });
  });

  it('given a student missing from the scores, then the placing is unknown', () => {
    expect(studentPlacing(players, 'Zed', 'Ms Cohen')).toBeNull();
  });
});

describe('studentPlacing and studentGap — the same numbers the /multiplayer phone prints', () => {
  const tied: PlayerResult[] = [
    { username: 'Ms Cohen', score: 0, isHost: true },
    { username: 'Noa', score: 30 },
    { username: 'Maya', score: 30 },
    { username: 'Ido', score: 10 },
  ];

  it('given a shared top score, when placed, then both students read first (competition rank)', () => {
    expect(studentPlacing(tied, 'Maya', 'Ms Cohen')).toEqual({ rank: 1, total: 3, score: 30 });
    expect(studentPlacing(tied, 'Ido', 'Ms Cohen')).toEqual({ rank: 3, total: 3, score: 10 });
  });

  it('given a student behind, when the gap is read, then it names the nearest higher score', () => {
    expect(studentGap(players, 'Maya', 'Ms Cohen')).toEqual({ kind: 'behind', name: 'Noa', points: 10 });
  });

  it('given the leader, when the gap is read, then it is the margin over second', () => {
    expect(studentGap(players, 'Noa', 'Ms Cohen')).toEqual({ kind: 'ahead', name: 'Maya', points: 10 });
  });

  it('given a tie on top, when the gap is read, then it says who the place is shared with', () => {
    expect(studentGap(tied, 'Maya', 'Ms Cohen')).toEqual({ kind: 'tied', name: 'Noa', more: 0 });
  });

  it('given a solo student, when the gap is read, then there is none', () => {
    expect(studentGap([{ username: 'Noa', score: 30 }], 'Noa', 'Ms Cohen')).toBeNull();
  });
});
