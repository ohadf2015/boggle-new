import { describe, expect, it } from 'vitest';
import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import { freeGameHeadline } from '../freeGameHeadline';

function game(code: string, scores: number[], missed: [string, number][], playedAt = '2026-10-20T10:00:00Z'): RecentClassroomGame {
  const total = scores.length;
  return {
    gameCode: code,
    gameMode: 'classic',
    playedAt,
    lessonIds: ['l1'],
    players: scores.map((score, i) => ({ studentId: `s${i}`, name: `S${i}`, score, lessonWordsFound: [], lessonWordsMissed: [], accuracyPct: 0 })),
    missedWords: missed.map(([word, missedBy]) => ({ word, missedBy, total, pct: Math.round((missedBy / Math.max(total, 1)) * 100) })),
    totalLessonWords: missed.length,
    wordsNobodyFound: [],
    coveragePct: 0,
    averageAccuracyPct: 0,
    participation: { played: total, roster: 30 },
  };
}

describe('freeGameHeadline', () => {
  it('Given no games, when built, then there is no headline (and so no Pro line)', () => {
    expect(freeGameHeadline([])).toBeNull();
  });

  it('Given only a one-player game, when built, then it is not a real class game and there is no headline', () => {
    expect(freeGameHeadline([game('SOLO', [300], [['brave', 1]])])).toBeNull();
  });

  it('Given a real game, when built, then players, the rounded class average and the three most missed words come back', () => {
    const g = game('REAL1', [100, 200, 250], [
      ['enormous', 3],
      ['fragile', 2],
      ['ancient', 2],
      ['brave', 1],
      ['calm', 0],
    ]);
    expect(freeGameHeadline([g])).toEqual({
      gameCode: 'REAL1',
      gameMode: 'classic',
      playedAt: '2026-10-20T10:00:00Z',
      players: 3,
      classAverage: 183,
      topMissed: ['enormous', 'fragile', 'ancient'],
    });
  });

  it('Given words nobody missed, when built, then they never count as missed', () => {
    const g = game('REAL2', [10, 20], [['enormous', 1], ['calm', 0], ['brave', 0]]);
    expect(freeGameHeadline([g])?.topMissed).toEqual(['enormous']);
  });

  it('Given the newest game was solo, when built, then the latest real game is the headline', () => {
    const solo = game('SOLO', [50], [], '2026-10-21T10:00:00Z');
    const realGame = game('REAL3', [40, 60], [], '2026-10-19T10:00:00Z');
    expect(freeGameHeadline([solo, realGame])?.gameCode).toBe('REAL3');
  });
});
