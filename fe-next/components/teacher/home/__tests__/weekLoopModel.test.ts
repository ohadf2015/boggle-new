import { describe, expect, it } from 'vitest';
import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import { QUICK_PRESENTATION_FLOW } from '@/components/education/lobby/quickLaunchProvision';
import { followUpGame, playAgainTarget, readyForTest, READY_PCT, REPLAY_FLOW, missedLastGame, FOLLOW_UP_DAYS } from '../weekLoopModel';

function player(id: string, found: number, missed: number) {
  const total = found + missed;
  return {
    studentId: id,
    name: id,
    score: found * 10,
    lessonWordsFound: Array.from({ length: found }, (_, i) => `f${i}`),
    lessonWordsMissed: Array.from({ length: missed }, (_, i) => `m${i}`),
    accuracyPct: total ? Math.round((found / total) * 100) : 0,
  };
}

function game(over: Partial<RecentClassroomGame> = {}): RecentClassroomGame {
  return {
    gameCode: 'ABCD',
    gameMode: 'word-hunt',
    playedAt: '2026-11-02T09:00:00.000Z',
    lessonIds: ['l-week1'],
    players: [player('ava', 9, 1), player('liam', 8, 2), player('noah', 5, 5)],
    missedWords: [],
    totalLessonWords: 10,
    wordsNobodyFound: [],
    coveragePct: 100,
    averageAccuracyPct: 73,
    participation: { played: 3, roster: 5 },
    absentStudents: [{ studentId: 'maria', name: 'Maria' }, { studentId: 'sofia', name: 'Sofia' }],
    ...over,
  };
}

const W = [{ word: 'cat' }];
const LESSONS = [
  { id: 'l-week1', name: 'Week 1', classroom_id: 'c1', created_at: '2026-10-28T08:00:00.000Z', words: W },
  { id: 'l-week2', name: 'Week 2', classroom_id: 'c1', created_at: '2026-11-05T08:00:00.000Z', words: W },
  { id: 'l-other', name: 'Other class', classroom_id: 'c2', created_at: '2026-11-06T08:00:00.000Z', words: W },
  { id: 'l-empty', name: 'Empty', classroom_id: 'c1', created_at: '2026-11-07T08:00:00.000Z', words: [] },
];

function query(href: string) {
  return Object.fromEntries(new URL(href, 'https://x').searchParams);
}

describe('playAgainTarget', () => {
  it('uses the lobby quick flow the classroom-game page reads', () => {
    expect(REPLAY_FLOW).toBe(QUICK_PRESENTATION_FLOW);
  });

  it('Given last week was Word Hunt and a newer list exists, Then Play again opens the decided lobby with last mode + this week list', () => {
    const target = playAgainTarget({ game: game(), lessons: LESSONS, classroomId: 'c1', locale: 'he' });
    expect(target).not.toBeNull();
    expect(target!.href.startsWith('/he/education/classroom-game?')).toBe(true);
    expect(query(target!.href)).toEqual({ flow: 'quick', classroomId: 'c1', lessonId: 'l-week2', mode: 'word-hunt' });
    expect(target!.mode).toBe('word-hunt');
    expect(target!.list).toEqual({ id: 'l-week2', name: 'Week 2', isNew: true });
  });

  it('Given no newer list, Then it replays the same list and says so', () => {
    const target = playAgainTarget({ game: game(), lessons: LESSONS.slice(0, 1), classroomId: 'c1', locale: 'en' });
    expect(query(target!.href).lessonId).toBe('l-week1');
    expect(target!.list).toEqual({ id: 'l-week1', name: 'Week 1', isNew: false });
  });

  it('Given the last list is a teacher list not tied to the class, Then it is still replayable', () => {
    const lessons = [{ id: 'l-week1', name: 'Week 1', classroom_id: null, created_at: '2026-10-28T08:00:00.000Z', words: W }];
    expect(query(playAgainTarget({ game: game(), lessons, classroomId: 'c1', locale: 'en' })!.href).lessonId).toBe('l-week1');
  });

  it('Given the last list was deleted and the class has none, Then it opens the lobby on the last mode without a list', () => {
    const target = playAgainTarget({ game: game(), lessons: [], classroomId: 'c1', locale: 'en' });
    expect(query(target!.href)).toEqual({ classroomId: 'c1', mode: 'word-hunt' });
    expect(target!.list).toBeNull();
  });

  it('Given a mode string an older build stored, Then the mode is dropped, never sent as junk', () => {
    const target = playAgainTarget({ game: game({ gameMode: 'wordHunt' }), lessons: LESSONS, classroomId: 'c1', locale: 'en' });
    expect(query(target!.href)).toEqual({ classroomId: 'c1', lessonId: 'l-week2' });
    expect(target!.mode).toBeNull();
  });

  it('Given no game, Then there is nothing to play again', () => {
    expect(playAgainTarget({ game: null, lessons: LESSONS, classroomId: 'c1', locale: 'en' })).toBeNull();
  });
});

describe('readyForTest', () => {
  it(`counts students at ${READY_PCT}% or more on the last list`, () => {
    expect(readyForTest(game())).toEqual({ kind: 'counts', ready: 2, rated: 3 });
  });

  it('Given rows written before word results existed, Then it is a plain empty state, not zero ready', () => {
    const old = game({ players: [player('ava', 0, 0), player('liam', 0, 0)] });
    expect(readyForTest(old)).toEqual({ kind: 'noResults' });
  });

  it('Given a mix of old and new rows, Then only students with word results are counted', () => {
    const mixed = game({ players: [player('ava', 0, 0), player('liam', 8, 2)] });
    expect(readyForTest(mixed)).toEqual({ kind: 'counts', ready: 1, rated: 1 });
  });

  it('Given no game, Then there is no chip', () => {
    expect(readyForTest(null)).toBeNull();
  });
});

describe('missedLastGame', () => {
  it('lists roster students who were not in the last game', () => {
    expect(missedLastGame(game())).toEqual(['Maria', 'Sofia']);
  });

  it('Given an older result without the absent list, Then nobody is reported missing', () => {
    expect(missedLastGame(game({ absentStudents: undefined }))).toEqual([]);
    expect(missedLastGame(null)).toEqual([]);
  });
});

describe('followUpGame', () => {
  const played = Date.parse('2026-11-02T09:00:00.000Z');
  const DAY = 86_400_000;

  it('Given a game from this week, Then its follow-up still shows', () => {
    const g = game();
    expect(followUpGame(g, played + 6 * DAY)).toBe(g);
  });

  it(`Given a game older than ${FOLLOW_UP_DAYS} days, Then no ready count or absentee list is offered`, () => {
    expect(followUpGame(game(), played + (FOLLOW_UP_DAYS + 1) * DAY)).toBeNull();
  });

  it('Given a game with an unreadable date, Then it is treated as stale', () => {
    expect(followUpGame(game({ playedAt: 'not a date' }), played)).toBeNull();
    expect(followUpGame(null, played)).toBeNull();
  });
});
