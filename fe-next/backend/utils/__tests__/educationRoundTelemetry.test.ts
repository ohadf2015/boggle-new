import { describe, it, expect } from 'vitest';
import type { ClassroomGame } from '../../modules/classroomGameManager';
import {
  buildClassroomCreatedEvent,
  buildStudentJoinedEvent,
  buildLiveRoundStartedEvent,
  buildLiveRoundCompletedEvent,
  buildStudentReturnedEvents,
  buildTeacherFirstLiveGameEvent,
  buildParentReportViewedEvent,
  buildTeacherSecondLiveGameDayEvent,
  buildFirstStudentJoinedEvent,
  buildLiveGameEndedEvent,
  secondLiveGameDaysSinceFirst,
  isQaEmail,
} from '../educationRoundTelemetry';

const DAY = 86_400_000;
const NOW = new Date('2026-10-07T12:00:00Z');

function makeGame(overrides: Partial<ClassroomGame> = {}): ClassroomGame {
  return {
    gameCode: 'ABC123',
    teacherId: 'teacher-1',
    classroomId: 'class-1',
    players: [{ userId: 's1' }, { userId: 's2' }],
    lessonIds: ['l1', 'l2'],
    settings: { gameMode: 'wordcraft' },
    startedAt: new Date(NOW.getTime() - 90_000).toISOString(),
    ...overrides,
  } as unknown as ClassroomGame;
}

describe('educationRoundTelemetry builders', () => {
  it('Given a QA email, When checked, Then it is a test account', () => {
    expect(isQaEmail('gauntlet@lexiclash.test')).toBe(true);
    expect(isQaEmail('Teacher@LexiClash.test')).toBe(true);
    expect(isQaEmail('real@gmail.com')).toBe(false);
    expect(isQaEmail(undefined)).toBe(false);
  });

  it('Given a new classroom, When the event is built, Then it is keyed on the teacher with the classroom id', () => {
    const ev = buildClassroomCreatedEvent({
      teacherId: 't1', classroomId: 'c1', language: 'en', isTestAccount: false,
    });
    expect(ev.event).toBe('edu_classroom_created');
    expect(ev.distinctId).toBe('t1');
    expect(ev.properties).toMatchObject({ classroom_id: 'c1', language: 'en', is_test_account: false });
  });

  it('Given a student joins, When the event is built, Then it is keyed on the student', () => {
    const ev = buildStudentJoinedEvent({ studentId: 's9', classroomId: 'c1', isTestAccount: true });
    expect(ev.event).toBe('edu_student_joined');
    expect(ev.distinctId).toBe('s9');
    expect(ev.properties).toMatchObject({ classroom_id: 'c1', is_test_account: true });
  });

  it('Given a live round starts, When built, Then it carries mode and player count, keyed on the teacher', () => {
    const ev = buildLiveRoundStartedEvent(makeGame(), { isTestAccount: false });
    expect(ev).not.toBeNull();
    expect(ev!.event).toBe('edu_live_round_started');
    expect(ev!.distinctId).toBe('teacher-1');
    expect(ev!.properties).toMatchObject({
      classroom_id: 'class-1', game_mode: 'wordcraft', player_count: 2, lesson_count: 2,
    });
  });

  it('Given a game with no classroom, When a round starts, Then no event is built', () => {
    expect(buildLiveRoundStartedEvent(makeGame({ classroomId: '' as string }), { isTestAccount: false })).toBeNull();
  });

  it('Given a round completes, When built, Then duration and player count are included', () => {
    const ev = buildLiveRoundCompletedEvent({ game: makeGame(), durationSeconds: 90, playerCount: 2, isTestAccount: false });
    expect(ev).not.toBeNull();
    expect(ev!.event).toBe('edu_live_round_completed');
    expect(ev!.properties).toMatchObject({
      classroom_id: 'class-1', game_mode: 'wordcraft', duration_seconds: 90, player_count: 2,
    });
  });

  it('Given a round completes with unknown duration, When built, Then duration is null, never NaN', () => {
    const ev = buildLiveRoundCompletedEvent({ game: makeGame(), durationSeconds: null, playerCount: 2, isTestAccount: false });
    expect(ev!.properties.duration_seconds).toBeNull();
  });

  it('Given a student who joined yesterday, When the round completes, Then a day-1 return is emitted', () => {
    const joined = new Date(NOW.getTime() - 1.5 * DAY).toISOString();
    const events = buildStudentReturnedEvents({
      classroomId: 'c1', now: NOW, gameMode: 'classic', surface: 'live',
      students: [{ userId: 's1', joinedAt: joined, isTestAccount: false }],
    });
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('edu_student_returned');
    expect(events[0].distinctId).toBe('s1');
    expect(events[0].properties).toEqual({
      classroom_id: 'c1', day_n: 1, retention_day: 1, game_mode: 'classic', surface: 'live', is_test_account: false,
    });
  });

  it('Given a student who joined today or has no join date, When the round completes, Then no return is emitted', () => {
    const events = buildStudentReturnedEvents({
      classroomId: 'c1',
      now: NOW,
      gameMode: 'classic',
      surface: 'live',
      students: [
        { userId: 's1', joinedAt: new Date(NOW.getTime() - 3_600_000).toISOString(), isTestAccount: false },
        { userId: 's2', joinedAt: null, isTestAccount: false },
      ],
    });
    expect(events).toEqual([]);
  });

  it('Given students 2, 4 and 9 days after joining, When they return, Then retention_day is the last 1/3/7 milestone reached', () => {
    const events = buildStudentReturnedEvents({
      classroomId: 'c1',
      now: NOW,
      gameMode: 'vocab-quiz',
      surface: 'practice',
      students: [
        { userId: 'a', joinedAt: '2026-10-05T11:00:00Z', isTestAccount: false },
        { userId: 'b', joinedAt: '2026-10-03T11:00:00Z', isTestAccount: true },
        { userId: 'c', joinedAt: '2026-09-28T11:00:00Z', isTestAccount: false },
      ],
    });
    expect(events.map((e) => [e.distinctId, e.properties.day_n, e.properties.retention_day, e.properties.is_test_account])).toEqual([
      ['a', 2, 1, false],
      ['b', 4, 3, true],
      ['c', 9, 7, false],
    ]);
  });

  it('Given a teacher runs their first live round, When built, Then the first-live-game event is keyed on the teacher', () => {
    const ev = buildTeacherFirstLiveGameEvent({
      teacherId: 't1', classroomId: 'c1', gameMode: 'classic', playerCount: 4, isTestAccount: true,
    });
    expect(ev.properties.is_test_account).toBe(true);
    expect(ev.event).toBe('edu_teacher_first_live_game');
    expect(ev.distinctId).toBe('t1');
    expect(ev.properties).toMatchObject({ classroom_id: 'c1', game_mode: 'classic', player_count: 4 });
  });
});

describe('buildParentReportViewedEvent', () => {
  it('Given a valid report link, When built, Then it names the class and locale but never the student', () => {
    const ev = buildParentReportViewedEvent({ token: 'tok-1', classroomId: 'class-1', locale: 'he', isTestAccount: false });
    expect(ev.event).toBe('parent_report_viewed');
    expect(ev.properties).toEqual({ classroom_id: 'class-1', locale: 'he', is_test_account: false });
    expect(JSON.stringify(ev)).not.toContain('tok-1');
  });

  it('Given the same link opened twice, Then both views share one viewer id; a different link does not', () => {
    const a = buildParentReportViewedEvent({ token: 'tok-1', classroomId: 'c', locale: 'en', isTestAccount: false });
    const b = buildParentReportViewedEvent({ token: 'tok-1', classroomId: 'c', locale: 'en', isTestAccount: false });
    const c = buildParentReportViewedEvent({ token: 'tok-2', classroomId: 'c', locale: 'en', isTestAccount: false });
    expect(a.distinctId).toBe(b.distinctId);
    expect(a.distinctId).not.toBe(c.distinctId);
    expect(a.distinctId.startsWith('parent_report:')).toBe(true);
  });
});

describe('north-star second live game day', () => {
  it('Given the first real round on Oct 1 and none since, When a real round lands Oct 7, Then it is the second day, 6 days after the first', () => {
    expect(secondLiveGameDaysSinceFirst({
      firstRealRoundAt: '2026-10-01T23:30:00Z', secondDayReached: false, isRealRound: true, now: new Date('2026-10-07T08:00:00Z'),
    })).toBe(6);
  });

  it('Given the first real round late on Oct 1 UTC, When another lands early Oct 2 UTC, Then a new UTC day counts with days_since_first 1', () => {
    expect(secondLiveGameDaysSinceFirst({
      firstRealRoundAt: '2026-10-01T23:59:00Z', secondDayReached: false, isRealRound: true, now: new Date('2026-10-02T00:01:00Z'),
    })).toBe(1);
  });

  it('Given a second round the same UTC day, a solo round, no prior round, or a day already reached, Then nothing', () => {
    const base = { firstRealRoundAt: '2026-10-01T08:00:00Z', secondDayReached: false, isRealRound: true, now: new Date('2026-10-01T22:00:00Z') };
    expect(secondLiveGameDaysSinceFirst(base)).toBeNull();
    expect(secondLiveGameDaysSinceFirst({ ...base, now: new Date('2026-10-04T08:00:00Z'), isRealRound: false })).toBeNull();
    expect(secondLiveGameDaysSinceFirst({ ...base, now: new Date('2026-10-04T08:00:00Z'), firstRealRoundAt: null })).toBeNull();
    expect(secondLiveGameDaysSinceFirst({ ...base, now: new Date('2026-10-04T08:00:00Z'), secondDayReached: true })).toBeNull();
  });

  it('Given the second day, When the event is built, Then it is keyed on the teacher with days_since_first', () => {
    const ev = buildTeacherSecondLiveGameDayEvent({
      teacherId: 't1', classroomId: 'c1', gameMode: 'blast', playerCount: 12, daysSinceFirst: 6, isTestAccount: false,
    });
    expect(ev).toEqual({
      distinctId: 't1',
      event: 'edu_teacher_second_live_game_day',
      properties: { classroom_id: 'c1', game_mode: 'blast', player_count: 12, days_since_first: 6, is_test_account: false },
    });
  });
});

describe('server-side join and end events', () => {
  it('Given the first student joins, When built, Then it is keyed on the teacher', () => {
    expect(buildFirstStudentJoinedEvent({ teacherId: 't1', classroomId: 'c1', isTestAccount: true })).toEqual({
      distinctId: 't1',
      event: 'edu_first_student_joined',
      properties: { classroom_id: 'c1', is_test_account: true },
    });
  });

  it('Given a started game ends, When built, Then it reports duration and roster whether or not anything was written', () => {
    const ev = buildLiveGameEndedEvent(makeGame(), { isTestAccount: false, now: NOW });
    expect(ev).toEqual({
      distinctId: 'teacher-1',
      event: 'edu_live_game_ended',
      properties: {
        classroom_id: 'class-1', game_code: 'ABC123', game_mode: 'wordcraft', lesson_count: 2,
        player_count: 2, had_started: true, duration_seconds: 90, is_test_account: false,
      },
    });
  });

  it('Given a lobby closed before start, When built, Then had_started is false and duration null', () => {
    const ev = buildLiveGameEndedEvent(makeGame({ startedAt: undefined }), { isTestAccount: false, now: NOW });
    expect(ev!.properties).toMatchObject({ had_started: false, duration_seconds: null });
  });
});
